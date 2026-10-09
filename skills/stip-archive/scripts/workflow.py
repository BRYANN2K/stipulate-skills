#!/usr/bin/env python3
"""Local, offline spec lifecycle. Python 3.10+. Evidence is an attestation, not a test runner."""
import argparse
import contextlib
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
import uuid
from datetime import datetime, timezone

VERSION = 1
CHANGE_VERSIONS = (1, 2)
PLAN_PHASES = ('apply', 'check', 'docs')
ACTIVE_JOB_STATUSES = {'starting', 'running', 'waiting', 'unknown', 'correction'}
TERMINAL_JOB_STATUSES = {'returned', 'failed', 'cancelled'}
JOB_STATUSES = ACTIVE_JOB_STATUSES | TERMINAL_JOB_STATUSES | {'queued'}
RESULT_LIMIT = 64 * 1024
SLUG = re.compile(r'^[a-z0-9]+(?:-[a-z0-9]+)*$')
MARKER = '<!-- spec-workflow:start -->'
END = '<!-- spec-workflow:end -->'
GUIDANCE = '''<!-- spec-workflow:start -->
# AGENTS.md

## Mission

Carry the project through to the requested outcome within the authorized scope.
Use available context to resolve routine details and keep working without repeated confirmations.

Preserve existing work. Never present an assumption, planned action, or unexecuted check as a verified result.

## Collaboration

Evaluate the user's proposals independently. Point out errors, contradictions, or weak approaches by explaining the facts, consequences, and a concrete alternative.

Do not manufacture disagreement. Distinguish facts, hypotheses, and preferences. Revise your position when evidence changes and respect the user's informed choices.

Ask for clarification when ambiguity materially changes the outcome, scope, or a decision that is difficult to reverse. For a minor, reversible choice, state an assumption and proceed.

While awaiting an answer, continue independent work. Do not request authorization that has already been granted. Silence does not constitute approval.

## Communication

Respond in the user's language and keep cognitive load low:

- Lead with the outcome, recommendation, or decision needed.
- Use short paragraphs and easy-to-scan lists.
- Reserve bold text for decisive information.
- Recommend an option and briefly explain why.
- Group necessary questions without creating repeated interruptions.
- Put lengthy details in an accessible document.
- When resuming, briefly recall the goal, progress, and next action.

Adapt depth to the request. Brevity must not hide uncertainty, a concrete risk, or incomplete work.

Do not automatically turn thinking aloud into an execution plan. If the user expresses overload, help identify one simple next action.

## Understand the project

Read applicable instructions and inspect repository state before making changes.

Use:
- `.workflow/project.md` for project intent and orientation;
- `.workflow/config.json` for extension configuration;
- `.workflow/specs/` for accepted behaviors;
- `.workflow/changes/<id>/` for the current change.

Load only documents relevant to the task. Verify potentially outdated information against the code.

When a document contradicts the implementation, report the discrepancy. Do not silently change the contract to justify existing behavior.

## Use the workflow

Follow the `stip-*` skill procedures without duplicating them here.

### stip-bootstrap

Initialize the workflow for a new project or adopt it in an existing one. Preserve useful conventions and instructions.

Map relevant domains and existing assets. Distinguish established, inferred, incomplete, missing, and not-applicable findings. Missing documentation does not prove that a practice is absent.

Record project commands and constraints from verified facts. Do not repeat bootstrap for every change.

### stip-explore

Explore intent with the user. Bring in enabled extensions that are relevant to the actual change.

Examine their domain questions, existing project foundations, and gaps worth addressing. An available extension is not automatically mandatory. A cloud-only change does not require a design process.

### stip-validate

Turn exploration into a reviewable, editable contract. Explain expected behaviors, boundaries, and acceptance criteria clearly.

Allow the user to request changes in natural language. Record explicit approval of the current version before apply.

### stip-apply

Implement the approved contract. Continue necessary corrections and verification within that scope.

If a discovery requires changing the contract, explain the impact and return to validation before implementing that change.

### stip-check

Verify every acceptance criterion using current evidence. Distinguish passed, failed, and unverified results.

Do not declare the change compliant while any requirement remains unmet or lacks sufficient evidence.

### stip-docs

Update affected documentation based on verified behavior. Adapt it to the relevant readers and their usage, maintenance, and operational needs.

### stip-archive

Close the change under the skill's conditions: promote the accepted specification, archive the change, and create a scoped local commit.

Closure does not authorize publication or deployment.

## Verification and review

Choose checks based on acceptance criteria, affected paths, and concrete risks. Run the checks required by the project.

After they pass, broaden or repeat checks only when a change, failure, or remaining uncertainty justifies it.

For important decisions, look for counterexamples, weak assumptions, and failure scenarios.

When delegation is authorized, assign bounded, independent tasks that improve quality or completion time. Define ownership and preserve concurrent changes.

Give reviewers the material to examine without prescribing a conclusion. Agreement among agents does not replace evidence.

## Handling blockers

Explain precisely what prevents progress and what would unblock it. Continue any independent work that remains possible.

If a skill instruction requires stopping or asking for confirmation, identify the file and rule, then distinguish the explicit requirement from your interpretation.

Respect higher-priority instructions and the authorizations actually granted.
<!-- spec-workflow:end -->
'''

class WorkflowError(Exception):
    pass

class Conflict(WorkflowError):
    def __init__(self, message, conflicts):
        super().__init__(message)
        self.details = {'conflicts': conflicts}

def require(condition, message):
    if not condition:
        raise WorkflowError(message)

def now():
    return datetime.now(timezone.utc).isoformat()

def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=False).encode()).hexdigest()

def read_json(path):
    try:
        return json.loads(path.read_text())
    except (OSError, ValueError) as exc:
        raise WorkflowError(f'Invalid JSON at {path}: {exc}') from exc

def write(path, content):
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=path.parent, prefix='.workflow-write-')
    try:
        with os.fdopen(fd, 'w') as stream:
            stream.write(content)
        os.replace(tmp, path)
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)

def write_json(path, data):
    write(path, json.dumps(data, ensure_ascii=False, indent=2) + '\n')

def safe(root, relative):
    p = Path(relative)
    require(not p.is_absolute() and '..' not in p.parts, f'Unsafe relative path: {relative}')
    current = root
    for part in p.parts:
        current = current / part
        require(not current.is_symlink(), f'Symlink not allowed in workflow path: {current}')
    return current

def slug(value):
    require(bool(SLUG.fullmatch(value)), f'Invalid id: {value}')
    return value

def git(root, *args, check=True):
    p = subprocess.run(['git', '-C', str(root), *args], capture_output=True)
    if check and p.returncode:
        raise WorkflowError(p.stderr.decode(errors='replace').strip() or 'Git command failed')
    return p

def git_root(root):
    p = git(root, 'rev-parse', '--show-toplevel', check=False)
    require(p.returncode == 0 and Path(p.stdout.decode().strip()).resolve() == root,
            'Use the Git repository root; initialize Git first for a new project.')

def snapshot(root):
    git_root(root)
    output = git(root, 'ls-files', '-z', '--cached', '--others', '--exclude-standard').stdout
    result = {}
    for raw in sorted(set(output.split(b'\0')) - {b''}):
        name = os.fsdecode(raw)
        if name == '.workflow' or name.startswith('.workflow/'):
            continue
        p = root / name
        if p.is_symlink():
            value = 'symlink:' + os.readlink(p)
        elif not p.exists():
            continue  # Absence is stable before and after Git commits a deletion.
        elif p.is_file():
            value = hashlib.sha256(p.read_bytes()).hexdigest() + ':' + oct(p.stat().st_mode & 0o111)
        else:
            raise WorkflowError(f'Unsupported tracked entry (e.g. submodule): {name}')
        result[name] = value
    return result

def changed(a, b):
    return {key for key in a.keys() | b.keys() if a.get(key) != b.get(key)}

def head(root):
    p = git(root, 'rev-parse', '--verify', 'HEAD', check=False)
    return p.stdout.decode().strip() if p.returncode == 0 else None

def dirty(root):
    # Existing modifications, including untracked files, must not enter a feature commit.
    names = set()
    for args in [('diff', '--name-only', '-z'), ('diff', '--cached', '--name-only', '-z'),
                 ('ls-files', '--others', '--exclude-standard', '-z')]:
        names.update(os.fsdecode(x) for x in git(root, *args).stdout.split(b'\0') if x)
    return sorted(names)

def config(root):
    c = read_json(safe(root, '.workflow/config.json'))
    require(c.get('schema_version') == VERSION and isinstance(c.get('extensions'), dict),
            'Unsupported config schema; expected schema_version=1 and extensions object.')
    require(c.get('settings', {}).get('require_user_approval', True) is True, 'User approval cannot be disabled in core v1.')
    return c

def change_dir(root, name):
    return safe(root, f'.workflow/changes/{slug(name)}')

def load(root, name):
    config(root)
    p = change_dir(root, name)
    s = read_json(safe(p, 'state.json'))
    require(s.get('schema_version') in CHANGE_VERSIONS and s.get('id') == name, 'Invalid change state.')
    return p, s

def save(p, s, phase):
    s['phase'] = phase
    s['updated_at'] = now()
    write_json(p / 'state.json', s)

def extension_data(root, identifiers):
    c = config(root)
    result = {}
    for name in identifiers:
        slug(name)
        entry = c['extensions'].get(name)
        require(isinstance(entry, dict) and entry.get('enabled') is True,
                f'Extension not enabled: {name}')
        base = safe(root, entry.get('path', ''))
        require(base != root, 'Extension path must identify a directory.')
        manifest = read_json(safe(root, str(base.relative_to(root) / 'extension.json')))
        require(manifest.get('schema_version') == 1 and manifest.get('id') == name,
                f'Invalid extension manifest: {name}')
        require(isinstance(manifest.get('explore'), str), f'{name} needs an explore reference.')
        refs = {}
        for key in ('explore', 'apply', 'check', 'docs'):
            if key in manifest:
                rel = manifest[key]
                require(isinstance(rel, str) and bool(rel), 'Invalid extension reference.')
                p = safe(base, rel)
                require(p.is_file(), f'Missing extension reference: {p}')
                refs[key] = {'path': str(p.relative_to(root)), 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()}
        result[name] = {'manifest': manifest, 'references': refs}
    return result

