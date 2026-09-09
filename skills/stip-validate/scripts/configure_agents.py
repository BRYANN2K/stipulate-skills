#!/usr/bin/env python3
"""Project-scoped, collision-safe projections of Stip roles into native agents."""
import argparse
from contextlib import contextmanager
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import sys
import tempfile

HOSTS = {'opencode': ('.opencode/agents', '.md'),
         'codex': ('.codex/agents', '.toml'),
         'claude-code': ('.claude/agents', '.md')}
PHASES = {'bootstrap', 'explore', 'validate', 'apply', 'check', 'docs', 'archive'}
ASSIGNMENT_KEYS = {'model', 'effort', 'fast', 'agent'}
SLUG = re.compile(r'^[a-z][a-z0-9-]{0,47}$')
TOKEN = re.compile(r'^[A-Za-z0-9][A-Za-z0-9._:/@+-]{0,199}$')
CLAUDE_EFFORTS = {'low', 'medium', 'high', 'xhigh', 'max'}


def _object(value, label):
    if not isinstance(value, dict):
        raise ValueError(f'{label} must be an object.')
    return value


def _keys(value, allowed, label):
    unknown = set(_object(value, label)) - allowed
    if unknown:
        raise ValueError(f'Unsupported {label} fields: {", ".join(sorted(unknown))}')


def _role(name):
    if not isinstance(name, str) or not SLUG.fullmatch(name):
        raise ValueError(f'Invalid role: {name!r}')
    if name in {'discovery', 'coordinator'}:
        raise ValueError('Discovery stays with the coordinator; use research for bounded help.')
    return name


def _assignment(value, label):
    _keys(value, ASSIGNMENT_KEYS, label)
    for key in ('model', 'effort', 'agent'):
        if key in value and (not isinstance(value[key], str) or not TOKEN.fullmatch(value[key])):
            raise ValueError(f'{label}.{key} must be a non-empty native identifier.')
    if 'fast' in value and type(value['fast']) is not bool and value['fast'] != 'inherit':
        raise ValueError(f'{label}.fast must be true, false, or "inherit".')
    return value


def validate_config(config, host):
    """Validate only the selected host; configuration never launches another client."""
    if host not in HOSTS:
        raise ValueError(f'Unsupported host: {host}')
    orchestration = _object(config, 'config').get('orchestration', {})
    _keys(orchestration, {'version', 'defaults', 'clients'}, 'orchestration')
    if type(orchestration.get('version', 1)) is not int or orchestration.get('version', 1) != 1:
        raise ValueError('Unsupported orchestration version; expected 1.')
    defaults = orchestration.get('defaults', {})
    _keys(defaults, ASSIGNMENT_KEYS | {'max_workers', 'max_shared_writers'}, 'defaults')
    _assignment({k: v for k, v in defaults.items() if k in ASSIGNMENT_KEYS}, 'defaults')
    for key, fallback in [('max_workers', 2), ('max_shared_writers', 1)]:
        value = defaults.get(key, fallback)
        if type(value) is not int or not 1 <= value <= 32:
            raise ValueError(f'defaults.{key} must be an integer from 1 to 32.')
    if defaults.get('max_shared_writers', 1) != 1:
        raise ValueError('Only one writer is supported in a shared checkout.')
    clients = _object(orchestration.get('clients', {}), 'clients')
    if set(clients) - set(HOSTS):
        raise ValueError('Unknown orchestration client.')
    client = clients.get(host, {})
    _keys(client, {'roles', 'phases', 'phase_roles'}, f'clients.{host}')
    roles = _object(client.get('roles', {}), 'roles')
    for name, value in roles.items():
        _assignment(value, f'roles.{_role(name)}')
    phases = _object(client.get('phases', {}), 'phases')
    for phase, value in phases.items():
        if phase not in PHASES:
            raise ValueError(f'Unknown phase: {phase}')
        _assignment(value, f'phases.{phase}')
    phase_roles = _object(client.get('phase_roles', {}), 'phase_roles')
    for phase, mapping in phase_roles.items():
        if phase not in PHASES:
            raise ValueError(f'Unknown phase: {phase}')
        for name, value in _object(mapping, f'phase_roles.{phase}').items():
            _assignment(value, f'phase_roles.{phase}.{_role(name)}')
    return defaults, client


