"""Contract and lifecycle regressions for opt-in native orchestration."""
import copy
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / 'scripts/workflow.py'


class OrchestrationWorkflowTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name).resolve()
        self.git('init', '-q')
        self.git('config', 'user.email', 'test@example.invalid')
        self.git('config', 'user.name', 'Orchestration Test')
        (self.root / 'app.py').write_text('value = 1\n')
        self.run_cli('bootstrap')
        self.git('add', '.')
        self.git('commit', '-qm', 'initial')
        self.run_cli('explore', 'sample')
        self.change = self.root / '.workflow/changes/sample'
        (self.change / 'spec.md').write_text('# Feature\n\n- AC-1: Return the requested value.\n')
        self.plan = {'version': 1, 'tasks': [
            {'id': 'implement', 'role': 'backend', 'phase': 'apply', 'criteria': ['AC-1'],
             'depends_on': [], 'write_paths': ['app.py'], 'objective': 'Return value 2.'},
            {'id': 'verify', 'role': 'verification', 'phase': 'check', 'criteria': ['AC-1'],
             'depends_on': ['implement'], 'write_paths': [], 'objective': 'Exercise the integrated value.'},
            {'id': 'document', 'role': 'documentation', 'phase': 'docs', 'criteria': ['AC-1'],
             'depends_on': ['verify'], 'write_paths': ['README.md'], 'objective': 'Explain the verified behavior.'},
        ]}
        self.registry = self.root / '.workflow/.runtime/sample/state.json'

    def git(self, *args):
        result = subprocess.run(['git', '-C', str(self.root), *args], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        return result.stdout

    def run_cli(self, *args, ok=True, stdin=None):
        result = subprocess.run([os.sys.executable, str(SCRIPT), '--root', str(self.root), *args],
                                input=stdin, capture_output=True, text=True)
        if ok:
            self.assertEqual(result.returncode, 0, result.stderr)
            return json.loads(result.stdout)
        self.assertNotEqual(result.returncode, 0, result.stdout)
        return result.stderr

    def install(self, value=None, *options, ok=True):
        return self.run_cli('plan', 'sample', '--file', '-', *options, ok=ok,
                            stdin=json.dumps(self.plan if value is None else value))

    def approve(self):
        self.run_cli('validate', 'sample')
        self.run_cli('approve', 'sample', '--by', 'user', '--ack-user-approval')

    def built(self):
        self.install()
        self.approve()
        self.run_cli('start', 'sample')
        (self.root / 'app.py').write_text('value = 2\n')

    def jobs(self, accepted=('implement', 'verify', 'document')):
        return [{'task_id': task['id'], 'session_id': 'session-' + task['id'], 'attempt': 1,
                 'status': 'returned', 'acceptance': 'accepted' if task['id'] in accepted else 'pending'}
                for task in self.plan['tasks']]

    def runtime(self, jobs=None, contract=None):
        value = {'version': 1, 'change_id': 'sample',
                 'contract_digest': contract or self.run_cli('status', 'sample', '--compact')['contract_digest'],
                 'jobs': self.jobs() if jobs is None else jobs}
        self.registry.parent.mkdir(parents=True, exist_ok=True)
        self.registry.write_text(json.dumps(value))
        return value

    def check(self, ok=True):
        report = {'subject_digest': self.run_cli('snapshot')['subject_digest'], 'criteria': [
            {'id': 'AC-1', 'status': 'passed', 'evidence': 'Observed fixture app.py value 2.'}]}
        return self.run_cli('check', 'sample', '--results', '-', stdin=json.dumps(report), ok=ok)

    def test_explicit_opt_in_and_compact_status(self):
        before = self.run_cli('status', 'sample')
        self.assertEqual(before['schema_version'], 1)
        self.install()
        self.approve()
        self.run_cli('start', 'sample')
        full = self.run_cli('status', 'sample')
        compact = self.run_cli('status', 'sample', '--compact')
        self.assertEqual(compact['schema_version'], 2)
        self.assertEqual(json.loads((self.root / '.workflow/config.json').read_text())['schema_version'], 1)
        self.assertIn('baseline', full)
        self.assertNotIn('baseline', compact)
        self.assertTrue(compact['approval_current'])
        self.assertEqual(len(compact['plan']['tasks']), 3)
        self.assertEqual(self.run_cli('plan', 'sample')['plan'], compact['plan'])

    def test_approved_v1_migration_is_explicit_and_preserves_baseline(self):
        self.approve()
        self.run_cli('start', 'sample')
        before = (self.change / 'state.json').read_bytes()
        self.assertIn('--migrate', self.install(ok=False))
        self.assertEqual((self.change / 'state.json').read_bytes(), before)
        self.assertFalse((self.change / 'execution-plan.json').exists())
        self.install(None, '--migrate')
        after = self.run_cli('status', 'sample')
        self.assertEqual(after['baseline'], json.loads(before)['baseline'])
        self.assertEqual(after['base_head'], json.loads(before)['base_head'])
        self.assertEqual(after['phase'], 'draft')
        self.assertNotIn('approval', after)
        self.run_cli('start', 'sample', ok=False)

    def test_v1_digest_and_lifecycle_remain_compatible(self):
        self.approve()
        state = self.run_cli('status', 'sample')
        legacy_contract = {'files': {name: (self.change / name).read_text()
                                    for name in ('proposal.md', 'spec.md')},
                           'target': 'sample', 'extensions': {}}
        legacy_digest = hashlib.sha256(json.dumps(legacy_contract, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
        self.assertEqual(state['approval']['contract_digest'], legacy_digest)
        self.run_cli('start', 'sample')
        (self.root / 'app.py').write_text('value = 2\n')
        self.check()
        self.run_cli('docs', 'sample', '--summary', 'No public documentation affected.')
        self.run_cli('archive', 'sample', '--paths', 'app.py', '--message', 'Legacy fixture')

    def test_plan_semantics_are_approval_bound_but_formatting_is_not(self):
        self.install()
        self.approve()
        path = self.change / 'execution-plan.json'
        data = json.loads(path.read_text())
        data['tasks'].reverse()
        path.write_text(json.dumps(data, separators=(',', ':')))
        self.assertTrue(self.run_cli('status', 'sample')['approval_current'])
        data['tasks'][0]['objective'] = 'A different responsibility.'
        path.write_text(json.dumps(data))
        self.assertFalse(self.run_cli('status', 'sample')['approval_current'])
        self.run_cli('start', 'sample', ok=False)

    def test_invalid_plans_preserve_draft(self):
        cases = []
        for key, value in [('id', 'bad/id'), ('role', 'discovery'), ('phase', 'explore'),
                           ('criteria', ['AC-99']), ('depends_on', ['missing']),
                           ('write_paths', ['../escape']), ('write_paths', ['.workflow/state.json']),
                           ('write_paths', ['.git/config']), ('write_paths', ['src/**']),
                           ('write_paths', ['.']), ('write_paths', ['/tmp/out'])]:
            plan = copy.deepcopy(self.plan)
            plan['tasks'][0][key] = value
            cases.append(plan)
        duplicate = copy.deepcopy(self.plan)
        duplicate['tasks'].append(copy.deepcopy(duplicate['tasks'][0]))
        cases.append(duplicate)
        cycle = copy.deepcopy(self.plan)
        cycle['tasks'][0]['depends_on'] = ['second']
        second = copy.deepcopy(cycle['tasks'][0])
        second.update(id='second', depends_on=['implement'], write_paths=['other.py'])
        cycle['tasks'].append(second)
        cases.append(cycle)
        backward = copy.deepcopy(self.plan)
        backward['tasks'][0]['depends_on'] = ['document']
        cases.append(backward)
        unknown_field = copy.deepcopy(self.plan)
        unknown_field['tasks'][0]['model'] = 'unapproved-inline-model'
        cases.append(unknown_field)
        before = (self.change / 'state.json').read_bytes()
        for candidate in cases:
            with self.subTest(candidate=candidate):
                self.install(candidate, ok=False)
                self.assertEqual((self.change / 'state.json').read_bytes(), before)
                self.assertFalse((self.change / 'execution-plan.json').exists())

    def test_plan_requires_criterion_coverage(self):
        (self.change / 'spec.md').write_text('- AC-1: One\n- AC-2: Two\n')
        self.assertIn('every acceptance criterion', self.install(ok=False))

    def test_path_prefix_conflicts_require_ordered_ownership(self):
        self.plan['tasks'][0]['write_paths'] = ['src']
        second = copy.deepcopy(self.plan['tasks'][0])
        second.update(id='other', write_paths=['src/file.py'])
        self.plan['tasks'].append(second)
        self.assertIn('overlapping', self.install(ok=False))
        second['depends_on'] = ['implement']
        self.install()
        second['depends_on'] = []
        second['write_paths'] = ['src-other/file.py']
        self.install()

    def test_symlink_scope_is_rejected(self):
        (self.root / 'link').symlink_to(self.root / 'app.py')
        self.plan['tasks'][0]['write_paths'] = ['link']
        self.assertIn('Symlink', self.install(ok=False))

    def test_missing_and_stale_registry_cannot_finalize(self):
        self.built()
        self.assertIn('runtime state is missing', self.check(ok=False))
        self.runtime(contract='another-contract')
        self.assertIn('different contract', self.check(ok=False))
        self.runtime()
        self.check()

    def test_active_or_unknown_worker_blocks_final_check(self):
        self.built()
        for state in ('starting', 'running', 'waiting', 'unknown', 'correction'):
            with self.subTest(state=state):
                jobs = self.jobs()
                jobs[2].update(status=state, acceptance='pending')
                self.runtime(jobs)
                self.assertIn('active', self.check(ok=False))
        self.runtime(self.jobs(accepted=('implement',)))
        self.assertIn('verify', self.check(ok=False))

    def test_latest_attempt_and_coordinator_acceptance_are_required(self):
        self.built()
        jobs = self.jobs()
        jobs.append({**jobs[0], 'attempt': 2, 'acceptance': 'pending'})
        self.runtime(jobs)
        self.assertIn('implement', self.check(ok=False))
        jobs[-1]['acceptance'] = 'accepted'
        self.runtime(jobs)
        self.check()
        self.assertTrue(self.run_cli('status', 'sample')['approval_current'])

    def test_registry_validation_rejects_fabricated_or_conflicting_records(self):
        self.built()
        invalids = []
        no_session = self.jobs()
        no_session[0]['session_id'] = None
        invalids.append(no_session)
        duplicate = self.jobs()
        duplicate.append(copy.deepcopy(duplicate[0]))
        invalids.append(duplicate)
        same_session = self.jobs()
        same_session[1]['session_id'] = same_session[0]['session_id']
        invalids.append(same_session)
        unknown = self.jobs()
        unknown[0]['task_id'] = 'unplanned'
        invalids.append(unknown)
        for jobs in invalids:
            with self.subTest(jobs=jobs):
                self.runtime(jobs)
                self.check(ok=False)
                self.assertIn('error', self.run_cli('status', 'sample', '--compact')['runtime'])

    def test_replanning_while_worker_active_preserves_contract(self):
        self.built()
        jobs = self.jobs()
        jobs[0].update(status='running', acceptance='pending')
        self.runtime(jobs)
        before = (self.change / 'execution-plan.json').read_bytes()
        new_plan = copy.deepcopy(self.plan)
        new_plan['tasks'][0]['objective'] = 'A changed responsibility.'
        self.assertIn('Stop and reconcile', self.install(new_plan, ok=False))
        self.assertEqual((self.change / 'execution-plan.json').read_bytes(), before)

    def test_docs_and_archive_require_quiescence_and_all_contributions(self):
        self.built()
        self.runtime(self.jobs(accepted=('implement', 'verify')))
        self.check()
        self.assertIn('document', self.run_cli('docs', 'sample', '--summary', 'Reviewed.', ok=False))
        (self.root / 'README.md').write_text('The value is 2.\n')
        self.runtime()
        self.run_cli('docs', 'sample', '--paths', 'README.md', '--summary', 'Example matches observed value 2.')
        jobs = self.jobs()
        jobs[0].update(status='running', acceptance='pending')
        self.runtime(jobs)
        self.assertIn('active', self.run_cli('archive', 'sample', '--paths', 'app.py', 'README.md',
                                           '--message', 'Orchestration fixture', ok=False))
        self.runtime()
        self.run_cli('archive', 'sample', '--paths', 'app.py', 'README.md', '--message', 'Orchestration fixture')
        archived = self.root / '.workflow/archive/sample'
        self.assertTrue((archived / 'execution-plan.json').is_file())
        self.assertEqual(json.loads((archived / 'state.json').read_text())['schema_version'], 2)
        self.assertTrue(self.registry.exists())
        self.assertNotIn('.runtime/', self.git('show', '--pretty=', '--name-only', 'HEAD'))

    def test_archive_exports_only_bounded_latest_attempt_provenance(self):
        self.built()
        jobs = self.jobs()
        for job in jobs:
            job.update(profile={'model': {'providerID': 'openai', 'id': 'main', 'variant': 'high'},
                                'effort': 'high', 'fast': False, 'credentials': 'PRIVATE_CREDENTIAL'},
                       actual_model='openai/main#high', native_outcome='succeeded',
                       prompt='PRIVATE_PROMPT' + 'x' * 300000,
                       transcript='PRIVATE_TRANSCRIPT', tokens={'input': 12345},
                       review={'reason': 'PRIVATE_REVIEW', 'at': '2026-09-09T12:00:00Z'})
        previous = copy.deepcopy(jobs[0])
        previous.update(attempt=1, session_id='old-session', acceptance='rejected')
        jobs[0]['attempt'] = 2
        jobs.append(previous)
        self.runtime(jobs)
        expected_contract = self.run_cli('status', 'sample', '--compact')['contract_digest']
        expected_subject = self.run_cli('snapshot')['subject_digest']
        self.check()
        self.run_cli('docs', 'sample', '--summary', 'No public documentation change needed.')
        self.run_cli('archive', 'sample', '--paths', 'app.py', '--message', 'Orchestrated fixture with provenance')
        path = self.root / '.workflow/archive/sample/execution-summary.json'
        summary = json.loads(path.read_text())
        self.assertEqual(summary['version'], 1)
        self.assertEqual(summary['change_id'], 'sample')
        self.assertEqual(summary['contract_digest'], expected_contract)
        self.assertEqual(summary['subject_digest'], expected_subject)
        self.assertEqual(len(summary['tasks']), 3)
        implementation = next(t for t in summary['tasks'] if t['task_id'] == 'implement')
        self.assertEqual(implementation['attempt'], 2)
        self.assertEqual(implementation['role'], 'backend')
        self.assertEqual(implementation['requested_model'], 'openai/main#high')
        self.assertEqual(implementation['actual_model'], 'openai/main#high')
        self.assertEqual(implementation['effort'], 'high')
        self.assertIs(implementation['fast'], False)
        self.assertEqual(implementation['native_outcome'], 'succeeded')
        self.assertEqual(implementation['session_id'], 'session-implement')
        self.assertEqual(implementation['acceptance'], 'accepted')
        self.assertLess(len(path.read_bytes()), 256 * 1024)
        for private in ('PRIVATE_', 'credentials', 'prompt', 'transcript', 'tokens', 'old-session'):
            self.assertNotIn(private, path.read_text())
        self.assertIn('.workflow/archive/sample/execution-summary.json', self.git('show', '--pretty=', '--name-only', 'HEAD'))
        self.assertNotIn('.runtime/', self.git('show', '--pretty=', '--name-only', 'HEAD'))

    def test_archive_restores_existing_summary_exactly_when_commit_fails(self):
        self.built()
        self.runtime()
        self.check()
        self.run_cli('docs', 'sample', '--summary', 'No public documentation affected.')
        path = self.change / 'execution-summary.json'
        before = b'{"note": "Existing summary stays intact on rollback."}\r\n'
        path.write_bytes(before)
        hook = self.root / '.git/hooks/pre-commit'
        hook.write_text('#!/bin/sh\nexit 1\n')
        hook.chmod(0o755)
        self.run_cli('archive', 'sample', '--paths', 'app.py', '--message', 'Failing archive', ok=False)
        self.assertEqual(path.read_bytes(), before)
        self.assertEqual(self.run_cli('status', 'sample')['phase'], 'documented')
        self.assertEqual(self.git('diff', '--cached', '--name-only'), '')
        self.assertFalse((self.root / '.workflow/archive/sample').exists())

    def test_unavailable_model_metadata_is_null_in_public_summary(self):
        self.built()
        self.runtime()
        self.check()
        self.run_cli('docs', 'sample', '--summary', 'No public documentation affected.')
        self.run_cli('archive', 'sample', '--paths', 'app.py', '--message', 'Unknown model metadata')
        summary = json.loads((self.root / '.workflow/archive/sample/execution-summary.json').read_text())
        for task in summary['tasks']:
            for key in ('requested_model', 'actual_model', 'effort', 'fast', 'native_outcome'):
                self.assertIsNone(task[key])

    def test_oversized_public_session_metadata_fails_without_moving_change(self):
        self.built()
        jobs = self.jobs()
        jobs[0]['session_id'] = 'session-' + 'x' * 513
        self.runtime(jobs)
        self.check()
        self.run_cli('docs', 'sample', '--summary', 'No public documentation affected.')
        before = (self.change / 'state.json').read_bytes()
        result = self.run_cli('archive', 'sample', '--paths', 'app.py', '--message', 'Oversized provenance', ok=False)
        self.assertIn('oversized execution summary session id', result)
        self.assertEqual((self.change / 'state.json').read_bytes(), before)
        self.assertFalse((self.change / 'execution-summary.json').exists())
        self.assertEqual(self.git('diff', '--cached', '--name-only'), '')


if __name__ == '__main__':
    unittest.main()