def contract(root, p, s):
    files = {}
    for name in ('proposal.md', 'spec.md', 'tasks.md'):
        q = safe(p, name)
        if q.exists():
            files[name] = q.read_text()
    value = {'files': files, 'target': s['target'],
             'extensions': extension_data(root, s['extensions'])}
    if s['schema_version'] == 2:
        value['schema_version'] = 2
        value['execution_plan'] = validate_task_plan(root, p, s)
    return digest(value)

def criteria(p):
    text = (p / 'spec.md').read_text()
    found = re.findall(r'^- (AC-[1-9][0-9]*):\s*(\S.*)$', text, re.M)
    require(found, 'Spec requires acceptance criteria: - AC-1: observable behavior')
    ids = [key for key, _ in found]
    require(len(set(ids)) == len(ids), 'Duplicate acceptance criterion id.')
    require(not re.search(r'\b(TODO|TBD|FIXME)\b|\{\{', text), 'Unresolved template placeholder in spec.')
    require((p / 'proposal.md').read_text().strip(), 'Empty proposal.')
    return ids

def task_path(root, value, writable=False):
    require(isinstance(value, str) and bool(value) and value == value.strip(), 'Task paths must be nonempty relative paths.')
    require('\\' not in value and not any(x in value for x in '*?[]\x00\n\r'), 'Task paths must be literal paths, not globs.')
    path = Path(value)
    require(path.as_posix() == value and value != '.', 'Task paths must use canonical relative paths.')
    safe(root, value)
    require(path.parts[0].casefold() != '.git', 'Tasks cannot access Git internals.')
    require(not writable or path.parts[0].casefold() != '.workflow', 'Workers cannot own workflow metadata.')
    return value

def validate_task_plan(root, p, s, data=None):
    """Validate the semantic task contract; progress and model settings live elsewhere."""
    if data is None:
        data = read_json(safe(p, 'execution-plan.json'))
    require(isinstance(data, dict) and set(data) == {'version', 'tasks'} and type(data.get('version')) is int and data['version'] == 1,
            'Execution plan expects version=1 and tasks only.')
    tasks = data['tasks']
    require(isinstance(tasks, list) and 0 < len(tasks) <= 200, 'Execution plan requires 1 to 200 tasks.')
    criterion_ids = set(criteria(p))
    by_id = {}
    normalized = []
    fields = {'id', 'role', 'phase', 'criteria', 'depends_on', 'write_paths', 'objective'}
    optional = {'read_paths', 'expected_output'}
    for task in tasks:
        require(isinstance(task, dict) and fields <= task.keys() and task.keys() <= fields | optional,
                'Task requires id, role, phase, criteria, depends_on, write_paths, objective; only read_paths and expected_output are optional.')
        identifier, role = task['id'], task['role']
        require(isinstance(identifier, str) and isinstance(role, str), 'Task id and role must be strings.')
        slug(identifier); slug(role)
        require(identifier not in by_id, f'Duplicate task id: {identifier}')
        require(role != 'discovery', 'Discovery stays with the main coordinator; use research for a bounded helper task.')
        require(task['phase'] in PLAN_PHASES, f'Invalid task phase for {identifier}: use apply, check or docs.')
        require(isinstance(task['objective'], str) and bool(task['objective'].strip()), f'Task {identifier} needs an objective.')
        require(isinstance(task['criteria'], list) and task['criteria'] and all(isinstance(x, str) for x in task['criteria'])
                and len(set(task['criteria'])) == len(task['criteria']) and set(task['criteria']) <= criterion_ids,
                f'Task {identifier} must reference existing unique acceptance criteria.')
        dependencies = task['depends_on']
        require(isinstance(dependencies, list) and all(isinstance(x, str) for x in dependencies)
                and len(set(dependencies)) == len(dependencies) and identifier not in dependencies,
                f'Task {identifier} has invalid dependencies.')
        for key in ('write_paths', 'read_paths'):
            paths = task.get(key, [])
            require(isinstance(paths, list) and all(isinstance(x, str) for x in paths) and len(paths) == len(set(paths)),
                    f'Task {identifier} needs a unique {key} array.')
            for path in paths:
                task_path(root, path, writable=key == 'write_paths')
        if 'expected_output' in task:
            require(isinstance(task['expected_output'], str) and bool(task['expected_output'].strip()), 'Expected output must be nonempty text.')
        normalized_task = dict(task)
        for key in ('criteria', 'depends_on', 'write_paths'):
            normalized_task[key] = sorted(task[key])
        normalized_task['read_paths'] = sorted(task.get('read_paths', []))
        normalized.append(normalized_task)
        by_id[identifier] = normalized_task
    require(set().union(*(set(t['criteria']) for t in tasks)) == criterion_ids, 'Task plan must cover every acceptance criterion.')
    ancestors = {}
    visiting = set()
    def visit(identifier):
        require(identifier not in visiting, 'Execution plan contains a dependency cycle.')
        if identifier in ancestors:
            return ancestors[identifier]
        visiting.add(identifier)
        result = set()
        task = by_id[identifier]
        for dependency in task['depends_on']:
            require(dependency in by_id, f'Unknown dependency: {dependency}')
            require(PLAN_PHASES.index(by_id[dependency]['phase']) <= PLAN_PHASES.index(task['phase']),
                    f'Task {identifier} depends on a later phase: {dependency}')
            result.add(dependency)
            result.update(visit(dependency))
        visiting.remove(identifier)
        ancestors[identifier] = result
        return result
    for identifier in by_id:
        visit(identifier)
    for index, task in enumerate(normalized):
        for other in normalized[index + 1:]:
            if task['phase'] != other['phase'] or task['id'] in ancestors[other['id']] or other['id'] in ancestors[task['id']]:
                continue
            for left in task['write_paths']:
                for right in other['write_paths']:
                    a, b = left.casefold(), right.casefold()
                    require(not (a == b or a.startswith(b + '/') or b.startswith(a + '/')),
                            f'Independent tasks {task["id"]} and {other["id"]} have overlapping write ownership: {left}, {right}')
    return {'version': 1, 'tasks': sorted(normalized, key=lambda t: t['id'])}

def runtime_state(root, p, s, required=False, orphans=None):
    """Validate the private registry; with an orphans list, jobs of tasks absent from the plan are collected, not refused."""
    path = safe(root, f'.workflow/.runtime/{s["id"]}/state.json')
    if not path.exists():
        require(not required, 'Orchestration runtime state is missing; reconcile native sessions before finalizing.')
        return None
    data = read_json(path)
    require(isinstance(data, dict) and type(data.get('version')) is int and data.get('version') == 1
            and data.get('change_id') == s['id'] and isinstance(data.get('jobs'), list)
            and isinstance(data.get('retired_jobs', []), list), 'Invalid orchestration runtime state.')
    for job in data.get('retired_jobs', []):  # Moved aside by rebase: shape only, never gates.
        require(isinstance(job, dict) and isinstance(job.get('task_id'), str) and type(job.get('attempt')) is int and job['attempt'] >= 1
                and job.get('status') in JOB_STATUSES - ACTIVE_JOB_STATUSES and job.get('acceptance') in {'pending', 'accepted', 'rejected'},
                'Invalid retired worker record.')
    # Only the installed task ids matter here; criterion coverage is checked by the contract, so a spec revision
    # in progress (spec edited before its replacement plan) cannot lock the registry or block plan --file.
    installed = read_json(safe(p, 'execution-plan.json'))
    require(isinstance(installed, dict) and isinstance(installed.get('tasks'), list)
            and all(isinstance(t, dict) and isinstance(t.get('id'), str) for t in installed['tasks']), 'Invalid installed execution plan.')
    tasks = {t['id'] for t in installed['tasks']}
    seen = set()
    sessions = {}
    for job in data['jobs']:
        require(isinstance(job, dict), 'Invalid worker record.')
        identifier, attempt = job.get('task_id'), job.get('attempt')
        require(isinstance(identifier, str) and type(attempt) is int and attempt >= 1,
                'Worker record needs a known task_id and a positive attempt.')
        if identifier not in tasks:
            require(orphans is not None, f'Worker record needs a known task_id and a positive attempt (task {identifier} is not in the plan; run runtime rebase).')
            orphans.append(identifier)
        require((identifier, attempt) not in seen, 'Duplicate task attempt in orchestration runtime state.')
        seen.add((identifier, attempt))
        require(job.get('status') in JOB_STATUSES and job.get('acceptance') in {'pending', 'accepted', 'rejected'},
                'Invalid worker status or acceptance.')
        session = job.get('session_id')
        require(session is None or isinstance(session, str) and bool(session.strip()), 'Invalid native worker session id.')
        if session:
            require(session not in sessions or sessions[session] == identifier, 'A native session cannot own unrelated tasks.')
            sessions[session] = identifier
        if job['acceptance'] == 'accepted':
            require(job['status'] == 'returned' and session, 'An accepted contribution requires a returned native session.')
    return data

def latest_attempts(jobs):
    latest = {}
    for job in jobs:
        if job['attempt'] > latest.get(job['task_id'], {}).get('attempt', 0):
            latest[job['task_id']] = job
    return latest

def quiescent(root, p, s, phases=()):
    if s['schema_version'] != 2:
        return None
    data = runtime_state(root, p, s, required=True)
    require(data.get('contract_digest') == contract(root, p, s), 'Worker registry belongs to a different contract; reconcile it before finalizing.')
    require(not any(j['status'] in ACTIVE_JOB_STATUSES for j in data['jobs']),
            'Workers are active or their outcome is unknown; reconcile native sessions before finalizing.')
    latest = latest_attempts(data['jobs'])
    for job in latest.values():
        require(not (job.get('isolated') is True and job['acceptance'] == 'accepted' and job.get('integrated') is not True),
                f'Task {job["task_id"]} has an accepted isolated contribution that is not integrated; run runtime integrate first.')
    for task in validate_task_plan(root, p, s)['tasks']:
        if task['phase'] in phases:
            require(latest.get(task['id'], {}).get('acceptance') == 'accepted',
                    f'Task {task["id"]} has no accepted contribution for its latest attempt.')
    return data