def resolve_assignment(defaults, client, role=None, phase=None):
    """Resolve a profile. An explicit model resets lower-level model options."""
    layers = [{k: v for k, v in defaults.items() if k in ASSIGNMENT_KEYS}]
    layers.append(client.get('phases', {}).get(phase, {}))
    layers.append(client.get('roles', {}).get(role, {}))
    layers.append(client.get('phase_roles', {}).get(phase, {}).get(role, {}))
    result = {'model': 'inherit', 'effort': 'inherit', 'fast': 'inherit'}
    for layer in layers:
        if 'model' in layer and layer['model'] != result['model']:
            result.update(effort='inherit', fast='inherit')
        result.update(layer)
    return result


def _capabilities(capabilities, host):
    if capabilities is None:
        return {'models': {}, 'agents': []}
    _keys(capabilities, {'version', 'host', 'models', 'agents', 'source'}, 'capabilities')
    if (type(capabilities.get('version')) is not int or capabilities.get('version') != 1
            or capabilities.get('host') != host):
        raise ValueError('Capabilities must have version 1 and match the selected host.')
    models = _object(capabilities.get('models', {}), 'capabilities.models')
    for model, data in models.items():
        if not isinstance(model, str) or not TOKEN.fullmatch(model):
            raise ValueError(f'Invalid capability model: {model!r}')
        _keys(data, {'efforts', 'default_effort', 'variants'}, f'capabilities.models.{model}')
        efforts = data.get('efforts', [])
        if not isinstance(efforts, list) or any(not isinstance(x, str) or not TOKEN.fullmatch(x) for x in efforts):
            raise ValueError('Capability efforts must be native level identifiers.')
        if len(efforts) != len(set(efforts)):
            raise ValueError('Capability efforts contain duplicates.')
        if 'default_effort' in data and data['default_effort'] not in efforts:
            raise ValueError(f'Default effort is not supported by {model}.')
        variants = _object(data.get('variants', {}), 'capability variants')
        for name, variant in variants.items():
            if not TOKEN.fullmatch(name) or '/' in name:
                raise ValueError('Variant IDs must be simple native identifiers.')
            _keys(variant, {'effort', 'fast'}, 'variant')
            if 'effort' in variant and variant['effort'] not in efforts:
                raise ValueError(f'Variant {name} uses an unsupported effort.')
            if 'fast' in variant and type(variant['fast']) is not bool:
                raise ValueError('Variant fast must be a verified boolean speed-tier mapping.')
    agents = capabilities.get('agents', [])
    if not isinstance(agents, list) or any(not isinstance(x, str) or not TOKEN.fullmatch(x) for x in agents):
        raise ValueError('Capability agents must be native IDs.')
    return capabilities


