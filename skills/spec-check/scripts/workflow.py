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
from datetime import datetime, timezone

VERSION = 1
SLUG = re.compile(r'^[a-z0-9]+(?:-[a-z0-9]+)*$')
MARKER = '<!-- spec-workflow:start -->'
END = '<!-- spec-workflow:end -->'
GUIDANCE = '''<!-- spec-workflow:start -->
## Spec workflow
Read `.workflow/project.md` when project intent or conventions matter. Configuration is
in `.workflow/config.json`. Explore changes with relevant enabled extensions; do not
load every extension or repeat project discovery for a bounded edit. User approval of
a specific contract is required before spec-apply. Build and correct within that scope.
Report evidence and gaps accurately. Documentation and archive follow successful checks.
Keep these instructions subordinate to system/developer instructions and current user intent.
<!-- spec-workflow:end -->
'''

class WorkflowError(Exception):
    pass

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
    require(s.get('schema_version') == VERSION and s.get('id') == name, 'Invalid change state.')
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
    return digest({'files': files, 'target': s['target'],
                   'extensions': extension_data(root, s['extensions'])})

def criteria(p):
    text = (p / 'spec.md').read_text()
    found = re.findall(r'^- (AC-[1-9][0-9]*):\s*(\S.*)$', text, re.M)
    require(found, 'Spec requires acceptance criteria: - AC-1: observable behavior')
    ids = [key for key, _ in found]
    require(len(set(ids)) == len(ids), 'Duplicate acceptance criterion id.')
    require(not re.search(r'\b(TODO|TBD|FIXME)\b|\{\{', text), 'Unresolved template placeholder in spec.')
    require((p / 'proposal.md').read_text().strip(), 'Empty proposal.')
    return ids

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
    ids = criteria(p)
    report = json.load(sys.stdin) if args.results == '-' else read_json(Path(args.results))
    subject = snapshot(root)
    require(report.get('subject_digest') == digest(subject), 'Evidence refers to a different working tree.')
    entries = report.get('criteria')
    require(isinstance(entries, list), 'Expected criteria array.')
    require(all(isinstance(x, dict) for x in entries), 'Invalid criterion record.')
    require(len(entries) == len(ids) and {x.get('id') for x in entries} == set(ids), 'Report must cover every criterion exactly once.')
    allowed = {'passed', 'failed', 'unverified', 'not-applicable'}
    for item in entries:
        require(item.get('status') in allowed and isinstance(item.get('evidence'), str)
                and bool(item['evidence'].strip()), 'Every result needs a status and inspectable evidence or gap explanation.')
    s['check'] = {'subject': subject, 'report': report, 'at': now()}
    s.pop('documentation', None)
    passed = all(x['status'] == 'passed' for x in entries)
    write(p / 'evidence.md', '# Evidence\n\nSubject: `' + digest(subject) + '`\n\n' +
          '\n'.join(f"- {x['id']}: {x['status']} — {x['evidence']}" for x in entries) + '\n')
    save(p, s, 'checked' if passed else 'applying')
    return {'phase': s['phase'], 'all_passed': passed, 'note': 'Report consistency verified; evidence truth requires actual observations.'}

def docs(root, args):
    p, s = load(root, args.id)
    require(s['phase'] == 'checked', 'A successful check is required before documenting completion.')
    approved(root, p, s)
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
    try:
        save(p, s, 'archived')
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

@contextlib.contextmanager
def lock(root):
    folder = safe(root, '.workflow')
    folder.mkdir(exist_ok=True)
    for item in folder.rglob('*'):
        require(not item.is_symlink(), f'Symlink inside managed workflow: {item}')
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
    for name in ('validate', 'start', 'status'):
        sub.add_parser(name).add_argument('id')
    e = sub.add_parser('select'); e.add_argument('id'); e.add_argument('--extension', action='append', default=[])
    a = sub.add_parser('approve'); a.add_argument('id'); a.add_argument('--by', required=True); a.add_argument('--ack-user-approval', action='store_true')
    c = sub.add_parser('check'); c.add_argument('id'); c.add_argument('--results', required=True)
    d = sub.add_parser('docs'); d.add_argument('id'); d.add_argument('--summary', required=True); d.add_argument('--paths', nargs='*', default=[])
    a = sub.add_parser('archive'); a.add_argument('id'); a.add_argument('--message', required=True); a.add_argument('--paths', nargs='*', default=[])
    sub.add_parser('snapshot')
    sub.add_parser('extensions')
    return p

def main():
    args = parser().parse_args()
    root = Path(args.root).absolute()
    require(root.is_dir(), 'Project directory does not exist.')
    require(root.resolve() == root, 'Use the physical project path, not a symlink alias.')
    if args.command == 'snapshot':
        files = snapshot(root); result = {'subject_digest': digest(files), 'files': files}
    elif args.command == 'status':
        p, s = load(root, args.id); result = {**s, 'approval_current': s.get('approval', {}).get('contract_digest') == contract(root, p, s)}
    elif args.command == 'extensions':
        result = extension_data(root, [k for k,v in config(root)['extensions'].items() if isinstance(v,dict) and v.get('enabled') is True])
    else:
        with lock(root):
            result = globals()[args.command](root, args)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    if args.command == 'check' and not result['all_passed']:
        sys.exit(2)

if __name__ == '__main__':
    try:
        main()
    except (WorkflowError, OSError, ValueError, KeyError, TypeError) as exc:
        print(json.dumps({'error': str(exc)}, ensure_ascii=False), file=sys.stderr)
        sys.exit(1)