def execution_summary(root, p, s, registry, subject):
    """Export a bounded public provenance projection, never the private registry."""
    def text(value, field, limit=512):
        require(value is None or isinstance(value, str) and len(value.encode('utf-8')) <= limit
                and not any(c in value for c in '\x00\n\r'), f'Invalid or oversized execution summary {field}.')
        return value

    def model(value):
        if isinstance(value, dict):
            identifier = text(value.get('id'), 'model id')
            provider = text(value.get('providerID'), 'model provider')
            variant = text(value.get('variant'), 'model variant')
            value = ((provider + '/' if provider else '') + identifier + ('#' + variant if variant else '')) if identifier else None
        elif not isinstance(value, str):
            value = None
        return text(None if value in ('', 'inherit') else value, 'model reference')

    latest = {}
    for job in registry['jobs']:
        if job['attempt'] > latest.get(job['task_id'], {}).get('attempt', 0):
            latest[job['task_id']] = job
    tasks = []
    for task in validate_task_plan(root, p, s)['tasks']:
        job = latest[task['id']]
        profile = job.get('profile') if isinstance(job.get('profile'), dict) else {}
        effort = profile.get('effort')
        tasks.append({'task_id': task['id'], 'role': task['role'], 'phase': task['phase'],
                      'criteria': task['criteria'], 'attempt': job['attempt'],
                      'session_id': text(job['session_id'], 'session id'),
                      'status': job['status'], 'acceptance': job['acceptance'],
                      'requested_model': model(profile.get('model')),
                      'actual_model': model(job.get('actual_model')),
                      'effort': text(None if effort in ('inherit', 'model default') else effort, 'effort', 64),
                      'fast': profile.get('fast') if type(profile.get('fast')) is bool else None,
                      'native_outcome': job.get('native_outcome') if job.get('native_outcome') in ('succeeded', 'failed', 'interrupted') else None})
    summary = {'version': 1, 'change_id': s['id'], 'contract_digest': registry['contract_digest'],
               'subject_digest': digest(subject), 'archived_at': now(), 'tasks': tasks}
    require(len((json.dumps(summary, ensure_ascii=False, indent=2) + '\n').encode('utf-8')) <= 256 * 1024,
            'Execution summary exceeds 256 KiB; reconcile the public provenance before archive.')
    return summary

def plan(root, args):
    p, s = load(root, args.id)
    if not args.file:
        require(s['schema_version'] == 2, 'This change uses schema v1; enable orchestration with plan --file before approval.')
        return {'change': s['id'], 'schema_version': 2, 'plan': validate_task_plan(root, p, s)}
    require(s['schema_version'] == 2 or not (s.get('approval') or 'baseline' in s) or args.migrate,
            'An approved v1 change needs explicit --migrate; this invalidates its approval.')
    value = read_json(Path(args.file)) if args.file != '-' else json.load(sys.stdin)
    validated = validate_task_plan(root, p, s, value)
    runtime_path = safe(root, f'.workflow/.runtime/{s["id"]}/state.json')
    if runtime_path.exists():
        existing = runtime_state(root, p, s, orphans=[])
        require(not any(j['status'] in ACTIVE_JOB_STATUSES for j in existing['jobs']), 'Stop and reconcile workers before changing their contract.')
    old_plan = safe(p, 'execution-plan.json')
    before = old_plan.read_bytes() if old_plan.exists() else None
    state_before = (p / 'state.json').read_bytes()
    try:
        write_json(old_plan, validated)
        s['schema_version'] = 2
        for key in ('approval', 'check', 'documentation'):
            s.pop(key, None)
        save(p, s, 'draft')
    except Exception:
        if before is None:
            old_plan.unlink(missing_ok=True)
        else:
            write(old_plan, before.decode())
        write(p / 'state.json', state_before.decode())
        raise
    return {'change': s['id'], 'schema_version': 2, 'phase': 'draft', 'plan': validated,
            'note': 'Review and explicitly approve the task contract before apply; any existing source baseline was preserved.'}

def status(root, args):
    p, s = load(root, args.id)
    value = contract(root, p, s)
    result = dict(s) if not args.compact else {
        key: s[key] for key in ('schema_version', 'id', 'target', 'extensions', 'phase', 'updated_at') if key in s}
    result['approval_current'] = s.get('approval', {}).get('contract_digest') == value
    result['contract_digest'] = value
    if s['schema_version'] == 2:
        result['plan'] = validate_task_plan(root, p, s)
        try:
            runtime = runtime_state(root, p, s)
            result['runtime'] = None if runtime is None else {
                'contract_current': runtime.get('contract_digest') == value,
                'jobs': [{key: j[key] for key in ('task_id', 'session_id', 'status', 'acceptance', 'attempt') if key in j}
                         for j in runtime['jobs']]}
        except WorkflowError as exc:
            result['runtime'] = {'error': str(exc)}
    return result

def approved(root, p, s):
    require(s.get('approval', {}).get('contract_digest') == contract(root, p, s),
            'Contract or selected extension changed. Validate and obtain user approval again.')

def bootstrap(root, args):
    safe(root, 'AGENTS.md')
    for name in ('project.md', 'config.json', 'specs', 'changes', 'archive'):
        safe(root, '.workflow/' + name)
    cfg = root / '.workflow/config.json'
    if cfg.exists():
        config(root)
    else:
        write_json(cfg, {'schema_version': 1, 'extensions': {}, 'settings': {'require_user_approval': True}})
    for name in ('specs', 'changes', 'archive'):
        (root / '.workflow' / name).mkdir(parents=True, exist_ok=True)
    project = root / '.workflow/project.md'
    if not project.exists():
        write(project, '# Project\n\n## Intent\n\nNot assessed yet.\n\n## Project map\n\n'
              '| Area | Status | Evidence |\n|---|---|---|\n\n'
              'Use established, inferred, incomplete, missing, or not-applicable.\n'
              'Record actual paths and observations; code is not proof of desired behavior.\n')
    agents = root / 'AGENTS.md'
    existing = agents.read_text() if agents.exists() else ''
    require(existing.count(MARKER) == existing.count(END) and existing.count(MARKER) <= 1,
            'Malformed existing workflow block in AGENTS.md; repair it explicitly.')
    if MARKER not in existing:
        write(agents, existing.rstrip() + ('\n\n' if existing.strip() else '') + GUIDANCE)
    return {'status': 'bootstrapped', 'assessment': 'Agent must inspect and populate project.md; no maturity inferred.'}

def explore(root, args):
    config(root)
    p = change_dir(root, args.id)
    require(not p.exists(), 'Change already exists; edit its proposal or spec to continue exploration.')
    require(not safe(root, f'.workflow/archive/{args.id}').exists(), 'Id already archived; use a new change id.')
    selected = list(dict.fromkeys(args.extension))
    ext = extension_data(root, selected)
    target = slug(args.target or args.id)
    current = safe(root, f'.workflow/specs/{target}.md')
    proposal = '# ' + (args.title or args.id) + '\n\n## Problem\n\n## Scope\n\n## Decisions and open questions\n'
    write(p / 'proposal.md', proposal)
    write(p / 'spec.md', current.read_text() if current.exists() else '# ' + (args.title or args.id) + '\n\n## Intent\n\n## Acceptance criteria\n')
    write(p / 'evidence.md', '# Evidence\n\nNo verification recorded.\n')
    s = {'schema_version': 1, 'id': args.id, 'target': target, 'extensions': selected,
         'target_before': hashlib.sha256(current.read_bytes()).hexdigest() if current.exists() else None,
         'created_at': now()}
    save(p, s, 'exploring')
    return {'change': args.id, 'phase': 'exploring', 'extensions': ext}

def select(root, args):
    p, s = load(root, args.id)
    selected = list(dict.fromkeys(args.extension))
    result = extension_data(root, selected)
    s['extensions'] = selected
    for key in ('approval', 'check', 'documentation'):
        s.pop(key, None)
    save(p, s, 'exploring')
    return {'phase': 'exploring', 'extensions': result}

def validate(root, args):
    p, s = load(root, args.id)
    ids = criteria(p)
    value = contract(root, p, s)
    if s.get('approval', {}).get('contract_digest') != value:
        for key in ('approval', 'check', 'documentation'):
            s.pop(key, None)
        save(p, s, 'draft')
    return {'criteria': ids, 'contract_digest': value, 'phase': s['phase'],
            'semantic_review': 'User and agent must review meaning, scope and unresolved decisions.'}

def approve(root, args):
    require(bool(args.by.strip()), 'Approval attribution is required.')
    require(args.ack_user_approval, 'Record approval only after explicit user agreement to this contract.')
    p, s = load(root, args.id)
    criteria(p)
    s['approval'] = {'contract_digest': contract(root, p, s), 'by': args.by, 'recorded_at': now()}
    for key in ('check', 'documentation'):
        s.pop(key, None)
    save(p, s, 'approved')
    return {'phase': 'approved', 'approval': s['approval']}

def start(root, args):
    p, s = load(root, args.id)
    require(s['phase'] in ('approved', 'applying', 'checked', 'documented'), 'Approval is required before apply.')
    approved(root, p, s)
    if 'baseline' not in s:
        s['baseline'] = snapshot(root)
        s['preexisting_dirty'] = dirty(root)
        s['base_head'] = head(root)
    s.pop('check', None)
    s.pop('documentation', None)
    save(p, s, 'applying')
    return {'phase': 'applying', 'extensions': extension_data(root, s['extensions'])}

def check(root, args):
    p, s = load(root, args.id)
    require(s['phase'] in ('applying', 'checked', 'documented'), 'Start apply first.')
    approved(root, p, s)
    quiescent(root, p, s, ('apply', 'check'))
    ids = criteria(p)
    report = json.load(sys.stdin) if args.results == '-' else read_json(Path(args.results))
    subject = snapshot(root)
    require(report.get('subject_digest') == digest(subject), 'Evidence refers to a different working tree.')
    entries = report.get('criteria')
    require(isinstance(entries, list), 'Expected criteria array.')
    require(all(isinstance(x, dict) for x in entries), 'Invalid criterion record.')
    require(len(entries) == len(ids) and {x.get('id') for x in entries} == set(ids), 'Report must cover every criterion exactly once.')
    allowed = {'passed', 'failed', 'unverified', 'not-applicable', 'pending-docs'}
    for item in entries:
        require(item.get('status') in allowed and isinstance(item.get('evidence'), str)
                and bool(item['evidence'].strip()), 'Every result needs a status and inspectable evidence or gap explanation.')
    pending = sorted(x['id'] for x in entries if x['status'] == 'pending-docs')
    if pending:
        docs_only = docs_only_criteria(root, p, s)
        refused = [x for x in pending if x not in docs_only]
        require(not refused, 'pending-docs is allowed only for criteria covered exclusively by docs-phase tasks of a v2 execution plan: '
                + ', '.join(refused))
    s['check'] = {'subject': subject, 'report': report, 'at': now()}
    s.pop('documentation', None)
    passed = all(x['status'] == 'passed' for x in entries)
    ready = all(x['status'] in ('passed', 'pending-docs') for x in entries)
    write(p / 'evidence.md', '# Evidence\n\nSubject: `' + digest(subject) + '`\n\n' +
          '\n'.join(f"- {x['id']}: {x['status']} — {x['evidence']}" for x in entries) + '\n')
    save(p, s, 'checked' if ready else 'applying')
    result = {'phase': s['phase'], 'all_passed': passed, 'pending_docs': pending,
              'note': 'Report consistency verified; evidence truth requires actual observations.'}
    if pending:
        result['next'] = ('Dispatch the docs-phase tasks, then re-run check with these criteria passed before docs or archive.')
    return result