def native_options(host, assignment, capabilities, coordinator_model=None):
    """Project only supported options; no inferred providers, tiers or model switches."""
    model = assignment.get('model', 'inherit')
    effort = assignment.get('effort', 'inherit')
    fast = assignment.get('fast', 'inherit')
    agent = assignment.get('agent')
    if agent and agent != 'inherit':
        if any(assignment.get(k, 'inherit') != 'inherit' for k in ('model', 'effort', 'fast')):
            raise ValueError('Existing agent bindings cannot also override its model/options in file projection.')
        if agent not in capabilities.get('agents', []):
            raise ValueError(f'Native agent {agent} is unavailable in the capability snapshot.')
        return {'binding': agent}
    if model == effort == fast == 'inherit':
        return {}
    if host != 'opencode' and fast != 'inherit':
        raise ValueError(f'{host}: independent per-worker Fast is not supported by this projector; keep fast="inherit".')
    effective_model = coordinator_model if model == 'inherit' else model
    if effective_model is None:
        raise ValueError('Explicit worker options on an inherited model need --coordinator-model and --capabilities.')
    metadata = capabilities.get('models', {}).get(effective_model)
    if metadata is None:
        raise ValueError(f'Model {effective_model} is not present in the selected host capability snapshot.')
    if effort != 'inherit' and effort not in metadata.get('efforts', []):
        raise ValueError(f'{effective_model} does not support effort {effort}.')
    if host == 'opencode':
        if '/' not in effective_model:
            raise ValueError('OpenCode models require provider/model identifiers.')
        if effort == fast == 'inherit':
            return {'model': effective_model}
        variants = metadata.get('variants', {})
        # A matching name alone never proves a speed tier or a reasoning level.
        matches = [name for name, value in variants.items()
                   if (effort == 'inherit' or value.get('effort') == effort)
                   and (fast == 'inherit' or value.get('fast') is fast)
                   and (fast != 'inherit' or value.get('fast') is not True)]
        if len(matches) != 1:
            raise ValueError(f'{effective_model}: expected one verified variant for the requested effort/Fast combination; found {len(matches)}.')
        return {'model': effective_model + '#' + matches[0]}
    if effort == 'inherit' and model != 'inherit':
        # Native custom agent files can preserve the previous session effort.
        # Bind the new model's known default instead of inheriting an invalid level.
        effort = metadata.get('default_effort')
        if effort is None:
            raise ValueError(f'{effective_model}: model changes need a verified default_effort or an explicit effort.')
    if host == 'claude-code' and effort != 'inherit' and effort not in CLAUDE_EFFORTS:
        raise ValueError(f'Claude Code does not support frontmatter effort {effort}.')
    # Static files cannot follow a changing coordinator model while guaranteeing
    # model-specific effort support. Materialize the validated snapshot here.
    result = {'model': effective_model}
    if effort != 'inherit':
        result['effort' if host == 'claude-code' else 'model_reasoning_effort'] = effort
    return result


def _prompt(role, phase):
    subject = role or 'bounded implementation or specialist work'
    phase_note = f' Contribute only to the {phase} phase.' if phase else ''
    return (f'You are a Stip {subject} contributor.{phase_note}\n'
            'Work only on the mission assigned by the coordinator. Read the supplied contract, '
            'acceptance criteria, ownership boundaries, dependencies and relevant extension guidance. '
            'You are not alone in the repository; preserve concurrent and preexisting changes.\n'
            'Discovery, user decisions, approval, lifecycle transitions, integration, final evidence '
            'reconciliation and archive belong to the coordinator. Do not run lifecycle transitions, '
            'approve your own result, create commits, publish, or spawn further agents.\n'
            'Return changed files, actual checks and their results, unresolved issues, and the '
            'candidate identity when available. Completion means returned for review, not accepted. '
            'If the mission lacks material scope or ownership information, report the gap.\n')


def render_agent(host, name, role, phase, options):
    description = f'Stip {role or "worker"}: bounded contributions returned to the coordinator for review.'
    prompt = _prompt(role, phase)
    if host == 'codex':
        values = {'name': name, 'description': description, **options,
                  'developer_instructions': prompt}
        return ('# Generated by Stip configure_agents.py; customize the source profile instead.\n'
                + ''.join(f'{key} = {json.dumps(value, ensure_ascii=False)}\n' for key, value in values.items())).encode()
    frontmatter = {'description': description, **options}
    if host == 'opencode':
        frontmatter['mode'] = 'subagent'
        frontmatter['permissions'] = [
            {'action': 'subagent', 'resource': '*', 'effect': 'deny'},
            {'action': 'edit', 'resource': '.workflow/*', 'effect': 'deny'},
            {'action': 'shell', 'resource': 'git commit*', 'effect': 'deny'},
            {'action': 'shell', 'resource': 'git push*', 'effect': 'deny'},
        ]
    else:
        frontmatter['name'] = name
        frontmatter['disallowedTools'] = ['Agent']
    # JSON is valid YAML; quote every scalar and keep complex fields unambiguous.
    return ('---\n' + ''.join(f'{key}: {json.dumps(value, ensure_ascii=False)}\n'
                            for key, value in frontmatter.items()) + '---\n\n'
            '<!-- Generated by Stip configure_agents.py. -->\n' + prompt).encode()


