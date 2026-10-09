"""Correction refresh of reused worktrees (AC-31) and integrated paths of retired tasks (AC-34)."""
import json
import os
from pathlib import Path
import unittest

import test_runtime


class RuntimeFixTests(unittest.TestCase):
    # Reuse the runtime fixtures without re-running the runtime test methods.
    setUp = test_runtime.RuntimeTests.setUp
    git = test_runtime.RuntimeTests.git
    run_cli = test_runtime.RuntimeTests.run_cli
    rt = test_runtime.RuntimeTests.rt
    refused = test_runtime.RuntimeTests.refused
    start = test_runtime.RuntimeTests.start
    launch = test_runtime.RuntimeTests.launch
    accept = test_runtime.RuntimeTests.accept
    state = test_runtime.RuntimeTests.state
    revise = test_runtime.RuntimeTests.revise

    def settle(self, task, attempt, decision='accepted'):
        self.rt('confirm', 'sample', '--task', task, '--attempt', str(attempt), '--session', 's-' + task)
        self.rt('settle', 'sample', '--task', task, '--attempt', str(attempt), '--status', 'returned')
        self.rt('review', 'sample', '--task', task, '--decision', decision, '--reason', 'Inspected the worktree.')

    def corrected(self):
        """implement-lib works in a worktree, is rejected, then implement is integrated into main before the correction."""
        (self.root / 'old.txt').write_text('old\n')
        self.git('add', 'old.txt')
        self.git('commit', '-qm', 'add old')
        self.start()
        lib = self.rt('reserve', 'sample', '--task', 'implement-lib', '--isolate')
        wt = Path(lib['cwd'])
        self.assertEqual((wt / 'app.py').read_text(), 'value = 1\n')
        (wt / 'lib/a.py').write_text('a = 2  # worker\n')
        (wt / 'lib/c.py').write_text('c = 1  # worker, untracked\n')
        (wt / 'stray.txt').write_text('worker artefact\n')
        self.settle('implement-lib', 1, 'rejected')
        impl = self.launch('implement', '--isolate')
        (self.root / impl['worktree'] / 'app.py').write_text('value = 2  # integrated fix\n')
        self.rt('review', 'sample', '--task', 'implement', '--decision', 'accepted', '--reason', 'Inspected the fix.')
        self.assertEqual(self.rt('integrate', 'sample', '--task', 'implement')['written'], ['app.py'])
        (self.root / 'old.txt').unlink()
        self.git('add', '-A', 'old.txt')
        (self.root / 'extra.py').write_text('extra = 1\n')
        self.git('add', 'extra.py')
        self.git('commit', '-qm', 'main moved on')
        return wt

    def test_correction_refreshes_non_owned_files_and_keeps_owned_work(self):
        wt = self.corrected()
        job = self.rt('reserve', 'sample', '--task', 'implement-lib', '--correction')['job']
        self.assertEqual((job['attempt'], job['worktree']), (2, '.workflow/.runtime/sample/worktrees/implement-lib-1'))
        self.assertEqual((wt / 'app.py').read_text(), 'value = 2  # integrated fix\n')
        self.assertEqual((wt / 'extra.py').read_text(), 'extra = 1\n')
        self.assertFalse((wt / 'old.txt').exists())
        self.assertFalse((wt / 'stray.txt').exists())
        self.assertEqual((wt / 'lib/a.py').read_text(), 'a = 2  # worker\n')
        self.assertEqual((wt / 'lib/c.py').read_text(), 'c = 1  # worker, untracked\n')
        refreshed = job['refreshed']
        self.assertEqual((refreshed['written'], refreshed['deleted']), (['app.py', 'extra.py'], ['old.txt', 'stray.txt']))
        self.assertNotEqual(refreshed['from_commit'], job['base_commit'])
        self.assertEqual(self.state()['jobs'][-1]['refreshed'], refreshed)
        # Integration after the refresh writes only the worker's own changes.
        self.settle('implement-lib', 2)
        result = self.rt('integrate', 'sample', '--task', 'implement-lib')
        self.assertEqual((result['written'], result['deleted']), (['lib/a.py', 'lib/c.py'], []))
        self.assertEqual((self.root / 'app.py').read_text(), 'value = 2  # integrated fix\n')
        self.assertFalse((self.root / 'old.txt').exists())
        self.assertEqual((self.root / 'lib/a.py').read_text(), 'a = 2  # worker\n')

    def test_refresh_uses_uncommitted_main_content_and_untracked_read_files(self):
        wt = self.corrected()
        (self.root / 'app.py').write_text('value = 5  # uncommitted in main\n')
        job = self.rt('reserve', 'sample', '--task', 'implement-lib', '--correction')['job']
        self.assertEqual((wt / 'app.py').read_text(), 'value = 5  # uncommitted in main\n')
        self.assertIn('app.py', job['refreshed']['written'])
        self.settle('implement-lib', 2)
        self.assertEqual(self.rt('integrate', 'sample', '--task', 'implement-lib')['written'], ['lib/a.py', 'lib/c.py'])
        self.assertEqual((self.root / 'app.py').read_text(), 'value = 5  # uncommitted in main\n')

    def test_owned_conflict_is_still_detected_after_refresh(self):
        wt = self.corrected()
        (self.root / 'lib/a.py').write_text('a = 3  # changed in main\n')
        job = self.rt('reserve', 'sample', '--task', 'implement-lib', '--correction')['job']
        self.assertNotIn('lib/a.py', job['refreshed']['written'])
        self.assertEqual((wt / 'lib/a.py').read_text(), 'a = 2  # worker\n')
        self.settle('implement-lib', 2)
        error = self.refused('nothing was written', 'integrate', 'sample', '--task', 'implement-lib')
        self.assertEqual([c['path'] for c in error['conflicts']], ['lib/a.py'])
        self.assertEqual((self.root / 'lib/a.py').read_text(), 'a = 3  # changed in main\n')
        self.assertFalse((self.root / 'lib/c.py').exists())

    def test_out_of_ownership_edits_after_refresh_are_refused(self):
        wt = self.corrected()
        self.rt('reserve', 'sample', '--task', 'implement-lib', '--correction')
        (wt / 'app.py').write_text('value = 99\n')
        (wt / 'stray2.txt').write_text('artefact\n')
        self.settle('implement-lib', 2)
        error = self.refused('nothing was written', 'integrate', 'sample', '--task', 'implement-lib')
        conflicts = {c['path']: c.get('untracked', False) for c in error['conflicts']}
        self.assertEqual(conflicts, {'app.py': False, 'stray2.txt': True})
        self.assertEqual((self.root / 'app.py').read_text(), 'value = 2  # integrated fix\n')

    def test_refresh_removes_non_owned_symlinks_without_following_them(self):
        wt = self.corrected()
        outside = self.root.parent / 'outside dir'
        outside.mkdir()
        (outside / 'secret.txt').write_text('keep me\n')
        os.symlink('lib/a.py', wt / 'zz-link')
        os.symlink(str(outside), wt / 'linked-dir')
        (wt / 'app.py').unlink()
        os.symlink('lib/a.py', wt / 'app.py')  # A non-owned tracked file replaced by a link into owned work.
        job = self.rt('reserve', 'sample', '--task', 'implement-lib', '--correction')['job']
        self.assertEqual(job['attempt'], 2)
        self.assertFalse(os.path.lexists(wt / 'zz-link'))
        self.assertFalse(os.path.lexists(wt / 'linked-dir'))
        self.assertEqual((outside / 'secret.txt').read_text(), 'keep me\n')
        self.assertFalse((wt / 'app.py').is_symlink())
        self.assertEqual((wt / 'app.py').read_text(), 'value = 2  # integrated fix\n')
        self.assertEqual((wt / 'lib/a.py').read_text(), 'a = 2  # worker\n')
        self.assertTrue({'zz-link', 'linked-dir', 'old.txt', 'stray.txt'} <= set(job['refreshed']['deleted']))
        self.assertIn('app.py', job['refreshed']['written'])
        self.assertNotIn('app.py', job['refreshed']['deleted'])
        self.settle('implement-lib', 2)
        self.assertEqual(self.rt('integrate', 'sample', '--task', 'implement-lib')['written'], ['lib/a.py', 'lib/c.py'])

    def test_owned_symlink_is_kept_and_still_refused_at_integration(self):
        wt = self.corrected()
        os.symlink('a.py', wt / 'lib/link.py')
        job = self.rt('reserve', 'sample', '--task', 'implement-lib', '--correction')['job']
        self.assertTrue((wt / 'lib/link.py').is_symlink())
        self.assertNotIn('lib/link.py', job['refreshed']['deleted'] + job['refreshed']['written'])
        self.settle('implement-lib', 2)
        error = self.refused('nothing was written', 'integrate', 'sample', '--task', 'implement-lib')
        self.assertEqual([c['path'] for c in error['conflicts']], ['lib/link.py'])  # Today's refusal, unchanged.
        self.assertFalse((self.root / 'lib/c.py').exists())

    def test_rebase_reports_paths_a_retired_task_integrated(self):
        self.start()
        job = self.launch('implement-lib', '--isolate')
        wt = self.root / job['worktree']
        (wt / 'lib/b.py').write_text('b = 1\n')
        (wt / 'lib/a.py').unlink()
        self.rt('review', 'sample', '--task', 'implement-lib', '--decision', 'accepted', '--reason', 'Inspected the worktree.')
        self.rt('integrate', 'sample', '--task', 'implement-lib')
        self.accept('implement')
        plan = json.loads(json.dumps(self.plan))
        plan['tasks'][1]['id'] = 'library'
        plan['tasks'][2]['depends_on'] = ['implement', 'library']
        self.revise(plan)
        result = self.rt('rebase', 'sample', '--reason', 'Task renamed')
        self.assertEqual(result['retired'], ['implement-lib'])
        self.assertEqual(result['retired_integrated_paths'], {'implement-lib': ['lib/a.py', 'lib/b.py']})
        self.assertEqual(result['rebase']['retired_integrated_paths'], result['retired_integrated_paths'])
        retired = self.state()['retired_jobs']
        self.assertEqual([(j['task_id'], j['retired_integrated_paths']) for j in retired], [('implement-lib', ['lib/a.py', 'lib/b.py'])])
        self.assertEqual(self.rt('rebase', 'sample')['retired_integrated_paths'], {})

    def test_rebase_reports_no_paths_for_shared_checkout_retired_task(self):
        self.start()
        self.accept('implement')
        self.accept('implement-lib')
        plan = json.loads(json.dumps(self.plan))
        plan['tasks'][1]['id'] = 'library'
        plan['tasks'][2]['depends_on'] = ['implement', 'library']
        self.revise(plan)
        result = self.rt('rebase', 'sample')
        self.assertEqual(result['retired_integrated_paths'], {'implement-lib': []})
        self.assertEqual(self.state()['retired_jobs'][0]['retired_integrated_paths'], [])


if __name__ == '__main__':
    unittest.main()