def docs_only_criteria(root, p, s):
    """Criteria whose every covering plan task is a docs-phase task; empty for schema v1."""
    if s['schema_version'] != 2:
        return set()
    phases = {}
    for task in validate_task_plan(root, p, s)['tasks']:
        for criterion in task['criteria']:
            phases.setdefault(criterion, set()).add(task['phase'])
    return {c for c, found in phases.items() if found == {'docs'}}

def require_no_pending_docs(s, action):
    pending = sorted(x['id'] for x in s.get('check', {}).get('report', {}).get('criteria', [])
                     if isinstance(x, dict) and x.get('status') == 'pending-docs')
    require(not pending, f'Criteria still pending-docs: {", ".join(pending)}. Complete the docs-phase tasks, then re-run '
            f'check with these criteria recorded passed and their evidence before {action}.')

def docs(root, args):
    p, s = load(root, args.id)
    require(s['phase'] == 'checked', 'A successful check is required before documenting completion.')
    approved(root, p, s)
    require_no_pending_docs(s, 'docs')
    quiescent(root, p, s, PLAN_PHASES)
    require(bool(args.summary.strip()), 'Documentation evidence summary is required.')
    current = snapshot(root)
    differences = changed(s['check']['subject'], current)
    declared = set(args.paths)
    require(all(not Path(x).is_absolute() and '..' not in Path(x).parts and Path(x).suffix.lower() in ('.md', '.rst', '.txt') for x in declared),
            'Documentation paths must be relative Markdown, reStructuredText or text files.')
    require(differences <= declared, 'Non-documentation or undeclared changes after check; run check again.')
    s['documentation'] = {'subject': current, 'paths': sorted(declared), 'summary': args.summary, 'at': now()}
    save(p, s, 'documented')
    return {'phase': 'documented', 'documentation': s['documentation']}

def archive(root, args):
    p, s = load(root, args.id)
    require(s['phase'] == 'documented', 'Check and documentation must complete before archive.')
    approved(root, p, s)
    require_no_pending_docs(s, 'archive')
    registry = quiescent(root, p, s, PLAN_PHASES)
    current = snapshot(root)
    require(current == s['documentation']['subject'], 'Working tree changed after verification/documentation.')
    require(head(root) == s['base_head'], 'HEAD changed during this change. Reconcile the baseline explicitly before archive.')
    require(not git(root, 'diff', '--cached', '--name-only').stdout.strip(), 'Git index contains staged work; preserve it and archive later.')
    source_paths = changed(s['baseline'], current)
    requested = set(args.paths)
    require(requested == source_paths, 'Commit paths must exactly match changes since apply: ' + ', '.join(sorted(source_paths)))
    require(not source_paths.intersection(s['preexisting_dirty']), 'A selected file already contained work before apply; separate it before automatic archive.')
    require(all(not Path(x).is_absolute() and '..' not in Path(x).parts for x in requested), 'Unsafe commit path.')
    target = safe(root, f".workflow/specs/{slug(s['target'])}.md")
    before = target.read_bytes() if target.exists() else None
    require((hashlib.sha256(before).hexdigest() if before is not None else None) == s['target_before'],
            'Current accepted spec changed concurrently; reconcile before archive.')
    dest = safe(root, f'.workflow/archive/{args.id}')
    require(not dest.exists(), 'Archive already exists.')
    commit_paths = sorted(requested | {str(p.relative_to(root)), str(dest.relative_to(root)), str(target.relative_to(root))})
    # Change metadata can be new or tracked; do not stage unrelated .workflow content.
    tracked_change = bool(git(root, 'ls-files', '--', str(p.relative_to(root))).stdout.strip())
    state_before = (p / 'state.json').read_bytes()
    summary_path = safe(p, 'execution-summary.json')
    summary = execution_summary(root, p, s, registry, current) if s['schema_version'] == 2 else None
    summary_before = summary_path.read_bytes().decode('utf-8') if summary is not None and summary_path.exists() else None
    try:
        save(p, s, 'archived')
        if summary is not None:
            write_json(summary_path, summary)
        write(target, (p / 'spec.md').read_text())
        p.rename(dest)
        add_paths = [x for x in commit_paths if x != str(p.relative_to(root)) or tracked_change]
        git(root, 'add', '-A', '--', *add_paths)
        staged = set(os.fsdecode(x) for x in git(root, 'diff', '--cached', '--no-renames', '--name-only', '-z').stdout.split(b'\0') if x)
        require(all(x in requested or x == str(target.relative_to(root)) or x.startswith(str(p.relative_to(root)) + '/') or x.startswith(str(dest.relative_to(root)) + '/') for x in staged), 'Unexpected staged path.')
        git(root, 'commit', '-m', args.message)
    except Exception:
        # Index was empty before this operation. Only unstage the paths owned by this transaction.
        if head(root) == s['base_head']:
            if s['base_head']:
                git(root, 'reset', '-q', 'HEAD', '--', *commit_paths, check=False)
            else:
                git(root, 'rm', '-r', '--cached', '--ignore-unmatch', '--', *commit_paths, check=False)
            if dest.exists():
                dest.rename(p)
            write(p / 'state.json', state_before.decode())
            if summary is not None:
                if summary_before is None:
                    summary_path.unlink(missing_ok=True)
                else:
                    write(summary_path, summary_before)
            if before is None:
                target.unlink(missing_ok=True)
            else:
                write(target, before.decode())
        raise
    commit = head(root)
    require(snapshot(root) == current, 'Commit hook changed the working tree; archive committed but needs review.')
    committed = set(os.fsdecode(x) for x in git(root, 'diff-tree', '--root', '--no-renames', '--no-commit-id', '--name-only', '-r', '-z', commit).stdout.split(b'\0') if x)
    require(committed == staged, 'Commit hook changed commit scope; inspect the created commit before proceeding.')
    require(not git(root, 'diff', 'HEAD', '--', *sorted(requested)).stdout, 'Committed content differs from verified content.')
    return {'phase': 'archived', 'commit': commit, 'archive': str(dest),
            'note': 'No push or deployment performed. Git history identifies the archive commit.'}

# --- Host-neutral worker runtime: dispatch gates, registry, isolation and integration. ---

def bounded(value, field, limit, required=False):
    require(value is None and not required or isinstance(value, str) and (bool(value.strip()) or not required)
            and len(value) <= limit and '\x00' not in value, f'Invalid {field}: expected at most {limit} characters.')
    return value

def runtime_limits(root, args):
    orchestration = config(root).get('orchestration') or {}
    defaults = orchestration.get('defaults') or {} if isinstance(orchestration, dict) else None
    require(isinstance(defaults, dict), 'Invalid orchestration defaults in .workflow/config.json.')
    result = {}
    for key, fallback in (('max_workers', 2), ('max_shared_writers', 1)):
        value = getattr(args, key, None)
        value = defaults.get(key, fallback) if value is None else value
        require(type(value) is int and 1 <= value <= 8, f'{key} must be between 1 and 8.')
        result[key] = value
    return result

def registry_file(root, change):
    return safe(root, f'.workflow/.runtime/{slug(change)}/state.json')

def read_helpers(path):
    if not path.exists():
        return {'version': 1, 'jobs': []}
    data = read_json(path)
    require(isinstance(data, dict) and data.get('version') == 1 and isinstance(data.get('jobs'), list)
            and all(isinstance(j, dict) for j in data['jobs']), f'Invalid helper registry: {path}')
    return data

def all_jobs(root, exclude=None):
    """(owner, job) for every recorded worker: change registries by change id, helpers as 'helper'."""
    jobs = []
    base = safe(root, '.workflow/.runtime')
    for folder in sorted(base.iterdir()) if base.is_dir() else []:
        if folder.name == exclude or not SLUG.fullmatch(folder.name) or folder.is_symlink() or not folder.is_dir():
            continue
        path = registry_file(root, folder.name)
        if path.exists():
            data = read_json(path)
            require(isinstance(data, dict) and isinstance(data.get('jobs'), list) and all(isinstance(j, dict) for j in data['jobs']),
                    f'Invalid worker registry: {folder.name}')
            jobs += [(folder.name, j) for j in data['jobs']]
    for name in ('helpers.json', 'engine-helpers.json'):
        jobs += [('helper', j) for j in read_helpers(safe(root, '.workflow/.runtime/' + name))['jobs']]
    return jobs

def overlaps(left, right):
    return any(a.casefold() == b.casefold() or a.casefold().startswith(b.casefold() + '/') or b.casefold().startswith(a.casefold() + '/')
               for a in left for b in right)

def owned(path, write_paths):
    return any(path == w or path.startswith(w + '/') for w in write_paths)

def done(job):
    return bool(job) and job['acceptance'] == 'accepted' and (job.get('isolated') is not True or job.get('integrated') is True)

def blocker(task, tasks, latest, phase):
    if not (phase in ('checked', 'documented') if task['phase'] == 'docs' else phase == 'applying'):
        return 'Task is not eligible in the current lifecycle phase.'
    for dependency in task['depends_on']:
        if not done(latest.get(dependency)):
            return f'Dependency {dependency} has not been accepted and integrated.'
    if task['phase'] != 'apply' and not all(done(latest.get(t['id'])) for t in tasks if t['phase'] == 'apply'):
        return 'Accept and integrate all implementation work before verification or documentation.'
    if task['phase'] == 'docs' and not all(done(latest.get(t['id'])) for t in tasks if t['phase'] == 'check'):
        return 'Accept every verification contribution before documentation.'
    return None