def build_projection(config, host, capabilities=None, coordinator_model=None):
    defaults, client = validate_config(config, host)
    caps = _capabilities(capabilities, host)
    roles = set(client.get('roles', {}))
    for mapping in client.get('phase_roles', {}).values():
        roles.update(mapping)
    contexts = [(None, None)] + [(role, None) for role in sorted(roles)]
    phases = set(client.get('phases', {})) | set(client.get('phase_roles', {}))
    for phase in sorted(phases):
        contexts.append((None, phase))
        contexts.extend((role, phase) for role in sorted(roles))
    files, bindings = {}, {}
    directory, suffix = HOSTS[host]
    for role, phase in contexts:
        # Distinct prefixes avoid collisions with user role names such as check-backend.
        name = 'stip-worker' if role is phase is None else ('stip-role-' + role if phase is None
                else 'stip-phase-' + phase + ('-role-' + role if role else ''))
        assignment = resolve_assignment(defaults, client, role, phase)
        options = native_options(host, assignment, caps, coordinator_model)
        key = f'{phase or "*"}/{role or "*"}'
        if 'binding' in options:
            bindings[key] = options['binding']
            continue
        if host == 'claude-code' and len(name) > 100:
            raise ValueError('Generated Claude agent name is too long.')
        path = f'{directory}/{name}{suffix}'
        files[path] = render_agent(host, name, role, phase, options)
        bindings[key] = name
    return files, bindings


def _physical(path):
    path = Path(path).expanduser().absolute()
    if path.resolve() != path:
        raise ValueError(f'Use a physical path without symlinks: {path}')
    return path


def _read(path):
    _physical(path)
    if path.exists():
        if not path.is_file():
            raise ValueError(f'Expected a regular file: {path}')
        return path.read_bytes()
    return None


def _digest(value):
    return hashlib.sha256(value).hexdigest()


@contextmanager
def _lock(root):
    path = root / '.workflow/.native-agents.lock'
    _physical(path)
    fd = os.open(path, os.O_CREAT | os.O_RDWR | getattr(os, 'O_NOFOLLOW', 0), 0o600)
    with os.fdopen(fd, 'rb') as stream:
        fcntl.flock(stream, fcntl.LOCK_EX)
        yield


def _replace(path, content):
    path.parent.mkdir(parents=True, exist_ok=True)
    _physical(path)
    fd, name = tempfile.mkstemp(prefix='.stip-', dir=path.parent)
    try:
        with os.fdopen(fd, 'wb') as stream:
            stream.write(content)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(name, path)
    finally:
        if os.path.exists(name):
            os.unlink(name)


