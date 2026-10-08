"""Host-neutral runtime dispatch gates, registry transitions, isolation and integration."""
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / 'scripts/workflow.py'


class RuntimeTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name).resolve() / 'project with space'
        self.root.mkdir()
        self.git('init', '-q')
        self.git('config', 'user.email', 'test@example.invalid')
        self.git('config', 'user.name', 'Runtime Test')
        (self.root / 'app.py').write_text('value = 1\n')
        (self.root / 'lib').mkdir()
        (self.root / 'lib/a.py').write_text('a = 1\n')
        self.run_cli('bootstrap')
        (self.root / '.gitignore').write_text('.workflow/.runtime/\n.workflow/.lock\n')
        self.git('add', '.')
        self.git('commit', '-qm', 'initial')
        self.run_cli('explore', 'sample')
        self.change = self.root / '.workflow/changes/sample'
        (self.change / 'spec.md').write_text('# Feature\n\n- AC-1: Return the requested value.\n')
        self.plan = {'version': 1, 'tasks': [
            {'id': 'implement', 'role': 'backend', 'phase': 'apply', 'criteria': ['AC-1'],
             'depends_on': [], 'write_paths': ['app.py'], 'objective': 'Return value 2.'},
            {'id': 'implement-lib', 'role': 'backend', 'phase': 'apply', 'criteria': ['AC-1'], 'read_paths': ['app.py'],
             'depends_on': [], 'write_paths': ['lib'], 'objective': 'Extend the library.'},
            {'id': 'verify', 'role': 'verification', 'phase': 'check', 'criteria': ['AC-1'],
             'depends_on': ['implement', 'implement-lib'], 'write_paths': [], 'objective': 'Exercise the integrated value.'},
            {'id': 'document', 'role': 'documentation', 'phase': 'docs', 'criteria': ['AC-1'],
             'depends_on': ['verify'], 'write_paths': ['README.md'], 'objective': 'Explain the verified behavior.'},
        ]}
        self.registry = self.root / '.workflow/.runtime/sample/state.json'

    def git(self, *args):
        result = subprocess.run(['git', '-C', str(self.root), *args], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        return result.stdout

    def run_cli(self, *args, ok=True, stdin=None, env=None):
        environment = {k: v for k, v in os.environ.items() if k != 'STIP_WORKER'}
        result = subprocess.run([os.sys.executable, str(SCRIPT), '--root', str(self.root), *args],
                                input=stdin, capture_output=True, text=True, env={**environment, **(env or {})})
        if ok:
            self.assertEqual(result.returncode, 0, result.stderr)
            return json.loads(result.stdout)
        self.assertEqual(result.returncode, 1, result.stdout)
        self.assertEqual(result.stdout, '')
        return json.loads(result.stderr)

    def rt(self, *args, ok=True, stdin=None):
        return self.run_cli('runtime', *args, ok=ok, stdin=stdin)

    def refused(self, fragment, *args):
        error = self.rt(*args, ok=False)
        self.assertIn(fragment, error['error'])
        return error

    def start(self, approve=True, start=True):
        self.run_cli('plan', 'sample', '--file', '-', stdin=json.dumps(self.plan))
        if approve:
            self.run_cli('validate', 'sample')
            self.run_cli('approve', 'sample', '--by', 'user', '--ack-user-approval')
        if start:
            self.run_cli('start', 'sample')

    def launch(self, task, *options, status='returned', result=None):
        job = self.rt('reserve', 'sample', '--task', task, *options)['job']
        self.rt('confirm', 'sample', '--task', task, '--attempt', str(job['attempt']), '--session', job.get('session_id') or 'session-' + task)
        if status:
            args = ['settle', 'sample', '--task', task, '--attempt', str(job['attempt']), '--status', status]
            if result is not None:
                args += ['--result-file', '-']
            self.rt(*args, stdin=result)
        return job

    def accept(self, task, *options):
        job = self.launch(task, *options)
        self.rt('review', 'sample', '--task', task, '--decision', 'accepted', '--reason', 'Inspected the contribution.')
        return job

    def state(self):
        return json.loads(self.registry.read_text())

    def set_phase(self, phase):
        path = self.change / 'state.json'
        value = json.loads(path.read_text())
        value['phase'] = phase
        path.write_text(json.dumps(value))

    def test_help_documents_every_action(self):
        for action in ('show', 'reserve', 'confirm', 'settle', 'review', 'integrate', 'cancel'):
            with self.subTest(action=action):
                result = subprocess.run([os.sys.executable, str(SCRIPT), 'runtime', action, '--help'], capture_output=True, text=True)
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertIn('usage:', result.stdout)

    def test_reserve_gates(self):
        self.refused('execution plan', 'reserve', 'sample', '--task', 'implement')
        self.start(approve=False, start=False)
        self.refused('approval', 'reserve', 'sample', '--task', 'implement')
        self.run_cli('validate', 'sample')
        self.run_cli('approve', 'sample', '--by', 'user', '--ack-user-approval')
        self.refused('lifecycle phase', 'reserve', 'sample', '--task', 'implement')
        self.run_cli('start', 'sample')
        self.assertFalse(self.registry.exists())
        self.refused('not in the approved', 'reserve', 'sample', '--task', 'unplanned')
        self.refused('lifecycle phase', 'reserve', 'sample', '--task', 'document')
        self.refused('Dependency implement', 'reserve', 'sample', '--task', 'verify')
        self.refused('max_workers', 'reserve', 'sample', '--task', 'implement', '--max-workers', '9')
        self.refused('Invalid host', 'reserve', 'sample', '--task', 'implement', '--host', 'Bad Host')
        job = self.rt('reserve', 'sample', '--task', 'implement', '--host', 'claude-code',
                      '--profile-json', '{"model": "inherit"}')['job']
        self.assertEqual((job['status'], job['acceptance'], job['attempt'], job['launch_confirmed'], job['session_id']),
                         ('starting', 'pending', 1, False, None))
        self.assertEqual((job['host'], job['profile'], job['isolated']), ('claude-code', {'model': 'inherit'}, False))
        self.refused('active or unknown', 'reserve', 'sample', '--task', 'implement')
        self.rt('confirm', 'sample', '--task', 'implement', '--attempt', '1', '--session', 's-impl')
        self.rt('settle', 'sample', '--task', 'implement', '--attempt', '1', '--status', 'returned')
        self.refused('Review the returned', 'reserve', 'sample', '--task', 'implement')
        self.rt('review', 'sample', '--task', 'implement', '--decision', 'accepted', '--reason', 'Inspected the diff.')
        self.refused('--correction', 'reserve', 'sample', '--task', 'implement')
        self.refused('Dependency implement-lib', 'reserve', 'sample', '--task', 'verify')
        self.accept('implement-lib')
        self.refused('Isolation applies only', 'reserve', 'sample', '--task', 'verify', '--isolate')
        self.rt('reserve', 'sample', '--task', 'verify')
        # Approval goes stale when the contract changes.
        (self.change / 'spec.md').write_text('# Feature\n\n- AC-1: Return another value.\n')
        self.refused('approval', 'reserve', 'sample', '--task', 'implement', '--correction')

    def test_check_and_docs_tasks_need_accepted_predecessors(self):
        self.start()
        self.accept('implement')
        self.accept('implement-lib')
        self.set_phase('checked')
        self.refused('lifecycle phase', 'reserve', 'sample', '--task', 'verify')
        self.refused('Dependency verify', 'reserve', 'sample', '--task', 'document')
        self.set_phase('applying')
        self.launch('verify')
        self.set_phase('checked')
        self.refused('Dependency verify', 'reserve', 'sample', '--task', 'document')
        self.rt('review', 'sample', '--task', 'verify', '--decision', 'accepted', '--reason', 'Observed evidence.')
        self.assertEqual(self.rt('show', 'sample')['ready'], ['document'])
        self.rt('reserve', 'sample', '--task', 'document')

    def test_max_workers_counts_other_changes_and_helpers(self):
        self.start()
        other = self.root / '.workflow/.runtime/other/state.json'
        other.parent.mkdir(parents=True)
        other.write_text(json.dumps({'version': 1, 'change_id': 'other', 'contract_digest': 'x', 'jobs': [
            {'task_id': 'elsewhere', 'attempt': 1, 'status': 'running', 'acceptance': 'pending', 'session_id': 'ses_other', 'write_paths': []}]}))
        helper = self.rt('reserve', '-', '--helper', 'research', '--question', 'Which API applies?', '--max-workers', '3')['job']
        self.assertEqual((helper['kind'], helper['status'], helper['write_paths']), ('helper', 'starting', []))
        self.refused('Worker limit', 'reserve', 'sample', '--task', 'implement')
        self.refused('Worker limit', 'reserve', '-', '--helper', 'research')
        self.rt('reserve', 'sample', '--task', 'implement', '--max-workers', '3')
        self.refused('Worker limit', 'reserve', 'sample', '--task', 'implement-lib', '--isolate', '--max-workers', '3', '--max-shared-writers', '2')
        show = self.rt('show', 'sample')
        self.assertEqual(show['active'], {'change': 1, 'helpers': 1, 'total': 3, 'writers': 1})
        # Helpers follow the same confirm/settle/cancel lifecycle in their own registry.
        hid = helper['helper_id']
        self.rt('confirm', '-', '--helper', hid, '--session', 'helper-session')
        self.refused('unrelated task', 'confirm', 'sample', '--task', 'implement', '--attempt', '1', '--session', 'helper-session')
        settled = self.rt('settle', '-', '--helper', hid, '--status', 'returned', '--result-file', '-', stdin='Answer.')['job']
        self.assertEqual(settled['status'], 'returned')
        self.assertEqual((self.root / settled['result_path']).read_text(), 'Answer.')
        self.assertNotIn(hid, (self.root / '.workflow/.runtime/helpers.json').read_text() if (self.root / '.workflow/.runtime/helpers.json').exists() else '')
        self.rt('reserve', 'sample', '--task', 'implement-lib', '--isolate', '--max-workers', '3', '--max-shared-writers', '2')

    def test_config_defaults_set_limits(self):
        config = json.loads((self.root / '.workflow/config.json').read_text())
        config['orchestration'] = {'version': 1, 'defaults': {'max_workers': 1}}
        (self.root / '.workflow/config.json').write_text(json.dumps(config))
        self.start()
        self.rt('reserve', 'sample', '--task', 'implement')
        self.refused('Worker limit reached (1/1', 'reserve', '-', '--helper', 'research')
        self.assertEqual(self.rt('show', 'sample')['limits'], {'max_workers': 1, 'max_shared_writers': 1})

    def test_writer_limits_with_and_without_isolation(self):
        self.start()
        self.rt('reserve', 'sample', '--task', 'implement')
        self.refused('writer slot', 'reserve', 'sample', '--task', 'implement-lib')
        self.refused('Writer limit', 'reserve', 'sample', '--task', 'implement-lib', '--isolate')
        job = self.rt('reserve', 'sample', '--task', 'implement-lib', '--isolate', '--max-shared-writers', '2')
        self.assertTrue(job['job']['isolated'])
        self.assertTrue(Path(job['cwd']).is_dir())
        self.rt('cancel', 'sample', '--task', 'implement')
        self.refused('Writer limit', 'reserve', 'sample', '--task', 'implement')
        self.rt('reserve', 'sample', '--task', 'implement', '--max-shared-writers', '2')

    def test_confirm_settle_review_transitions(self):
        self.start()
        self.rt('reserve', 'sample', '--task', 'implement')
        self.refused('Confirm the native session', 'settle', 'sample', '--task', 'implement', '--attempt', '1', '--status', 'running')
        self.refused('--attempt is required', 'confirm', 'sample', '--task', 'implement', '--session', 's1')
        self.refused('not the latest', 'confirm', 'sample', '--task', 'implement', '--attempt', '2', '--session', 's1')
        job = self.rt('confirm', 'sample', '--task', 'implement', '--attempt', '1', '--session', 's1', '--model', 'opus')['job']
        self.assertEqual((job['status'], job['launch_confirmed'], job['session_id'], job['actual_model']), ('running', True, 's1', 'opus'))
        self.refused('starting or unresolved', 'confirm', 'sample', '--task', 'implement', '--attempt', '1', '--session', 's1')
        self.refused('returned', 'review', 'sample', '--task', 'implement', '--decision', 'accepted', '--reason', 'Inspected it.')
        job = self.rt('settle', 'sample', '--task', 'implement', '--attempt', '1', '--status', 'waiting', '--last-tool', 'Edit')['job']
        self.assertEqual((job['status'], job['last_tool']), ('waiting', 'Edit'))
        job = self.rt('settle', 'sample', '--task', 'implement', '--attempt', '1', '--status', 'returned')['job']
        self.assertIn('finished_at', job)
        self.refused('cannot change state', 'settle', 'sample', '--task', 'implement', '--attempt', '1', '--status', 'running')
        self.refused('8 characters', 'review', 'sample', '--task', 'implement', '--decision', 'accepted', '--reason', 'ok')
        job = self.rt('review', 'sample', '--task', 'implement', '--decision', 'rejected', '--reason', 'Missing a test.')['job']
        self.assertEqual((job['acceptance'], job['review']['decision']), ('rejected', 'rejected'))
        self.refused('already reviewed', 'review', 'sample', '--task', 'implement', '--decision', 'accepted', '--reason', 'Changed my mind.')
        self.refused('cannot change state', 'settle', 'sample', '--task', 'implement', '--attempt', '1', '--status', 'returned')
        # A failed launch is recorded without a session and frees the task for a retry.
        retry = self.rt('reserve', 'sample', '--task', 'implement')['job']
        self.assertEqual((retry['attempt'], retry['session_id']), (2, None))
        failed = self.rt('settle', 'sample', '--task', 'implement', '--attempt', '2', '--status', 'failed', '--error', 'spawn failed')['job']
        self.assertEqual((failed['status'], failed['error']), ('failed', 'spawn failed'))
        self.run_cli('status', 'sample')  # The engine's own registry validation accepts these records.

    def test_correction_rejects_dependants_and_reuses_session(self):
        self.start()
        self.accept('implement')
        self.accept('implement-lib')
        self.launch('verify')
        self.rt('review', 'sample', '--task', 'verify', '--decision', 'accepted', '--reason', 'Observed evidence.')
        job = self.rt('reserve', 'sample', '--task', 'implement', '--correction')['job']
        self.assertEqual((job['attempt'], job['session_id'], job['status']), (2, 'session-implement', 'starting'))
        acceptance = {(j['task_id'], j['attempt']): j['acceptance'] for j in self.state()['jobs']}
        self.assertEqual(acceptance[('implement', 1)], 'rejected')
        self.assertEqual(acceptance[('verify', 1)], 'rejected')
        self.assertEqual(acceptance[('implement-lib', 1)], 'accepted')
        self.rt('confirm', 'sample', '--task', 'implement', '--attempt', '2', '--session', 'session-implement')
        self.refused('Dependency implement', 'reserve', 'sample', '--task', 'verify')
        self.run_cli('status', 'sample')

    def test_result_capture_is_bounded(self):
        self.start()
        self.launch('implement', result='x' * (70 * 1024))
        job = self.state()['jobs'][0]
        self.assertTrue(job['result_truncated'])
        self.assertEqual(job['result_bytes'], 70 * 1024)
        self.assertEqual(job['result_path'], '.workflow/.runtime/sample/results/implement-1.md')
        text = (self.root / job['result_path']).read_text()
        self.assertLess(len(text.encode()), 64 * 1024 + 100)
        self.assertIn('[truncated by Stip: 6144 bytes omitted]', text)
        show = self.rt('show', 'sample', '--task', 'implement')
        self.assertEqual(show['result'], text)
        self.assertEqual(show['awaiting_review'], ['implement'])
        self.assertEqual(show['ready'], ['implement-lib'])

    def isolated(self):
        self.start()
        (self.root / 'app.py').write_text('value = 2  # uncommitted\n')
        (self.root / 'lib/new.py').write_text('new = 1\n')
        (self.root / 'notes.txt').write_text('private notes\n')
        result = self.rt('reserve', 'sample', '--task', 'implement-lib', '--isolate')
        return Path(result['cwd']), result['job']

    def test_isolate_snapshots_uncommitted_tracked_and_owned_untracked_files(self):
        wt, job = self.isolated()
        self.assertEqual(wt, self.root / '.workflow/.runtime/sample/worktrees/implement-lib-1')
        self.assertEqual((wt / 'app.py').read_text(), 'value = 2  # uncommitted\n')
        self.assertEqual((wt / 'lib/new.py').read_text(), 'new = 1\n')
        self.assertTrue((wt / '.workflow/changes/sample/spec.md').is_file())
        self.assertFalse((wt / 'notes.txt').exists())
        self.assertEqual(set(job['base']), {'lib/a.py', 'lib/new.py'})
        self.assertNotEqual(job['base_commit'], self.git('rev-parse', 'HEAD').strip())
        self.assertEqual(self.git('stash', 'list'), '')
        self.assertEqual((self.root / 'app.py').read_text(), 'value = 2  # uncommitted\n')
        # Worktree contents (including symlinks) are excluded from the workflow lock scan.
        os.symlink('a.py', wt / 'lib/link.py')
        self.rt('confirm', 'sample', '--task', 'implement-lib', '--attempt', '1', '--session', 's-lib')
        self.run_cli('snapshot')

    def returned(self, wt):
        self.rt('confirm', 'sample', '--task', 'implement-lib', '--attempt', '1', '--session', 's-lib')
        self.rt('settle', 'sample', '--task', 'implement-lib', '--attempt', '1', '--status', 'returned')
        self.rt('review', 'sample', '--task', 'implement-lib', '--decision', 'accepted', '--reason', 'Inspected the worktree.')

    def test_integrate_applies_owned_changes_and_removes_worktree(self):
        wt, _ = self.isolated()
        (wt / 'lib/a.py').write_text('a = 2\n')
        (wt / 'lib/sub').mkdir()
        (wt / 'lib/sub/b.py').write_text('b = 1\n')
        os.chmod(wt / 'lib/sub/b.py', 0o755)
        (wt / 'lib/new.py').unlink()
        self.returned(wt)
        self.refused('No worker record', 'integrate', 'sample', '--task', 'implement')
        self.assertEqual(self.rt('show', 'sample')['awaiting_integration'], ['implement-lib'])
        result = self.rt('integrate', 'sample', '--task', 'implement-lib')
        self.assertEqual((result['written'], result['deleted']), (['lib/a.py', 'lib/sub/b.py'], ['lib/new.py']))
        self.assertEqual((self.root / 'lib/a.py').read_text(), 'a = 2\n')
        self.assertTrue(os.access(self.root / 'lib/sub/b.py', os.X_OK))
        self.assertFalse((self.root / 'lib/new.py').exists())
        self.assertFalse(wt.exists())
        self.assertNotIn(str(wt), self.git('worktree', 'list'))
        job = self.state()['jobs'][0]
        self.assertTrue(job['integrated'] and job['worktree_removed'])
        self.refused('already integrated', 'integrate', 'sample', '--task', 'implement-lib')
        self.assertEqual(self.rt('show', 'sample')['awaiting_integration'], [])

    def test_isolation_works_when_runtime_is_not_ignored(self):
        (self.root / '.gitignore').write_text('')
        self.git('commit', '-qam', 'stop ignoring runtime')
        wt, job = self.isolated()
        self.assertEqual(set(job['base']), {'lib/a.py', 'lib/new.py'})
        (wt / 'lib/a.py').write_text('a = 2\n')
        self.returned(wt)
        self.assertEqual(self.rt('integrate', 'sample', '--task', 'implement-lib')['written'], ['lib/a.py'])
        self.assertNotIn('.workflow', ''.join(self.run_cli('snapshot')['files']))

    def test_integrate_reports_gitignored_output_without_integrating_it(self):
        (self.root / '.gitignore').write_text('.workflow/.runtime/\n.workflow/.lock\n*.log\n')
        self.git('commit', '-qam', 'ignore logs')
        wt, _ = self.isolated()
        (wt / 'lib/a.py').write_text('a = 2\n')
        (wt / 'lib/out.log').write_text('build output\n')
        (wt / 'outside.log').write_text('not owned\n')
        self.returned(wt)
        result = self.rt('integrate', 'sample', '--task', 'implement-lib')
        self.assertEqual(result['written'], ['lib/a.py'])
        self.assertEqual(result['skipped'], [{'path': 'lib/out.log', 'reason': 'gitignored'}])
        self.assertEqual(self.state()['jobs'][0]['integration']['skipped'], result['skipped'])
        self.assertFalse((self.root / 'lib/out.log').exists())

    def test_worker_marker_refuses_every_mutation_before_locking(self):
        self.start()
        self.rt('reserve', 'sample', '--task', 'implement')
        before = (self.registry.read_bytes(), (self.change / 'state.json').read_bytes())
        worker = {'STIP_WORKER': '1'}
        plan = json.dumps(self.plan)
        mutations = [('bootstrap',), ('explore', 'other'), ('select', 'sample'), ('validate', 'sample'),
                     ('approve', 'sample', '--by', 'user', '--ack-user-approval'), ('start', 'sample'),
                     ('plan', 'sample', '--file', '-'), ('check', 'sample', '--results', '-'),
                     ('docs', 'sample', '--summary', 'x'), ('archive', 'sample', '--message', 'x'),
                     ('runtime', 'reserve', 'sample', '--task', 'implement-lib'),
                     ('runtime', 'reserve', '-', '--helper', 'research'),
                     ('runtime', 'confirm', 'sample', '--task', 'implement', '--attempt', '1', '--session', 's'),
                     ('runtime', 'settle', 'sample', '--task', 'implement', '--attempt', '1', '--status', 'failed'),
                     ('runtime', 'review', 'sample', '--task', 'implement', '--decision', 'accepted', '--reason', 'Self approval.'),
                     ('runtime', 'integrate', 'sample', '--task', 'implement'),
                     ('runtime', 'cancel', 'sample', '--task', 'implement'),
                     ('runtime', 'revoke-approval', 'sample', '--reason', 'Worker attempt', '--force-phase')]
        (self.root / '.workflow/.lock').write_text('held')  # A refusal must not depend on (or touch) the lock.
        for args in mutations:
            with self.subTest(args=args):
                self.assertIn('STIP_WORKER', self.run_cli(*args, ok=False, stdin=plan, env=worker)['error'])
        self.assertEqual((self.root / '.workflow/.lock').read_text(), 'held')
        (self.root / '.workflow/.lock').unlink()
        self.assertEqual((self.registry.read_bytes(), (self.change / 'state.json').read_bytes()), before)
        self.assertFalse((self.root / '.workflow/changes/other').exists())
        for args in [('status', 'sample'), ('plan', 'sample'), ('snapshot',), ('extensions',),
                     ('runtime', 'show', 'sample', '--task', 'implement')]:
            with self.subTest(args=args):
                self.run_cli(*args, env=worker)
        self.run_cli('runtime', 'cancel', 'sample', '--task', 'implement', env={'STIP_WORKER': ''})

    def test_revoke_approval(self):
        self.start(approve=False, start=False)
        self.refused('no approval', 'revoke-approval', 'sample', '--reason', 'Nothing yet')
        self.run_cli('validate', 'sample')
        self.run_cli('approve', 'sample', '--by', 'user', '--ack-user-approval')
        digest = self.run_cli('status', 'sample', '--compact')['contract_digest']
        result = self.rt('revoke-approval', 'sample', '--reason', 'User withdrew approval')
        self.assertEqual(result['phase'], 'draft')
        self.assertEqual((result['approval_revoked']['digest'], result['approval_revoked']['reason']), (digest, 'User withdrew approval'))
        state = json.loads((self.change / 'state.json').read_text())
        self.assertNotIn('approval', state)
        self.assertEqual(state['approval_revoked'], result['approval_revoked'])
        self.assertFalse(self.run_cli('status', 'sample')['approval_current'])
        self.refused('approval', 'reserve', 'sample', '--task', 'implement')
        # From applying, revocation needs --force-phase and keeps the source baseline.
        self.run_cli('approve', 'sample', '--by', 'user', '--ack-user-approval')
        self.run_cli('start', 'sample')
        baseline = json.loads((self.change / 'state.json').read_text())['baseline']
        self.refused('--force-phase', 'revoke-approval', 'sample', '--reason', 'Scope changed')
        self.assertEqual(self.rt('revoke-approval', 'sample', '--reason', 'Scope changed', '--force-phase')['phase'], 'draft')
        state = json.loads((self.change / 'state.json').read_text())
        self.assertEqual((state['phase'], state['baseline'], state['approval_revoked']['phase']), ('draft', baseline, 'applying'))
        self.assertIn('Approval is required', self.run_cli('start', 'sample', ok=False)['error'])

    def test_rebase_after_reapproval_mid_apply(self):
        self.start()
        self.accept('implement')
        self.rt('reserve', 'sample', '--task', 'implement-lib')
        old = self.state()['contract_digest']
        (self.change / 'proposal.md').write_text('# Revised\n\nClarified scope.\n')
        self.run_cli('validate', 'sample')
        self.refused('approval', 'rebase', 'sample')
        self.run_cli('approve', 'sample', '--by', 'user', '--ack-user-approval')
        self.run_cli('start', 'sample')
        self.refused('another contract', 'reserve', 'sample', '--task', 'verify')
        self.assertFalse(self.rt('show', 'sample')['registry_current'])
        self.refused('active', 'rebase', 'sample')
        self.assertIn('STIP_WORKER', self.run_cli('runtime', 'rebase', 'sample', ok=False, env={'STIP_WORKER': '1'})['error'])
        self.rt('cancel', 'sample', '--task', 'implement-lib')
        self.assertEqual(self.state()['contract_digest'], old)
        result = self.rt('rebase', 'sample', '--reason', 'Proposal clarified and re-approved')
        current = self.run_cli('status', 'sample', '--compact')['contract_digest']
        self.assertEqual((result['changed'], result['contract_digest'], result['rebase']['from']), (True, current, old))
        state = self.state()
        self.assertEqual(state['rebases'], [result['rebase']])
        self.assertEqual({(j['task_id'], j['status'], j['acceptance']) for j in state['jobs']},
                         {('implement', 'returned', 'accepted'), ('implement-lib', 'cancelled', 'pending')})
        self.assertTrue(self.rt('show', 'sample')['registry_current'])
        again = self.rt('rebase', 'sample')
        self.assertEqual((again['changed'], len(self.state()['rebases'])), (False, 1))
        self.refused('Dependency implement-lib', 'reserve', 'sample', '--task', 'verify')
        self.accept('implement-lib')
        self.launch('verify')
        self.rt('review', 'sample', '--task', 'verify', '--decision', 'accepted', '--reason', 'Observed evidence.')
        report = {'subject_digest': self.run_cli('snapshot')['subject_digest'],
                  'criteria': [{'id': 'AC-1', 'status': 'passed', 'evidence': 'Observed.'}]}
        self.assertTrue(self.run_cli('check', 'sample', '--results', '-', stdin=json.dumps(report))['all_passed'])

    def revise(self, plan):
        self.run_cli('plan', 'sample', '--file', '-', stdin=json.dumps(plan))
        self.run_cli('validate', 'sample')
        self.run_cli('approve', 'sample', '--by', 'user', '--ack-user-approval')
        self.run_cli('start', 'sample')

    def test_rebase_retires_removed_and_renamed_tasks(self):
        self.start()
        self.accept('implement')
        self.accept('implement-lib')
        plan = json.loads(json.dumps(self.plan))
        plan['tasks'][1]['id'] = 'library'
        plan['tasks'][2]['depends_on'] = ['implement', 'library']
        self.revise(plan)
        show = self.rt('show', 'sample')
        self.assertEqual((show['registry_current'], show['orphan_tasks']), (False, ['implement-lib']))
        self.assertEqual(sorted(show['latest']), ['implement'])
        self.refused('runtime rebase', 'reserve', 'sample', '--task', 'library')
        self.assertIn('error', self.run_cli('status', 'sample')['runtime'])
        # An active job of a removed task blocks the rebase.
        registry = self.state()
        registry['jobs'][1]['status'] = 'running'
        registry['jobs'][1]['acceptance'] = 'pending'
        self.registry.write_text(json.dumps(registry))
        self.refused('active', 'rebase', 'sample')
        registry['jobs'][1]['status'] = 'returned'
        registry['jobs'][1]['acceptance'] = 'accepted'
        self.registry.write_text(json.dumps(registry))
        result = self.rt('rebase', 'sample', '--reason', 'Task renamed')
        self.assertEqual((result['kept'], result['reopened'], result['retired']), (['implement'], [], ['implement-lib']))
        state = self.state()
        self.assertEqual([j['task_id'] for j in state['jobs']], ['implement'])
        retired = state['retired_jobs'][0]
        self.assertEqual((retired['task_id'], retired['acceptance'], retired['retired_reason']),
                         ('implement-lib', 'accepted', 'task removed from the revised contract'))
        self.assertIn('retired_at', retired)
        show = self.rt('show', 'sample')
        self.assertEqual((show['registry_current'], show['orphan_tasks'], show['ready']), (True, [], ['library']))
        self.assertNotIn('error', self.run_cli('status', 'sample')['runtime'])
        self.assertFalse(self.rt('rebase', 'sample')['changed'])
        self.accept('library')
        self.rt('reserve', 'sample', '--task', 'verify')
        # Removing a task outright behaves like a rename without a successor.
        self.rt('cancel', 'sample', '--task', 'verify')
        plan['tasks'] = [t for t in plan['tasks'] if t['id'] != 'document']
        plan['tasks'][2]['criteria'] = ['AC-1']
        self.revise(plan)
        self.assertEqual(self.rt('rebase', 'sample')['retired'], [])
        plan['tasks'] = [t for t in plan['tasks'] if t['id'] != 'verify']
        self.revise(plan)
        self.assertEqual(self.rt('show', 'sample')['orphan_tasks'], ['verify'])
        self.assertEqual(self.rt('rebase', 'sample')['retired'], ['verify'])
        self.assertEqual(sorted(j['task_id'] for j in self.state()['retired_jobs']), ['implement-lib', 'verify'])

    def test_rebase_reopens_changed_tasks_and_their_dependants(self):
        self.start()
        self.accept('implement')
        self.accept('implement-lib')
        self.launch('verify')
        self.rt('review', 'sample', '--task', 'verify', '--decision', 'accepted', '--reason', 'Observed evidence.')
        plan = json.loads(json.dumps(self.plan))
        plan['tasks'][1]['objective'] = 'Extend the library with validation.'
        self.revise(plan)
        result = self.rt('rebase', 'sample')
        self.assertEqual((result['kept'], result['reopened'], result['retired']), (['implement'], ['implement-lib', 'verify'], []))
        latest = {j['task_id']: j for j in self.state()['jobs']}
        self.assertEqual(latest['implement']['acceptance'], 'accepted')
        self.assertEqual((latest['implement-lib']['acceptance'], latest['implement-lib']['review']['reason']),
                         ('rejected', 'task changed in revised contract'))
        self.assertEqual(latest['implement-lib']['superseded_review']['decision'], 'accepted')
        self.assertEqual((latest['verify']['acceptance'], latest['verify']['review']['reason']), ('rejected', 'dependency changed'))
        self.assertEqual(self.rt('show', 'sample')['ready'], ['implement-lib'])
        self.refused('Dependency implement-lib', 'reserve', 'sample', '--task', 'verify')
        job = self.rt('reserve', 'sample', '--task', 'implement-lib')['job']
        self.assertEqual((job['attempt'], job['objective']), (2, 'Extend the library with validation.'))

    def test_adding_a_criterion_mid_apply_reopens_covering_tasks(self):
        self.start()
        self.accept('implement')
        self.accept('implement-lib')
        (self.change / 'spec.md').write_text('# Feature\n\n- AC-1: Return the requested value.\n- AC-2: Validate the input.\n')
        self.assertEqual(self.rt('show', 'sample', ok=False)['error'], 'Task plan must cover every acceptance criterion.')
        plan = json.loads(json.dumps(self.plan))
        plan['tasks'][1]['criteria'] = ['AC-1', 'AC-2']
        plan['tasks'][2]['criteria'] = ['AC-1', 'AC-2']
        self.revise(plan)
        self.assertFalse(self.rt('show', 'sample')['registry_current'])
        result = self.rt('rebase', 'sample')
        self.assertEqual((result['kept'], result['reopened']), (['implement'], ['implement-lib']))
        self.assertEqual(self.rt('show', 'sample')['ready'], ['implement-lib'])

    def test_removing_a_criterion_mid_apply_reopens_tasks_that_referenced_it(self):
        (self.change / 'spec.md').write_text('# Feature\n\n- AC-1: Return the requested value.\n- AC-2: Validate the input.\n')
        self.plan['tasks'][1]['criteria'] = ['AC-1', 'AC-2']
        self.start()
        self.accept('implement')
        self.accept('implement-lib')
        self.launch('verify')
        self.rt('review', 'sample', '--task', 'verify', '--decision', 'accepted', '--reason', 'Observed evidence.')
        (self.change / 'spec.md').write_text('# Feature\n\n- AC-1: Return the requested value.\n')
        plan = json.loads(json.dumps(self.plan))
        plan['tasks'][1]['criteria'] = ['AC-1']
        self.revise(plan)
        result = self.rt('rebase', 'sample')
        self.assertEqual((result['kept'], result['reopened'], result['retired']), (['implement'], ['implement-lib', 'verify'], []))
        reasons = {j['task_id']: j['review']['reason'] for j in self.state()['jobs']}
        self.assertEqual((reasons['implement-lib'], reasons['verify']), ('task changed in revised contract', 'dependency changed'))

    def test_integrate_skips_python_cache_artefacts(self):
        wt, _ = self.isolated()
        (wt / 'lib/a.py').write_text('a = 2\n')
        for name in ('lib/__pycache__/a.cpython-311.pyc', '__pycache__/x.cpython-311.pyc', '.pytest_cache/v/cache/nodeids'):
            (wt / name).parent.mkdir(parents=True, exist_ok=True)
            (wt / name).write_bytes(b'cache')
        self.returned(wt)
        (wt / '__pycache__/notes.txt').write_text('not a cache file\n')
        error = self.refused('nothing was written', 'integrate', 'sample', '--task', 'implement-lib')
        self.assertEqual(error['conflicts'], [{'path': '__pycache__/notes.txt', 'reason': 'Changed outside the task write_paths.', 'untracked': True}])
        (wt / '__pycache__/notes.txt').unlink()
        result = self.rt('integrate', 'sample', '--task', 'implement-lib')
        self.assertEqual(result['written'], ['lib/a.py'])
        self.assertEqual(result['skipped'], [{'path': '.pytest_cache/v/cache/nodeids', 'reason': 'build artefact'},
                                             {'path': '__pycache__/x.cpython-311.pyc', 'reason': 'build artefact'},
                                             {'path': 'lib/__pycache__/a.cpython-311.pyc', 'reason': 'build artefact'}])
        self.assertFalse((self.root / 'lib/__pycache__').exists())

    def test_rebase_requires_a_registry(self):
        self.start()
        self.refused('No worker registry', 'rebase', 'sample')

    def test_integrate_conflict_when_main_changed_writes_nothing(self):
        wt, _ = self.isolated()
        (wt / 'lib/a.py').write_text('a = 2\n')
        (wt / 'lib/b.py').write_text('b = 1\n')
        self.returned(wt)
        (self.root / 'lib/a.py').write_text('a = 3  # user edit\n')
        error = self.refused('nothing was written', 'integrate', 'sample', '--task', 'implement-lib')
        self.assertEqual([c['path'] for c in error['conflicts']], ['lib/a.py'])
        self.assertEqual((self.root / 'lib/a.py').read_text(), 'a = 3  # user edit\n')
        self.assertFalse((self.root / 'lib/b.py').exists())
        self.assertTrue(wt.exists())
        self.assertNotIn('integrated_at', self.state()['jobs'][0])

    def test_integrate_refuses_changes_outside_ownership(self):
        wt, _ = self.isolated()
        (wt / 'lib/a.py').write_text('a = 2\n')
        (wt / 'app.py').write_text('value = 99\n')
        (wt / '.workflow/changes/sample/spec.md').write_text('tampered\n')
        (wt / 'stray.txt').write_text('artefact\n')
        subprocess.run(['git', '-C', str(wt), 'commit', '-qam', 'worker commit'], capture_output=True)
        self.returned(wt)
        error = self.refused('nothing was written', 'integrate', 'sample', '--task', 'implement-lib')
        conflicts = {c['path']: c.get('untracked', False) for c in error['conflicts']}
        self.assertEqual(conflicts, {'app.py': False, '.workflow/changes/sample/spec.md': True, 'stray.txt': True})
        self.assertEqual((self.root / 'lib/a.py').read_text(), 'a = 1\n')
        self.assertEqual((self.root / 'app.py').read_text(), 'value = 2  # uncommitted\n')

    def test_integrate_refuses_overlapping_shared_writer(self):
        wt, _ = self.isolated()
        (wt / 'lib/a.py').write_text('a = 2\n')
        self.returned(wt)
        jobs = self.state()
        jobs['jobs'].append({'task_id': 'implement', 'attempt': 1, 'status': 'running', 'acceptance': 'pending',
                             'session_id': 's-app', 'write_paths': ['lib/a.py']})
        self.registry.write_text(json.dumps(jobs))
        error = self.refused('nothing was written', 'integrate', 'sample', '--task', 'implement-lib')
        self.assertIn('shared-checkout writer', error['conflicts'][0]['reason'])

    def test_rejection_keeps_worktree_for_correction_unless_discarded(self):
        wt, _ = self.isolated()
        (wt / 'lib/a.py').write_text('a = 2\n')
        self.rt('confirm', 'sample', '--task', 'implement-lib', '--attempt', '1', '--session', 's-lib')
        self.rt('settle', 'sample', '--task', 'implement-lib', '--attempt', '1', '--status', 'returned')
        self.rt('review', 'sample', '--task', 'implement-lib', '--decision', 'rejected', '--reason', 'Needs a test.')
        self.assertTrue(wt.exists())
        job = self.rt('reserve', 'sample', '--task', 'implement-lib', '--correction')['job']
        self.assertEqual((job['attempt'], job['worktree'], job['isolated'], job['session_id']),
                         (2, '.workflow/.runtime/sample/worktrees/implement-lib-1', True, 's-lib'))
        self.assertEqual((wt / 'lib/a.py').read_text(), 'a = 2\n')
        self.rt('confirm', 'sample', '--task', 'implement-lib', '--attempt', '2', '--session', 's-lib')
        self.rt('settle', 'sample', '--task', 'implement-lib', '--attempt', '2', '--status', 'returned')
        self.refused('only to a rejection', 'review', 'sample', '--task', 'implement-lib', '--decision', 'accepted', '--reason', 'Looks fine now.', '--discard')
        self.rt('review', 'sample', '--task', 'implement-lib', '--decision', 'rejected', '--reason', 'Abandon this approach.', '--discard')
        self.assertFalse(wt.exists())

    def test_cancel_removes_worktree(self):
        wt, _ = self.isolated()
        self.refused('No worker record', 'cancel', 'sample', '--task', 'implement')
        job = self.rt('cancel', 'sample', '--task', 'implement-lib', '--reason', 'User stopped it')['job']
        self.assertEqual((job['status'], job['stop_confirmed'], job['cancellation']['reason']), ('cancelled', False, 'User stopped it'))
        self.assertFalse(wt.exists())
        self.assertNotIn(str(wt), self.git('worktree', 'list'))
        self.refused('No active attempt', 'cancel', 'sample', '--task', 'implement-lib')
        job = self.rt('settle', 'sample', '--task', 'implement-lib', '--attempt', '1', '--status', 'cancelled')['job']
        self.assertTrue(job['stop_confirmed'])
        retry = self.rt('reserve', 'sample', '--task', 'implement-lib', '--isolate')['job']
        self.assertEqual(retry['worktree'], '.workflow/.runtime/sample/worktrees/implement-lib-2')

    def test_finalization_refuses_accepted_isolated_job_until_integrated(self):
        wt, _ = self.isolated()
        (wt / 'lib/a.py').write_text('a = 2\n')
        self.returned(wt)
        self.accept('implement')
        self.refused('Only an isolated', 'integrate', 'sample', '--task', 'implement')
        self.refused('Dependency implement-lib has not been accepted and integrated', 'reserve', 'sample', '--task', 'verify')
        registry = self.state()
        registry['jobs'].append({'task_id': 'verify', 'attempt': 1, 'status': 'returned', 'acceptance': 'accepted', 'session_id': 's-verify'})
        self.registry.write_text(json.dumps(registry))
        report = {'subject_digest': self.run_cli('snapshot')['subject_digest'],
                  'criteria': [{'id': 'AC-1', 'status': 'passed', 'evidence': 'Observed.'}]}
        error = self.run_cli('check', 'sample', '--results', '-', stdin=json.dumps(report), ok=False)
        self.assertIn('not integrated', error['error'])
        registry['jobs'].pop()
        self.registry.write_text(json.dumps(registry))
        self.rt('integrate', 'sample', '--task', 'implement-lib')
        self.launch('verify')
        self.rt('review', 'sample', '--task', 'verify', '--decision', 'accepted', '--reason', 'Observed evidence.')
        report['subject_digest'] = self.run_cli('snapshot')['subject_digest']
        self.assertTrue(self.run_cli('check', 'sample', '--results', '-', stdin=json.dumps(report))['all_passed'])

    def test_opencode_format_registries_remain_valid(self):
        self.start()
        digest = self.run_cli('status', 'sample', '--compact')['contract_digest']
        opencode = {'run_id': 'r1', 'task_id': 'implement', 'role': 'backend', 'phase': 'apply', 'objective': 'Return value 2.',
                    'write_paths': ['app.py'], 'read_paths': [], 'criteria': ['AC-1'], 'parent_id': 'ses_parent',
                    'session_id': 'ses_child', 'agent_id': 'stip-abc', 'attempt': 1, 'launch_confirmed': True,
                    'status': 'returned', 'acceptance': 'accepted', 'profile': {'model': 'inherit'},
                    'review': {'reason': 'Integrated.', 'at': '2026-10-07T00:00:00Z'},
                    'created_at': '2026-10-07T00:00:00Z', 'updated_at': '2026-10-07T00:00:00Z'}
        self.registry.parent.mkdir(parents=True)
        self.registry.write_text(json.dumps({'version': 1, 'change_id': 'sample', 'contract_digest': digest, 'jobs': [opencode]}))
        helpers = {'version': 1, 'jobs': [{'kind': 'helper', 'helper_id': 'helper-1', 'run_id': 'helper-1', 'task_id': 'helper-1',
                                          'phase': 'explore', 'role': 'research', 'write_paths': [], 'parent_id': 'ses_parent',
                                          'session_id': 'ses_helper', 'status': 'running', 'attempt': 1}]}
        (self.root / '.workflow/.runtime/helpers.json').write_text(json.dumps(helpers))
        show = self.rt('show', 'sample')
        self.assertEqual(show['latest']['implement']['session_id'], 'ses_child')
        self.assertEqual(show['active']['helpers'], 1)
        self.assertNotIn('implement', show['ready'])
        self.rt('reserve', 'sample', '--task', 'implement-lib')
        self.refused('Worker limit', 'reserve', 'sample', '--task', 'implement', '--correction')
        self.assertEqual(json.loads((self.root / '.workflow/.runtime/helpers.json').read_text()), helpers)
        self.assertNotIn('error', self.run_cli('status', 'sample', '--compact')['runtime'])


if __name__ == '__main__':
    unittest.main()