def fingerprint(p):
    if p.is_symlink():
        return 'symlink:' + os.readlink(p)
    if not p.exists():
        return None
    if not p.is_file():
        return 'unsupported'
    return hashlib.sha256(p.read_bytes()).hexdigest() + ':' + oct(p.stat().st_mode & 0o111)

def listed(root, paths, tracked=True):
    if not paths:
        return []
    output = git(root, '--literal-pathspecs', 'ls-files', '-z', '--others', '--exclude-standard',
                 *(['--cached'] if tracked else []), '--', *paths).stdout
    names = {os.fsdecode(x) for x in output.split(b'\0') if x}
    return sorted(x for x in names if not x.endswith('/') and not x.startswith('.workflow/.runtime/'))

def worktree_path(root, change, job):
    rel = job.get('worktree')
    if not isinstance(rel, str):
        return None
    require(rel.startswith(f'.workflow/.runtime/{change}/worktrees/') and '..' not in Path(rel).parts, 'Invalid recorded worktree path.')
    return safe(root, rel)

def remove_worktree(root, change, job):
    path = worktree_path(root, change, job)
    if path is None:
        return
    if path.exists():
        if git(root, 'worktree', 'remove', '--force', str(path), check=False).returncode and path.exists():
            shutil.rmtree(path)
        git(root, 'worktree', 'prune', check=False)
    job['worktree_removed'] = True

def create_worktree(root, change, task, attempt):
    """Snapshot the working tree (tracked edits plus untracked owned/read files) into a detached worktree."""
    require(head(root), 'Isolation needs an initial commit.')
    rel = f'.workflow/.runtime/{change}/worktrees/{task["id"]}-{attempt}'
    path = safe(root, rel)
    require(not path.exists(), f'Worktree path already exists: {rel}')
    base_commit = git(root, 'stash', 'create').stdout.decode().strip() or head(root)
    base = {name: fingerprint(root / name) for name in listed(root, task['write_paths'])}
    path.parent.mkdir(parents=True, exist_ok=True)
    git(root, 'worktree', 'add', '--detach', str(path), base_commit)
    job = {'worktree': rel}
    try:
        copied = {}
        for name in listed(root, task['write_paths'] + task.get('read_paths', []) + [f'.workflow/changes/{change}'], tracked=False):
            source = safe(root, name)
            if source.is_file():
                target = safe(path, name)
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(source, target)
                copied[name] = fingerprint(target)
    except Exception:
        remove_worktree(root, change, job)
        raise
    return {'worktree': rel, 'base_commit': base_commit, 'base': base, 'copied': copied}

def refresh_worktree(root, change, task, previous):
    """Bring every path outside write_paths in a reused worktree to the main checkout's current content.

    Tracked content comes from the same snapshot as creation (stash create or HEAD); untracked read/change
    files are copied again. Owned paths and the owned part of `base`/`copied` are left alone, so the worker's
    uncommitted work survives and integrate still compares owned files with the original snapshot.
    """
    wt = worktree_path(root, change, previous)
    old = previous['base_commit']
    new = git(root, 'stash', 'create').stdout.decode().strip() or head(root)
    owned_paths = task['write_paths']

    def names(output):
        return {os.fsdecode(x) for x in output.split(b'\0') if x}

    def eligible(name):
        parts = Path(name).parts
        return bool(parts) and parts[0].casefold() != '.git' and not name.startswith('.workflow/.runtime/') and not owned(name, owned_paths)

    def regular(base, name):
        """True when base/name is a regular file reached without crossing a symlink."""
        try:
            path = safe(base, name)
        except WorkflowError:
            return False
        return path.is_file() and not path.is_symlink()

    def entry(name):
        """The worktree path for name, or None when an ancestor is not a real directory (never followed)."""
        path = wt
        for part in Path(name).parts[:-1]:
            path = path / part
            if path.is_symlink() or not path.is_dir():
                return None
        return path / Path(name).parts[-1]

    def clear(name):
        """Remove a non-owned entry without following it: symlinks and special files are unlinked, directories pruned."""
        path = wt / name
        if path.is_symlink() or not path.is_dir():
            path.unlink()
            return
        require(not any(w.startswith(name + '/') for w in owned_paths),
                f'Cannot refresh {name}: it is a directory that contains owned paths.')
        shutil.rmtree(path)

    def clear_ancestors(name):
        """Make every ancestor of name a real directory, removing non-owned symlinks or files in the way."""
        parts = Path(name).parts
        for index in range(1, len(parts)):
            prefix = '/'.join(parts[:index])
            path = wt / prefix
            if path.is_symlink() or os.path.lexists(path) and not path.is_dir():
                require(not any(w == prefix or w.startswith(prefix + '/') for w in owned_paths),
                        f'Cannot refresh {name}: {prefix} is not a directory and holds owned paths.')
                path.unlink()
                removed.add(prefix)

    copy_set = {n for n in listed(root, owned_paths + task.get('read_paths', []) + [f'.workflow/changes/{change}'], tracked=False)
                if eligible(n) and regular(root, n)}
    copied = dict(previous.get('copied') or {})
    candidates = names(git(root, 'diff', '--no-renames', '--name-only', '-z', old, new).stdout)
    candidates |= names(git(wt, 'diff', '--no-ext-diff', '--no-renames', '--name-only', '-z', old).stdout)
    candidates |= names(git(wt, 'ls-files', '-z', '--others', '--exclude-standard').stdout)
    candidates |= set(copied) | copy_set
    candidates = sorted(n for n in candidates if eligible(n))
    in_new = names(git(root, '--literal-pathspecs', 'ls-tree', '-r', '-z', '--name-only', new, '--', *candidates).stdout) if candidates else set()
    written, removed, checkout, untrack = [], set(), [], []
    for name in candidates:
        target = entry(name)
        before = fingerprint(target) if target is not None else None
        regular_before = target is not None and target.is_file() and not target.is_symlink()
        if name in copy_set or name in in_new:
            if target is None:
                clear_ancestors(name)
                target = wt / name
            if os.path.lexists(target) and not target.is_file() or target.is_symlink():
                clear(name)  # Never write through a symlink or into a special entry.
                removed.add(name)
            if name in copy_set:
                source = safe(root, name)
                if before != fingerprint(source) or not regular_before:
                    target.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(source, target)
                    written.append(name)
                copied[name] = fingerprint(target)
            else:
                copied.pop(name, None)
                checkout.append((name, before if regular_before else None))
            continue
        copied.pop(name, None)
        untrack.append(name)
        if target is not None and os.path.lexists(target):
            clear(name)
            removed.add(name)
            parent = target.parent
            while parent != wt and parent.is_dir() and not parent.is_symlink() and not any(parent.iterdir()):
                parent.rmdir(); parent = parent.parent
    for start in range(0, len(checkout), 200):
        chunk = checkout[start:start + 200]
        git(wt, '--literal-pathspecs', 'checkout', '-q', new, '--', *[n for n, _ in chunk])
        written += [n for n, before in chunk if fingerprint(wt / n) != before]
    for start in range(0, len(untrack), 200):
        git(wt, '--literal-pathspecs', 'rm', '-q', '--cached', '--ignore-unmatch', '--', *untrack[start:start + 200])
    deleted = removed - set(written)
    git(wt, 'reset', '-q', '--soft', new)  # HEAD follows the refreshed snapshot; the index and owned files are kept.
    refreshed = {'from_commit': old, 'to_commit': new, 'written': sorted(written), 'deleted': sorted(deleted), 'at': now()}
    return {'worktree': previous['worktree'], 'base_commit': new, 'base': previous.get('base') or {}, 'copied': copied,
            'refreshed': refreshed}

def worktree_exists(root, change, job):
    path = worktree_path(root, change, job)
    return path is not None and path.is_dir() and job.get('worktree_removed') is not True

def text_input(value):
    raw = sys.stdin.buffer.read() if value == '-' else Path(value).read_bytes()
    return raw.decode('utf-8', errors='replace')

def store_result(root, rel, text):
    raw = text.encode('utf-8')
    truncated = len(raw) > RESULT_LIMIT
    body = raw[:RESULT_LIMIT].decode('utf-8', errors='ignore')
    if truncated:
        body += f'\n\n[truncated by Stip: {len(raw) - RESULT_LIMIT} bytes omitted]\n'
    write(safe(root, rel), body)
    return {'result_path': rel, 'result_bytes': len(raw), 'result_truncated': truncated}

def load_v2(root, name):
    p, s = load(root, name)
    require(s['schema_version'] == 2, 'Install and approve an execution plan before delegation.')
    return p, s

def task_job(root, args):
    """Locate the latest attempt of a change task; --attempt must name it."""
    p, s = load_v2(root, args.id)
    data = runtime_state(root, p, s)
    jobs = [j for j in data['jobs'] if j['task_id'] == args.task] if data else []
    require(jobs, f'No worker record for task {args.task}.')
    job = max(jobs, key=lambda j: j['attempt'])
    attempt = getattr(args, 'attempt', None)
    require(attempt is None or job['attempt'] == attempt, f'Attempt {attempt} is not the latest attempt of {args.task}.')
    return p, s, data, job

def helper_job(root, args):
    path = safe(root, '.workflow/.runtime/engine-helpers.json')
    data = read_helpers(path)
    job = next((j for j in data['jobs'] if j.get('helper_id') == args.helper), None)
    require(job is not None, f'Unknown engine-managed helper: {args.helper}')
    return path, data, job

def target(root, args):
    """Return (registry path, registry, job, owner) for --task or --helper."""
    require(bool(args.task) != bool(args.helper), 'Name exactly one of --task or --helper.')
    if args.helper:
        path, data, job = helper_job(root, args)
        return path, data, job, 'helper'
    require(getattr(args, 'attempt', None) is not None or args.runtime_action == 'cancel', '--attempt is required with --task.')
    _, s, data, job = task_job(root, args)
    return registry_file(root, s['id']), data, job, s['id']