def _configure(root, host, capabilities, coordinator_model, dry_run):
    config_path = root / '.workflow/config.json'
    config_bytes = _read(config_path)
    if config_bytes is None:
        raise ValueError('Missing .workflow/config.json; bootstrap the project first.')
    files, bindings = build_projection(json.loads(config_bytes), host, capabilities, coordinator_model)
    manifest_path = root / f'.workflow/native-agents/{host}.json'
    manifest_bytes = _read(manifest_path)
    manifest = json.loads(manifest_bytes) if manifest_bytes else {}
    if manifest and (type(manifest.get('version')) is not int or manifest.get('version') != 1
                     or manifest.get('host') != host):
        raise ValueError('Unsupported native-agent ownership manifest.')
    owned = _object(manifest.get('files', {}), 'manifest.files')
    directory, suffix = HOSTS[host]
    snapshots = {}
    for relative in sorted(set(files) | set(owned)):
        expected_prefix = directory + '/stip-'
        if (not relative.startswith(expected_prefix) or not relative.endswith(suffix)
                or Path(relative).parent.as_posix() != directory):
            raise ValueError('Ownership manifest contains an unexpected path.')
        path = root / relative
        current = _read(path)
        snapshots[relative] = current
        if current is not None:
            if relative in owned:
                if _digest(current) != owned[relative]:
                    raise ValueError(f'Customized generated agent: {relative}; reconcile before updating.')
            else:
                raise ValueError(f'Unowned agent collision: {relative}; existing content was preserved.')
    next_manifest = {'version': 1, 'host': host, 'files': {k: _digest(v) for k, v in files.items()},
                     'bindings': bindings}
    next_bytes = (json.dumps(next_manifest, indent=2, sort_keys=True) + '\n').encode()
    added = sorted(k for k in files if snapshots[k] is None)
    updated = sorted(k for k in files if snapshots[k] is not None and snapshots[k] != files[k])
    removed = sorted(k for k in owned if k not in files and snapshots[k] is not None)
    result = {'host': host, 'project': str(root), 'dry_run': dry_run,
              'added': added, 'updated': updated, 'removed': removed, 'bindings': bindings,
              'manifest': str(manifest_path),
              'limitations': ['No model call was made; capability snapshots are not proof of current provider access.',
                              'Concurrency and file ownership are coordinator policies, not an OS sandbox.',
                              'Restart the native client to discover the new definitions.']}
    if dry_run:
        return result
    pending = {k: files[k] for k in added + updated}
    pending.update({k: None for k in removed})
    manifest_rel = str(manifest_path.relative_to(root))
    if next_bytes != manifest_bytes:
        pending[manifest_rel] = next_bytes
        snapshots[manifest_rel] = manifest_bytes
    changed = []
    try:
        if _read(config_path) != config_bytes:
            raise ValueError('Configuration changed during projection; retry with the current version.')
        for relative, content in pending.items():
            path = root / relative
            if _read(path) != snapshots[relative]:
                raise ValueError(f'Concurrent modification: {relative}; preserved.')
            if content is None:
                path.unlink()
            else:
                _replace(path, content)
            changed.append(relative)
    except (OSError, ValueError):
        for relative in reversed(changed):
            path = root / relative
            if _read(path) != pending[relative]:
                continue  # Never replace an edit made after our own write.
            if snapshots[relative] is None:
                path.unlink()
            else:
                _replace(path, snapshots[relative])
        raise
    return result


def configure(project, host, capabilities=None, coordinator_model=None, dry_run=False):
    root = _physical(project)
    if not (root / '.workflow/config.json').is_file():
        raise ValueError('Missing .workflow/config.json; bootstrap the project first.')
    if dry_run:
        return _configure(root, host, capabilities, coordinator_model, True)
    with _lock(root):
        return _configure(root, host, capabilities, coordinator_model, False)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--project', default='.')
    parser.add_argument('--host', choices=sorted(HOSTS), required=True)
    parser.add_argument('--capabilities', help='Verified, host-scoped model/option snapshot JSON.')
    parser.add_argument('--coordinator-model', help='Known active model when projecting explicit options on an inherited model.')
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args(argv)
    try:
        caps = json.loads(Path(args.capabilities).read_text()) if args.capabilities else None
        result = configure(args.project, args.host, caps, args.coordinator_model, args.dry_run)
        print(json.dumps(result, indent=2))
        return 0
    except (OSError, ValueError, TypeError) as exc:
        print(str(exc), file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
