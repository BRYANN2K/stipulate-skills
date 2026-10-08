"""AC-26: criteria covered only by docs-phase tasks may be checked as pending-docs, then must pass before docs/archive."""
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / 'scripts/workflow.py'


class DocsGateTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name).resolve() / 'project'
        self.root.mkdir()
        self.git('init', '-q')
        self.git('config', 'user.email', 'test@example.invalid')
        self.git('config', 'user.name', 'Docs Gate Test')
        (self.root / 'app.py').write_text('value = 1\n')
        self.run_cli('bootstrap')
        (self.root / '.gitignore').write_text('.workflow/.runtime/\n.workflow/.lock\n')
        self.git('add', '.')
        self.git('commit', '-qm', 'initial')
        self.run_cli('explore', 'sample')
        self.change = self.root / '.workflow/changes/sample'
        (self.change / 'spec.md').write_text('# Feature\n\n- AC-1: Return the value.\n- AC-2: The README explains the value.\n')
        self.plan = {'version': 1, 'tasks': [
            {'id': 'implement', 'role': 'backend', 'phase': 'apply', 'criteria': ['AC-1'],
             'depends_on': [], 'write_paths': ['app.py'], 'objective': 'Return value 2.'},
            {'id': 'verify', 'role': 'verification', 'phase': 'check', 'criteria': ['AC-1'],
             'depends_on': ['implement'], 'write_paths': [], 'objective': 'Exercise the value.'},
            {'id': 'document', 'role': 'documentation', 'phase': 'docs', 'criteria': ['AC-2'],
             'depends_on': ['verify'], 'write_paths': ['README.md'], 'objective': 'Explain the value.'},
        ]}

    def git(self, *args):
        result = subprocess.run(['git', '-C', str(self.root), *args], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        return result.stdout

    def raw(self, *args, stdin=None):
        environment = {k: v for k, v in os.environ.items() if k != 'STIP_WORKER'}
        return subprocess.run([os.sys.executable, str(SCRIPT), '--root', str(self.root), *args],
                              input=stdin, capture_output=True, text=True, env=environment)

    def run_cli(self, *args, ok=True, stdin=None):
        result = self.raw(*args, stdin=stdin)
        if ok:
            self.assertEqual(result.returncode, 0, result.stderr)
            return json.loads(result.stdout)
        self.assertEqual(result.returncode, 1, result.stdout)
        return json.loads(result.stderr)

    def start(self, change='sample', plan=None):
        if plan is not None:
            self.run_cli('plan', change, '--file', '-', stdin=json.dumps(plan))
        self.run_cli('validate', change)
        self.run_cli('approve', change, '--by', 'user', '--ack-user-approval')
        self.run_cli('start', change)

    def accept(self, task):
        job = self.run_cli('runtime', 'reserve', 'sample', '--task', task)['job']
        attempt = str(job['attempt'])
        self.run_cli('runtime', 'confirm', 'sample', '--task', task, '--attempt', attempt, '--session', 'session-' + task)
        self.run_cli('runtime', 'settle', 'sample', '--task', task, '--attempt', attempt, '--status', 'returned')
        self.run_cli('runtime', 'review', 'sample', '--task', task, '--decision', 'accepted', '--reason', 'Inspected the contribution.')

    def report(self, **statuses):
        return json.dumps({'subject_digest': self.run_cli('snapshot')['subject_digest'],
                           'criteria': [{'id': key.replace('_', '-'), 'status': value, 'evidence': 'Observed ' + key + '.'}
                                        for key, value in statuses.items()]})

    def check(self, change='sample', ok=True, **statuses):
        return self.run_cli('check', change, '--results', '-', stdin=self.report(**statuses), ok=ok)

    def phase(self, change='sample'):
        return json.loads((self.root / f'.workflow/changes/{change}/state.json').read_text())['phase']

    def implemented(self):
        self.start(plan=self.plan)
        (self.root / 'app.py').write_text('value = 2\n')
        self.accept('implement')
        self.accept('verify')

    def test_docs_only_criterion_can_be_pending_and_change_becomes_checked(self):
        self.implemented()
        result = self.check(AC_1='passed', AC_2='pending-docs')
        self.assertEqual((result['phase'], result['all_passed'], result['pending_docs']), ('checked', False, ['AC-2']))
        self.assertEqual(self.phase(), 'checked')
        evidence = (self.change / 'evidence.md').read_text()
        self.assertIn('- AC-1: passed — Observed AC_1.', evidence)
        self.assertIn('- AC-2: pending-docs — Observed AC_2.', evidence)

    def test_pending_docs_with_another_failure_stays_applying(self):
        self.implemented()
        result = self.raw('check', 'sample', '--results', '-', stdin=self.report(AC_1='failed', AC_2='pending-docs'))
        self.assertEqual(result.returncode, 2, result.stderr)
        self.assertEqual((json.loads(result.stdout)['phase'], self.phase()), ('applying', 'applying'))

    def test_pending_docs_refused_when_apply_or_check_task_covers_criterion(self):
        for phase in ('apply', 'check'):
            with self.subTest(phase=phase):
                plan = json.loads(json.dumps(self.plan))
                task = next(t for t in plan['tasks'] if t['phase'] == phase)
                task['criteria'] = ['AC-1', 'AC-2']
                (self.root / '.workflow/.runtime/sample/state.json').unlink(missing_ok=True)
                self.start(plan=plan)
                self.accept('implement')
                self.accept('verify')
                error = self.check(ok=False, AC_1='passed', AC_2='pending-docs')
                self.assertIn('pending-docs', error['error'])
                self.assertIn('AC-2', error['error'])
                self.assertEqual(self.phase(), 'applying')
        error = self.check(ok=False, AC_1='pending-docs', AC_2='passed')
        self.assertIn('AC-1', error['error'])

    def test_pending_docs_refused_for_v1_change(self):
        self.run_cli('explore', 'legacy')
        (self.root / '.workflow/changes/legacy/spec.md').write_text('# Legacy\n\n- AC-1: Documented behavior.\n')
        self.start('legacy')
        error = self.check('legacy', ok=False, AC_1='pending-docs')
        self.assertIn('pending-docs', error['error'])
        self.assertEqual(self.phase('legacy'), 'applying')
        self.assertEqual(self.check('legacy', AC_1='passed')['phase'], 'checked')

    def test_docs_and_archive_refused_while_pending_then_proceed_after_recheck(self):
        self.implemented()
        self.check(AC_1='passed', AC_2='pending-docs')
        # The docs-phase task is dispatchable in the checked phase despite pending criteria.
        job = self.run_cli('runtime', 'reserve', 'sample', '--task', 'document')['job']
        self.assertEqual(job['phase'], 'docs')
        self.run_cli('runtime', 'confirm', 'sample', '--task', 'document', '--attempt', '1', '--session', 'session-document')
        (self.root / 'README.md').write_text('# Value\n\nThe app returns 2.\n')
        self.run_cli('runtime', 'settle', 'sample', '--task', 'document', '--attempt', '1', '--status', 'returned')
        self.run_cli('runtime', 'review', 'sample', '--task', 'document', '--decision', 'accepted', '--reason', 'README explains it.')
        error = self.run_cli('docs', 'sample', '--summary', 'README', '--paths', 'README.md', ok=False)
        self.assertIn('pending-docs', error['error'])
        self.assertIn('AC-2', error['error'])
        self.assertIn('check', error['error'])
        self.assertEqual(self.phase(), 'checked')
        # Archive has its own gate, even if the phase were forced past docs.
        state_path = self.change / 'state.json'
        saved = state_path.read_text()
        forced = json.loads(saved)
        forced['phase'] = 'documented'
        state_path.write_text(json.dumps(forced))
        error = self.run_cli('archive', 'sample', '--message', 'Ship', '--paths', 'app.py', 'README.md', ok=False)
        self.assertIn('pending-docs', error['error'])
        state_path.write_text(saved)
        # Follow-up evidence: re-run check in the checked phase with the criterion now passed.
        result = self.check(AC_1='passed', AC_2='passed')
        self.assertEqual((result['phase'], result['all_passed'], result['pending_docs']), ('checked', True, []))
        self.assertIn('- AC-2: passed', (self.change / 'evidence.md').read_text())
        self.assertEqual(self.run_cli('docs', 'sample', '--summary', 'README explains the value.')['phase'], 'documented')
        archived = self.run_cli('archive', 'sample', '--message', 'Return value 2', '--paths', 'app.py', 'README.md')
        self.assertEqual(archived['phase'], 'archived')
        committed = set(self.git('show', '--name-only', '--format=', 'HEAD').split())
        self.assertTrue({'app.py', 'README.md'} <= committed)

    def test_docs_requires_accepted_docs_task_after_recheck(self):
        self.implemented()
        self.check(AC_1='passed', AC_2='pending-docs')
        (self.root / 'README.md').write_text('# Value\n')
        self.check(AC_1='passed', AC_2='passed')
        error = self.run_cli('docs', 'sample', '--summary', 'README', ok=False)
        self.assertIn('document', error['error'])
        self.assertEqual(self.phase(), 'checked')


if __name__ == '__main__':
    unittest.main()