def reserve_task(root, args):
    p, s = load_v2(root, args.id)
    approved(root, p, s)
    value = contract(root, p, s)
    tasks = validate_task_plan(root, p, s)['tasks']
    task = next((t for t in tasks if t['id'] == args.task), None)
    require(task is not None, 'Task is not in the approved execution plan.')
    data = runtime_state(root, p, s) or {'version': 1, 'change_id': s['id'], 'contract_digest': value, 'jobs': []}
    require(data.get('contract_digest') == value, 'Registry belongs to another contract; reconcile it first.')
    latest = latest_attempts(data['jobs'])
    reason = blocker(task, tasks, latest, s['phase'])
    require(reason is None, reason)
    previous = latest.get(task['id'])
    require(not previous or previous['status'] not in ACTIVE_JOB_STATUSES, 'This task already has an active or unknown native run.')
    require(not previous or previous['status'] != 'returned' or previous['acceptance'] != 'pending' or args.correction,
            'Review the returned attempt before dispatching another one.')
    require(not previous or previous['acceptance'] != 'accepted' or args.correction,
            'Use --correction to resume an accepted task within its approved contract.')
    require(not args.correction or previous, 'A correction needs a previous attempt of this task.')
    reuse = bool(args.correction and worktree_exists(root, s['id'], previous))
    isolate = args.isolate or reuse
    require(not isolate or task['write_paths'], 'Isolation applies only to tasks with write_paths.')
    limits = runtime_limits(root, args)
    active = [j for _, j in all_jobs(root, exclude=s['id']) if j.get('status') in ACTIVE_JOB_STATUSES]
    active += [j for j in data['jobs'] if j['status'] in ACTIVE_JOB_STATUSES]
    require(len(active) < limits['max_workers'], f'Worker limit reached ({len(active)}/{limits["max_workers"]} active).')
    if task['write_paths']:
        writers = [j for j in active if j.get('write_paths')]
        require(isolate or not any(j.get('isolated') is not True for j in writers),
                'Another worker owns the shared checkout writer slot; wait for it or use --isolate.')
        require(len(writers) < limits['max_shared_writers'],
                f'Writer limit reached ({len(writers)}/{limits["max_shared_writers"]} active writers).')
    if args.correction:
        affected, grew = {task['id']}, True
        while grew:
            grew = False
            for t in tasks:
                if t['id'] not in affected and set(t['depends_on']) & affected:
                    affected.add(t['id']); grew = True
        require(not any(j['task_id'] in affected and j['status'] in ACTIVE_JOB_STATUSES for j in data['jobs']), 'A dependent task is still active.')
        for j in data['jobs']:
            if j['task_id'] in affected:
                j['acceptance'] = 'rejected'
    profile = None
    if args.profile_json is not None:
        profile = json.loads(bounded(args.profile_json, 'profile JSON', 8192, True))
        require(isinstance(profile, dict), 'Profile must be a JSON object.')
    attempt = previous['attempt'] + 1 if previous else 1
    created = None
    if previous and not reuse:
        remove_worktree(root, s['id'], previous)  # A fresh attempt never inherits a rejected or failed checkout.
    if reuse:
        isolation = refresh_worktree(root, s['id'], task, previous)
    elif isolate:
        isolation = created = create_worktree(root, s['id'], task, attempt)
    stamp = now()
    job = {'run_id': str(uuid.uuid4()), 'task_id': task['id'], 'attempt': attempt, 'role': task['role'], 'phase': task['phase'],
           'objective': task['objective'], 'write_paths': task['write_paths'], 'read_paths': task['read_paths'],
           'criteria': task['criteria'], 'depends_on': task['depends_on'], 'status': 'starting', 'acceptance': 'pending', 'launch_confirmed': False,
           'session_id': previous.get('session_id') if args.correction else None, 'parent_id': args.parent,
           'host': args.host, 'profile': profile, 'isolated': isolate, 'created_at': stamp, 'updated_at': stamp}
    if isolate:
        job.update(isolation, integrated=False)
    data['jobs'].append(job)
    try:
        write_json(registry_file(root, s['id']), data)
    except Exception:
        if created:
            remove_worktree(root, s['id'], created)
        raise
    return {'change_id': s['id'], 'job': job, 'cwd': str(root / job['worktree']) if isolate else str(root)}

def reserve_helper(root, args):
    require(not (args.correction or args.isolate), 'Helpers are read-only single attempts.')
    role = slug(args.helper)
    require(role not in ('coordinator', 'discovery'), 'Discovery stays with the main coordinator.')
    change = None if args.id == '-' else slug(args.id)
    require(change is None or safe(root, f'.workflow/changes/{change}/state.json').exists(),
            'Research context must name an existing active change.')
    bounded(args.question, 'question', 8000)
    limits = runtime_limits(root, args)
    active = [j for _, j in all_jobs(root) if j.get('status') in ACTIVE_JOB_STATUSES]
    require(len(active) < limits['max_workers'], f'Worker limit reached ({len(active)}/{limits["max_workers"]} active).')
    profile = json.loads(bounded(args.profile_json, 'profile JSON', 8192, True)) if args.profile_json is not None else None
    require(profile is None or isinstance(profile, dict), 'Profile must be a JSON object.')
    identifier, stamp = f'helper-{uuid.uuid4()}', now()
    job = {'kind': 'helper', 'helper_id': identifier, 'run_id': identifier, 'task_id': identifier, 'change_id': change,
           'role': role, 'phase': args.phase, 'objective': (args.question or '').strip(), 'write_paths': [], 'read_paths': [],
           'criteria': [], 'parent_id': args.parent, 'session_id': None, 'attempt': 1, 'launch_confirmed': False,
           'status': 'starting', 'host': args.host, 'profile': profile, 'created_at': stamp, 'updated_at': stamp}
    path = safe(root, '.workflow/.runtime/engine-helpers.json')
    data = read_helpers(path)
    data['jobs'].append(job)
    write_json(path, data)
    return {'change_id': change, 'job': job, 'cwd': str(root)}

def runtime_confirm(root, args):
    session = bounded(args.session, 'session id', 512, True).strip()
    bounded(args.model, 'model', 512)
    path, data, job, owner = target(root, args)
    require(job['status'] in ('starting', 'unknown') and job.get('cancellation') is None,
            'Only a starting or unresolved launch can be confirmed.')
    for other_owner, other in all_jobs(root):
        require(other.get('session_id') != session or (other_owner, other.get('task_id')) == (owner, job['task_id']),
                'Native session already owns an unrelated task.')
    job.update(session_id=session, launch_confirmed=True, status='running', confirmed_at=now(), updated_at=now())
    if args.model:
        job['actual_model'] = args.model
    job.pop('error', None)
    write_json(path, data)
    return {'change_id': None if owner == 'helper' else owner, 'job': job}

def runtime_settle(root, args):
    bounded(args.last_tool, 'last tool', 256)
    bounded(args.error, 'error', 2000)
    path, data, job, owner = target(root, args)
    status = args.status
    require(job['status'] not in TERMINAL_JOB_STATUSES or (status == job['status'] and job.get('acceptance', 'pending') == 'pending'),
            'A finished attempt cannot change state; reserve a new attempt instead.')
    require(status not in ('running', 'waiting', 'returned') or job.get('session_id'),
            'Confirm the native session before recording its activity.')
    stamp = now()
    job.update(status=status, updated_at=stamp, last_activity_at=stamp)
    if status in TERMINAL_JOB_STATUSES:
        job['finished_at'] = job.get('finished_at') or stamp
    if status == 'cancelled':
        job['stop_confirmed'] = True
    if args.last_tool is not None:
        job['last_tool'] = args.last_tool
    if args.error is not None:
        job['error'] = args.error
    if args.result_file is not None:
        rel = (f'.workflow/.runtime/helper-results/{job["helper_id"]}.md' if owner == 'helper'
               else f'.workflow/.runtime/{owner}/results/{job["task_id"]}-{job["attempt"]}.md')
        job.update(store_result(root, rel, text_input(args.result_file)))
    write_json(path, data)
    return {'change_id': None if owner == 'helper' else owner, 'job': job}

def runtime_review(root, args):
    require(len(args.reason.strip()) >= 8, 'Record the integration/verification reason (at least 8 characters).')
    require(not args.discard or args.decision == 'rejected', '--discard applies only to a rejection.')
    p, s, data, job = task_job(root, args)
    approved(root, p, s)
    require(data['contract_digest'] == contract(root, p, s), 'Registry contract mismatch; reconcile it first.')
    require(job['status'] == 'returned' and job.get('session_id'), 'Only a returned native contribution can be reviewed.')
    require(job['acceptance'] == 'pending', 'This attempt was already reviewed; reserve a correction to change it.')
    job['acceptance'] = args.decision
    job['review'] = {'decision': args.decision, 'reason': args.reason.strip(), 'at': now()}
    job['updated_at'] = now()
    if args.discard:
        remove_worktree(root, s['id'], job)
    write_json(registry_file(root, s['id']), data)
    return {'change_id': s['id'], 'job': job}

def runtime_cancel(root, args):
    bounded(args.reason, 'cancellation reason', 2000)
    path, data, job, owner = target(root, args)
    require(job['status'] in ACTIVE_JOB_STATUSES, 'No active attempt to cancel.')
    stamp = now()
    job.update(status='cancelled', acceptance='pending', stop_confirmed=False, finished_at=job.get('finished_at') or stamp,
               cancellation={'reason': (args.reason or '').strip() or None, 'at': stamp}, updated_at=stamp)
    if owner != 'helper':
        remove_worktree(root, owner, job)
    write_json(path, data)
    return {'change_id': None if owner == 'helper' else owner, 'job': job,
            'note': 'Recorded only; the host must stop the native session and deny its further tool calls.'}

def worktree_changes(root, change, job):
    """Paths the worker changed in its worktree relative to the snapshot, with conflicts for anything unsafe."""
    wt = worktree_path(root, change, job)
    require(wt is not None and wt.is_dir() and job.get('worktree_removed') is not True, 'The isolated worktree no longer exists.')
    names = {os.fsdecode(x) for x in git(wt, 'diff', '--no-ext-diff', '--no-renames', '--name-only', '-z', job['base_commit']).stdout.split(b'\0') if x}
    untracked = {os.fsdecode(x) for x in git(wt, 'ls-files', '-z', '--others', '--exclude-standard').stdout.split(b'\0') if x}
    copied = job.get('copied') or {}
    untracked |= set(copied)
    names |= untracked
    changes, conflicts, skipped = [], [], []
    for name in sorted(names):
        parts = Path(name).parts
        if name in untracked and name not in copied and (
                '.pytest_cache' in parts[:-1] or '__pycache__' in parts[:-1] and name.endswith('.pyc')):
            skipped.append({'path': name, 'reason': 'build artefact'}); continue
        try:
            source = safe(wt, name)
            current = fingerprint(source)
        except WorkflowError as exc:
            conflicts.append({'path': name, 'reason': str(exc)}); continue
        if name in copied and current == copied[name]:
            continue
        if Path(name).parts[0].casefold() in ('.git', '.workflow') or not owned(name, job['write_paths']):
            conflicts.append({'path': name, 'reason': 'Changed outside the task write_paths.', **({'untracked': True} if name in untracked else {})})
        elif current is not None and (current == 'unsupported' or current.startswith('symlink:')):
            conflicts.append({'path': name, 'reason': 'Only regular files and deletions can be integrated.'})
        else:
            changes.append((name, 'delete' if current is None else 'write'))
    # Ignored output (caches, builds) is never integrated, but the host is told what stayed behind.
    ignored = git(wt, '--literal-pathspecs', 'ls-files', '-z', '--others', '--ignored', '--exclude-standard', '--', *job['write_paths']).stdout
    skipped += [{'path': name, 'reason': 'gitignored'} for name in sorted({os.fsdecode(x) for x in ignored.split(b'\0') if x})]
    return wt, changes, conflicts, skipped

def apply_changes(root, wt, changes, finish):
    """Stage every write next to its target, swap all in, run finish(); restore everything on any failure."""
    staged, journal, created = {}, [], []
    try:
        for name, action in changes:
            path = root / name
            missing, parent = [], path.parent
            while not parent.exists():
                missing.append(parent); parent = parent.parent
            for folder in reversed(missing):
                folder.mkdir(); created.append(folder)
            if action == 'write':
                fd, tmp = tempfile.mkstemp(dir=path.parent, prefix='.workflow-integrate-'); os.close(fd)
                staged[name] = tmp
                shutil.copy2(wt / name, tmp)
        for name, action in changes:
            path = root / name
            entry = {'path': path, 'backup': None, 'moved': False}
            journal.append(entry)
            if path.exists():
                fd, entry['backup'] = tempfile.mkstemp(dir=path.parent, prefix='.workflow-backup-'); os.close(fd)
                os.replace(path, entry['backup'])
            entry['moved'] = True
            if action == 'write':
                os.replace(staged[name], path)
                del staged[name]
        finish()
    except BaseException:
        for entry in reversed(journal):
            if entry['moved']:
                if os.path.lexists(entry['path']):
                    entry['path'].unlink()
                if entry['backup']:
                    os.replace(entry['backup'], entry['path'])
            elif entry['backup']:
                os.unlink(entry['backup'])
        for tmp in staged.values():
            if os.path.exists(tmp):
                os.unlink(tmp)
        for folder in reversed(created):
            with contextlib.suppress(OSError):
                folder.rmdir()
        raise
    for entry in journal:
        if entry['backup']:
            os.unlink(entry['backup'])

def runtime_integrate(root, args):
    p, s, data, job = task_job(root, args)
    approved(root, p, s)
    require(data['contract_digest'] == contract(root, p, s), 'Registry contract mismatch; reconcile it first.')
    require(job.get('isolated') is True, 'Only an isolated attempt needs integration; shared-checkout work is already in place.')
    require(job['acceptance'] == 'accepted' and job['status'] == 'returned', 'Accept the returned contribution before integrating it.')
    require(job.get('integrated') is not True, 'This attempt is already integrated.')
    wt, changes, conflicts, skipped = worktree_changes(root, s['id'], job)
    base = job.get('base') or {}
    for name in sorted(set(listed(root, job['write_paths'])) | set(base)):
        try:
            current = fingerprint(safe(root, name))
        except WorkflowError as exc:
            conflicts.append({'path': name, 'reason': str(exc)}); continue
        if current != base.get(name):
            conflicts.append({'path': name, 'reason': 'Changed in the main checkout since the snapshot.'})
    for name, _ in changes:
        try:
            path = safe(root, name)
            require(not path.exists() or path.is_file() and not path.is_symlink(), f'Main checkout entry is not a regular file: {name}')
        except WorkflowError as exc:
            conflicts.append({'path': name, 'reason': str(exc)})
    for owner, other in all_jobs(root):
        if (owner, other.get('task_id')) != (s['id'], job['task_id']) and other.get('status') in ACTIVE_JOB_STATUSES \
                and other.get('isolated') is not True and other.get('write_paths') and overlaps(other['write_paths'], job['write_paths']):
            conflicts.append({'path': ', '.join(other['write_paths']), 'reason': f'Active shared-checkout writer {owner}/{other.get("task_id")} owns overlapping paths.'})
    if conflicts:
        raise Conflict(f'Integration of {job["task_id"]} refused; nothing was written.', conflicts)
    written = [n for n, a in changes if a == 'write']
    deleted = [n for n, a in changes if a == 'delete']
    job.update(integrated=True, integrated_at=now(), updated_at=now(), integration={'written': written, 'deleted': deleted, 'skipped': skipped})
    apply_changes(root, wt, changes, lambda: write_json(registry_file(root, s['id']), data))
    remove_worktree(root, s['id'], job)
    write_json(registry_file(root, s['id']), data)
    return {'change_id': s['id'], 'task_id': job['task_id'], 'written': written, 'deleted': deleted, 'skipped': skipped, 'job': job}

def runtime_show(root, args):
    p, s = load_v2(root, args.id)
    value = contract(root, p, s)
    tasks = validate_task_plan(root, p, s)['tasks']
    orphans = []
    data = runtime_state(root, p, s, orphans=orphans)
    latest = {k: j for k, j in (latest_attempts(data['jobs']) if data else {}).items() if k not in orphans}
    ready = [t['id'] for t in tasks if blocker(t, tasks, latest, s['phase']) is None and (
        t['id'] not in latest or latest[t['id']]['status'] in ('failed', 'cancelled') or latest[t['id']]['acceptance'] == 'rejected')]
    active = [(o, j) for o, j in all_jobs(root) if j.get('status') in ACTIVE_JOB_STATUSES]
    result = {'change_id': s['id'], 'phase': s['phase'], 'contract_digest': value,
              'approval_current': s.get('approval', {}).get('contract_digest') == value,
              'registry': data, 'registry_current': data is None or data.get('contract_digest') == value and not orphans,
              'orphan_tasks': sorted(set(orphans)),
              'latest': latest, 'ready': ready,
              'awaiting_review': [k for k, j in latest.items() if j['status'] == 'returned' and j['acceptance'] == 'pending'],
              'awaiting_integration': [k for k, j in latest.items() if j['acceptance'] == 'accepted' and not done(j)],
              'active': {'change': sum(o == s['id'] for o, _ in active), 'helpers': sum(o == 'helper' for o, _ in active),
                         'total': len(active), 'writers': sum(bool(j.get('write_paths')) for _, j in active)},
              'limits': runtime_limits(root, args)}
    if args.task:
        jobs = [j for j in (data or {'jobs': []})['jobs'] if j['task_id'] == args.task and (args.attempt is None or j['attempt'] == args.attempt)]
        require(jobs, f'No worker record for task {args.task}.')
        job = max(jobs, key=lambda j: j['attempt'])
        result['job'] = job
        path = safe(root, job['result_path']) if isinstance(job.get('result_path'), str) and job['result_path'].startswith(f'.workflow/.runtime/{s["id"]}/results/') else None
        result['result'] = path.read_text(errors='replace') if path and path.is_file() else None
    return result

def runtime_revoke(root, args):
    reason = bounded(args.reason, 'revocation reason', 2000, True).strip()
    p, s = load(root, args.id)
    require(isinstance(s.get('approval'), dict), 'This change has no approval to revoke.')
    require(s['phase'] == 'approved' or s['phase'] in ('applying', 'checked', 'documented') and args.force_phase,
            f'Approval can be revoked from phase approved; phase {s["phase"]} needs --force-phase.')
    revoked = {'reason': reason, 'at': now(), 'digest': s['approval'].get('contract_digest'), 'phase': s['phase']}
    for key in ('approval', 'check', 'documentation'):
        s.pop(key, None)  # Same reset as validate for a stale approval; the source baseline is kept.
    s['approval_revoked'] = revoked
    save(p, s, 'draft')
    return {'change': s['id'], 'phase': 'draft', 'approval_revoked': revoked}

TASK_DEFINITION = ('role', 'phase', 'objective', 'criteria', 'depends_on', 'write_paths', 'read_paths')

def definition_changed(task, job):
    """A task changed when a recorded field differs; core fields must be recorded, older records may lack depends_on/read_paths."""
    for key in TASK_DEFINITION:
        if key not in job:
            if key in ('depends_on', 'read_paths'):
                continue
            return True
        value = job[key]
        if isinstance(task[key], list):
            if not isinstance(value, list) or sorted(map(str, value)) != task[key]:
                return True
        elif value != task[key]:
            return True
    return False

def runtime_rebase(root, args):
    """Carry a registry over to a re-approved contract: retire removed tasks, reopen changed ones and their dependants."""
    reason = bounded(args.reason, 'rebase reason', 2000)
    p, s = load_v2(root, args.id)
    approved(root, p, s)
    value = contract(root, p, s)
    orphans = []
    data = runtime_state(root, p, s, orphans=orphans)
    require(data is not None, 'No worker registry to rebase.')
    tasks = validate_task_plan(root, p, s)['tasks']
    latest = latest_attempts([j for j in data['jobs'] if j['task_id'] not in orphans])
    if data.get('contract_digest') == value and not orphans:
        return {'change_id': s['id'], 'contract_digest': value, 'changed': False, 'registry_current': True,
                'kept': sorted(latest), 'reopened': [], 'retired': [], 'retired_integrated_paths': {}}
    require(not any(j['status'] in ACTIVE_JOB_STATUSES for j in data['jobs']),
            'Workers are active or their outcome is unknown; reconcile them before rebasing the registry.')
    stamp = now()
    retired = sorted(set(orphans))
    integrated_paths = {}  # What each retired task already wrote or deleted in the main checkout stays there.
    for job in data['jobs']:
        if job['task_id'] in retired:
            paths = integrated_paths.setdefault(job['task_id'], set())
            integration = job.get('integration') if job.get('integrated') is True else None
            if isinstance(integration, dict):
                paths.update(x for key in ('written', 'deleted') for x in integration.get(key) or [] if isinstance(x, str))
    integrated_paths = {k: sorted(v) for k, v in integrated_paths.items()}
    for job in [j for j in data['jobs'] if j['task_id'] in retired]:
        remove_worktree(root, s['id'], job)
        data.setdefault('retired_jobs', []).append(dict(job, retired_reason='task removed from the revised contract', retired_at=stamp,
                                                        retired_integrated_paths=integrated_paths[job['task_id']]))
    data['jobs'] = [j for j in data['jobs'] if j['task_id'] not in retired]
    reopened = {t['id']: 'task changed in revised contract' for t in tasks if t['id'] in latest and definition_changed(t, latest[t['id']])}
    grew = True
    while grew:
        grew = False
        for t in tasks:
            if t['id'] in latest and t['id'] not in reopened and set(t['depends_on']) & set(reopened):
                reopened[t['id']] = 'dependency changed'; grew = True
    for identifier, why in reopened.items():
        job = latest[identifier]
        if job.get('review'):
            job['superseded_review'] = job['review']
        job.update(acceptance='rejected', review={'decision': 'rejected', 'reason': why, 'at': stamp}, updated_at=stamp)
    kept = sorted(set(latest) - set(reopened))
    entry = {'from': data.get('contract_digest'), 'to': value, 'at': stamp, 'reason': (reason or '').strip() or None,
             'kept': kept, 'reopened': sorted(reopened), 'retired': retired, 'retired_integrated_paths': integrated_paths}
    data['contract_digest'] = value
    data.setdefault('rebases', []).append(entry)
    write_json(registry_file(root, s['id']), data)
    return {'change_id': s['id'], 'contract_digest': value, 'changed': True, 'registry_current': True, 'rebase': entry,
            'kept': kept, 'reopened': sorted(reopened), 'retired': retired, 'retired_integrated_paths': integrated_paths}

def runtime(root, args):
    action = args.runtime_action
    if action == 'reserve':
        require(bool(args.task) != bool(args.helper), 'Name exactly one of --task or --helper.')
        require(args.host is None or bool(re.fullmatch(r'[a-z0-9][a-z0-9._-]{0,63}', args.host)), 'Invalid host name.')
        bounded(args.parent, 'parent session id', 512)
        return reserve_helper(root, args) if args.helper else reserve_task(root, args)
    return {'show': runtime_show, 'confirm': runtime_confirm, 'settle': runtime_settle, 'review': runtime_review,
            'cancel': runtime_cancel, 'integrate': runtime_integrate, 'revoke-approval': runtime_revoke, 'rebase': runtime_rebase}[action](root, args)

@contextlib.contextmanager
def lock(root):
    folder = safe(root, '.workflow')
    folder.mkdir(exist_ok=True)
    for base, dirs, files in os.walk(folder):
        for name in dirs + files:
            require(not os.path.islink(os.path.join(base, name)), f'Symlink inside managed workflow: {os.path.join(base, name)}')
        parts = Path(base).relative_to(folder).parts
        if len(parts) == 2 and parts[0] == '.runtime':
            dirs[:] = [d for d in dirs if d != 'worktrees']  # Isolated checkouts are Git-managed copies of the project.
    p = safe(root, '.workflow/.lock')
    try:
        fd = os.open(p, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    except FileExistsError as exc:
        raise WorkflowError('Workflow is locked. If a prior process crashed, confirm it stopped before removing .workflow/.lock.') from exc
    try:
        os.write(fd, str(os.getpid()).encode())
        os.close(fd)
        yield
    finally:
        p.unlink(missing_ok=True)

def parser():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--root', default='.', help='Target project root')
    sub = p.add_subparsers(dest='command', required=True)
    sub.add_parser('bootstrap')
    e = sub.add_parser('explore'); e.add_argument('id'); e.add_argument('--title'); e.add_argument('--target'); e.add_argument('--extension', action='append', default=[])
    for name in ('validate', 'start'):
        sub.add_parser(name).add_argument('id')
    st = sub.add_parser('status'); st.add_argument('id'); st.add_argument('--compact', action='store_true')
    pl = sub.add_parser('plan'); pl.add_argument('id'); pl.add_argument('--file', help='Execution plan JSON file, or - for stdin; omit to read the current plan')
    pl.add_argument('--migrate', action='store_true', help='Explicitly migrate an approved v1 change, invalidating approval')
    e = sub.add_parser('select'); e.add_argument('id'); e.add_argument('--extension', action='append', default=[])
    a = sub.add_parser('approve'); a.add_argument('id'); a.add_argument('--by', required=True); a.add_argument('--ack-user-approval', action='store_true')
    c = sub.add_parser('check'); c.add_argument('id'); c.add_argument('--results', required=True)
    d = sub.add_parser('docs'); d.add_argument('id'); d.add_argument('--summary', required=True); d.add_argument('--paths', nargs='*', default=[])
    a = sub.add_parser('archive'); a.add_argument('id'); a.add_argument('--message', required=True); a.add_argument('--paths', nargs='*', default=[])
    sub.add_parser('snapshot')
    sub.add_parser('extensions')
    r = sub.add_parser('runtime', help='Host-neutral worker dispatch gates and registry',
                       description='Worker registry at .workflow/.runtime/<id>/state.json. JSON on stdout; {"error"} on stderr with exit 1 on refusal. '
                                   'Mutations take .workflow/.lock and replace files atomically.')
    actions = r.add_subparsers(dest='runtime_action', required=True)
    def action(name, text):
        return actions.add_parser(name, help=text, description=text)
    def who(x, task_required=False, helper=True):
        x.add_argument('id', help='Change id, or - for a helper without change context')
        x.add_argument('--task', required=task_required, help='Approved plan task id')
        if helper:
            x.add_argument('--helper', help='Helper role (reserve) or helper id (confirm, settle, cancel)')
    x = action('show', 'Registry, latest attempt per task, ready tasks and active counts; --task adds the job and its captured result.')
    x.add_argument('id'); x.add_argument('--task'); x.add_argument('--attempt', type=int)
    x = action('reserve', 'Apply every dispatch gate and record a starting job before launch (or a read-only helper with --helper ROLE).')
    who(x)
    x.add_argument('--correction', action='store_true', help='New attempt of an accepted/rejected task; rejects it and its dependants, reuses session and worktree')
    x.add_argument('--isolate', action='store_true', help='Run a writing task in its own git worktree snapshot of the working tree')
    x.add_argument('--max-workers', type=int, help='Override orchestration.defaults.max_workers (1-8, default 2)')
    x.add_argument('--max-shared-writers', type=int, help='Override orchestration.defaults.max_shared_writers (1-8, default 1)')
    x.add_argument('--host', help='Host name recorded on the job, e.g. claude-code')
    x.add_argument('--parent', help='Coordinator session id recorded as parent_id')
    x.add_argument('--profile-json', help='Resolved worker profile as a JSON object')
    x.add_argument('--question', help='Helper question (1-8000 characters)')
    x.add_argument('--phase', choices=('explore', 'validate'), default='explore', help='Helper phase')
    x = action('confirm', 'Record the real native session of a starting job: starting -> running.')
    who(x); x.add_argument('--attempt', type=int); x.add_argument('--session', required=True); x.add_argument('--model', help='Actual model observed')
    x = action('settle', 'Record observed native state; terminal states only change through a new attempt.')
    who(x); x.add_argument('--attempt', type=int)
    x.add_argument('--status', required=True, choices=('running', 'waiting', 'returned', 'failed', 'cancelled', 'unknown'))
    x.add_argument('--result-file', help='Final answer file, or - for stdin; stored bounded to 64 KiB')
    x.add_argument('--last-tool'); x.add_argument('--error')
    x = action('review', 'Accept or reject the latest returned attempt of a task.')
    who(x, True, False); x.add_argument('--decision', required=True, choices=('accepted', 'rejected'))
    x.add_argument('--reason', required=True, help='At least 8 characters'); x.add_argument('--discard', action='store_true', help='Remove a rejected worktree instead of keeping it for a correction')
    x = action('integrate', 'Apply an accepted isolated attempt to the main checkout, all-or-nothing, refusing conflicts.')
    who(x, True, False)
    x = action('cancel', 'Mark the latest active attempt cancelled and remove its worktree; the host must stop the session.')
    who(x); x.add_argument('--reason')
    x = action('revoke-approval', 'Remove the approval and return the change to draft (from approved; later phases need --force-phase).')
    x.add_argument('id'); x.add_argument('--reason', required=True)
    x.add_argument('--force-phase', action='store_true', help='Also revoke from applying, checked or documented; the source baseline is kept')
    x = action('rebase', 'Move the registry to the currently approved contract after a re-approval: jobs of removed tasks move to retired_jobs, changed tasks and their dependants are reopened (rejected), unchanged tasks keep acceptance and integration. No-op when current.')
    x.add_argument('id'); x.add_argument('--reason')
    return p

def main():
    args = parser().parse_args()
    root = Path(args.root).absolute()
    require(root.is_dir(), 'Project directory does not exist.')
    require(root.resolve() == root, 'Use the physical project path, not a symlink alias.')
    read_only = args.command in ('snapshot', 'status', 'extensions') or args.command == 'plan' and not args.file \
        or args.command == 'runtime' and args.runtime_action == 'show'
    require(read_only or not os.environ.get('STIP_WORKER'),
            'STIP_WORKER is set: workers cannot mutate the workflow lifecycle or worker registry; report to the coordinator.')
    if args.command == 'snapshot':
        files = snapshot(root); result = {'subject_digest': digest(files), 'files': files}
    elif args.command == 'status':
        result = status(root, args)
    elif args.command == 'plan' and not args.file:
        result = plan(root, args)
    elif args.command == 'runtime' and args.runtime_action == 'show':
        result = runtime_show(root, args)
    elif args.command == 'extensions':
        result = extension_data(root, [k for k,v in config(root)['extensions'].items() if isinstance(v,dict) and v.get('enabled') is True])
    else:
        with lock(root):
            result = globals()[args.command](root, args)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    if args.command == 'check' and result['phase'] != 'checked':
        sys.exit(2)

if __name__ == '__main__':
    try:
        main()
    except (WorkflowError, OSError, ValueError, KeyError, TypeError) as exc:
        print(json.dumps({'error': str(exc), **getattr(exc, 'details', {})}, ensure_ascii=False), file=sys.stderr)
        sys.exit(1)
