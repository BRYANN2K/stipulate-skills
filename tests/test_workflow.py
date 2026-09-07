import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / 'scripts/workflow.py'
class LifecycleTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        self.git('init', '-q')
        self.git('config', 'user.email', 'test@example.invalid')
        self.git('config', 'user.name', 'Workflow Test')
        (self.root/'app.py').write_text('value = 1\n')
        self.git('add', '.')
        self.git('commit', '-qm', 'initial')
        self.run_cli('bootstrap')
        self.git('add', '.')
        self.git('commit', '-qm', 'bootstrap')

    def git(self, *args):
        p=subprocess.run(['git','-C',str(self.root),*args],capture_output=True,text=True)
        self.assertEqual(p.returncode,0,p.stderr)
        return p.stdout

    def run_cli(self,*args,ok=True):
        p=subprocess.run([os.sys.executable,str(SCRIPT),'--root',str(self.root),*args],capture_output=True,text=True)
        if ok:
            self.assertEqual(p.returncode,0,p.stderr)
            return json.loads(p.stdout)
        self.assertNotEqual(p.returncode,0,p.stdout)
        return p.stderr

    def ready(self, name='sample'):
        self.run_cli('explore',name)
        p=self.root/'.workflow/changes'/name
        (p/'spec.md').write_text('# Feature\n\n- AC-1: Return the requested value.\n')
        self.run_cli('validate',name)
        self.run_cli('approve',name,'--by','user','--ack-user-approval')
        return p

    def built(self):
        p=self.ready()
        self.run_cli('start','sample')
        (self.root/'app.py').write_text('value = 2\n')
        return p

    def report(self,status='passed',subject=None):
        p=self.root/'result.json'
        # Place report outside repository so it cannot alter the subject.
        p=self.root.parent/(self.root.name+'-results.json')
        self.addCleanup(lambda:p.unlink(missing_ok=True))
        p.write_text(json.dumps({'subject_digest':subject or self.run_cli('snapshot')['subject_digest'],
          'criteria':[{'id':'AC-1','status':status,'evidence':'Observed value 2 in disposable fixture.'}]}))
        return str(p)

    def checked(self):
        p=self.built()
        self.run_cli('check','sample','--results',self.report())
        return p

    def documented(self):
        p=self.checked()
        self.run_cli('docs','sample','--summary','No public documentation affected; internal fixture only.')
        return p

    def test_bootstrap_idempotent(self):
        p=self.root/'AGENTS.md';p.write_text('Custom instructions\n'+p.read_text())
        before=p.read_bytes()
        self.run_cli('bootstrap');self.run_cli('bootstrap')
        self.assertEqual(p.read_bytes(),before)
        self.assertEqual(p.read_text().count('<!-- spec-workflow:start -->'),1)

    def test_bootstrap_preserves_project_map(self):
        p=self.root/'.workflow/project.md';p.write_text('Existing knowledge')
        self.run_cli('bootstrap');self.assertEqual(p.read_text(),'Existing knowledge')

    def test_missing_criteria_rejected(self):
        self.run_cli('explore','sample')
        self.run_cli('validate','sample',ok=False)

    def test_duplicate_criteria_rejected(self):
        p=self.ready();(p/'spec.md').write_text('- AC-1: One\n- AC-1: Two\n')
        self.run_cli('validate','sample',ok=False)

    def test_approval_required(self):
        self.run_cli('explore','sample');self.run_cli('start','sample',ok=False)

    def test_explicit_attestation_required(self):
        p=self.ready();self.run_cli('approve','sample','--by','user',ok=False)

    def test_contract_change_invalidates_approval(self):
        p=self.ready();(p/'spec.md').write_text('- AC-1: Different behavior\n')
        self.run_cli('start','sample',ok=False)
        result=self.run_cli('validate','sample');self.assertEqual(result['phase'],'draft')

    def test_optional_tasks_bound_to_approval(self):
        p=self.ready();(p/'tasks.md').write_text('Additional work')
        self.run_cli('start','sample',ok=False)

    def test_stale_evidence_rejected(self):
        self.built();report=self.report();(self.root/'app.py').write_text('value = 3\n')
        self.run_cli('check','sample','--results',report,ok=False)

    def test_failed_check_blocks_docs(self):
        self.built();self.run_cli('check','sample','--results',self.report('failed'),ok=False)
        self.assertEqual(self.run_cli('status','sample')['phase'],'applying')
        self.run_cli('docs','sample','--summary','Done',ok=False)

    def test_code_change_after_check_rejected(self):
        self.checked();(self.root/'app.py').write_text('value = 3\n')
        self.run_cli('docs','sample','--summary','Done',ok=False)

    def test_documentation_change_allowed_and_bound(self):
        self.checked();(self.root/'README.md').write_text('Behavior value 2')
        self.run_cli('docs','sample','--paths','README.md','--summary','Example checked against value 2.')
        self.run_cli('archive','sample','--paths','app.py','README.md','--message','Add feature')
        self.assertTrue((self.root/'.workflow/specs/sample.md').exists())

    def test_full_lifecycle_selective_commit(self):
        (self.root/'unrelated.txt').write_text('Existing unrelated work')
        self.documented()
        self.run_cli('archive','sample','--paths','app.py','--message','Implement sample')
        self.assertFalse((self.root/'.workflow/changes/sample').exists())
        self.assertTrue((self.root/'.workflow/archive/sample/state.json').exists())
        self.assertIn('?? unrelated.txt',self.git('status','--short'))
        self.assertNotIn('unrelated.txt',self.git('show','--pretty=','--name-only','HEAD'))

    def test_existing_staged_work_preserved(self):
        self.documented();(self.root/'unrelated.txt').write_text('Other')
        self.git('add','unrelated.txt')
        self.run_cli('archive','sample','--paths','app.py','--message','Feature',ok=False)
        self.assertEqual(self.git('diff','--cached','--name-only').strip(),'unrelated.txt')

    def test_preexisting_overlap_rejected(self):
        (self.root/'app.py').write_text('value = 5\n')
        self.documented()
        self.run_cli('archive','sample','--paths','app.py','--message','Feature',ok=False)

    def test_wrong_commit_paths_rejected(self):
        self.documented()
        self.run_cli('archive','sample','--message','Feature',ok=False)
        self.assertTrue((self.root/'.workflow/changes/sample').exists())

    def test_concurrent_spec_update_rejected(self):
        self.documented();(self.root/'.workflow/specs/sample.md').write_text('Other accepted spec')
        self.run_cli('archive','sample','--paths','app.py','--message','Feature',ok=False)

    def test_commit_failure_restores_workflow_and_index(self):
        self.documented();hook=self.root/'.git/hooks/pre-commit'
        hook.write_text('#!/bin/sh\nexit 1\n');hook.chmod(0o755)
        self.run_cli('archive','sample','--paths','app.py','--message','Feature',ok=False)
        self.assertTrue((self.root/'.workflow/changes/sample').exists())
        self.assertFalse((self.root/'.workflow/archive/sample').exists())
        self.assertFalse((self.root/'.workflow/specs/sample.md').exists())
        self.assertEqual(self.git('diff','--cached','--name-only'),'')

    def test_path_traversal_rejected(self):
        self.run_cli('explore','../escape',ok=False)

    def test_symlink_rejected(self):
        self.ready();p=self.root/'.workflow/changes/sample/spec.md';p.unlink();p.symlink_to(self.root/'app.py')
        self.run_cli('validate','sample',ok=False)
        self.assertEqual((self.root/'app.py').read_text(),'value = 1\n')

    def test_lock_exclusion(self):
        (self.root/'.workflow/.lock').write_text('other-process')
        self.run_cli('explore','sample',ok=False)
        self.assertEqual((self.root/'.workflow/.lock').read_text(),'other-process')

    def test_extension_selection_and_digest(self):
        base=self.root/'.workflow/extensions/cloud';base.mkdir(parents=True)
        (base/'extension.json').write_text(json.dumps({'schema_version':1,'id':'cloud','explore':'explore.md'}))
        (base/'explore.md').write_text('Ask about recovery needs.')
        cfg=self.root/'.workflow/config.json';cfg.write_text(json.dumps({'schema_version':1,'extensions':{'cloud':{'enabled':True,'path':'.workflow/extensions/cloud'}}}))
        self.run_cli('explore','cloud-change','--extension','cloud')
        p=self.root/'.workflow/changes/cloud-change';(p/'spec.md').write_text('- AC-1: Recovery documented\n')
        self.run_cli('approve','cloud-change','--by','user','--ack-user-approval')
        (base/'explore.md').write_text('A changed extension')
        self.run_cli('start','cloud-change',ok=False)

    def test_unknown_extension_rejected(self):
        self.run_cli('explore','sample','--extension','unknown',ok=False)

    def test_existing_spec_seeded(self):
        (self.root/'.workflow/specs/auth.md').write_text('- AC-1: Existing behavior\n')
        self.run_cli('explore','auth-update','--target','auth')
        self.assertEqual((self.root/'.workflow/changes/auth-update/spec.md').read_text(),'- AC-1: Existing behavior\n')

    def test_select_invalidates_previous_approval(self):
        self.ready()
        self.run_cli('select','sample')
        self.assertFalse(self.run_cli('status','sample')['approval_current'])
        self.run_cli('start','sample',ok=False)

    def test_executable_mode_invalidates_snapshot(self):
        self.checked()
        (self.root/'app.py').chmod(0o755)
        self.run_cli('docs','sample','--summary','Done',ok=False)

    def test_tracked_change_directory_archives_cleanly(self):
        self.ready()
        self.git('add','.workflow/changes/sample')
        self.git('commit','-qm','Record agreed contract')
        self.run_cli('start','sample')
        (self.root/'app.py').write_text('value = 2\n')
        self.run_cli('check','sample','--results',self.report())
        self.run_cli('docs','sample','--summary','Internal fixture; no public docs.')
        self.run_cli('archive','sample','--paths','app.py','--message','Implement')
        self.assertEqual(self.git('status','--short'),'')

    def test_deleted_source_archives_cleanly(self):
        self.ready(); self.run_cli('start','sample')
        (self.root/'app.py').unlink()
        self.run_cli('check','sample','--results',self.report())
        self.run_cli('docs','sample','--summary','Internal fixture deletion.')
        self.run_cli('archive','sample','--paths','app.py','--message','Remove source')
        self.assertEqual(self.git('status','--short'),'')
        self.assertNotIn('app.py',self.git('ls-files').splitlines())

    def test_renamed_source_archives_cleanly(self):
        self.ready(); self.run_cli('start','sample')
        (self.root/'app.py').rename(self.root/'renamed.py')
        self.run_cli('check','sample','--results',self.report())
        self.run_cli('docs','sample','--summary','Internal fixture rename.')
        self.run_cli('archive','sample','--paths','app.py','renamed.py','--message','Rename source')
        self.assertEqual(self.git('status','--short'),'')
        self.assertIn('renamed.py',self.git('ls-files').splitlines())

    def test_bootstrap_without_git(self):
        other=self.root/'new-project';other.mkdir()
        p=subprocess.run([os.sys.executable,str(SCRIPT),'--root',str(other),'bootstrap'],capture_output=True,text=True)
        self.assertEqual(p.returncode,0,p.stderr)
        self.assertTrue((other/'.workflow/changes').is_dir())

    def test_existing_accepted_spec_can_evolve(self):
        spec=self.root/'.workflow/specs/auth.md';spec.write_text('- AC-1: Old behavior\n')
        self.git('add','.workflow/specs/auth.md');self.git('commit','-qm','Accepted auth')
        self.run_cli('explore','auth-update','--target','auth')
        p=self.root/'.workflow/changes/auth-update'
        (p/'spec.md').write_text('- AC-1: New behavior\n')
        self.run_cli('approve','auth-update','--by','user','--ack-user-approval')
        self.run_cli('start','auth-update')
        (self.root/'app.py').write_text('value = 2\n')
        self.run_cli('check','auth-update','--results',self.report())
        self.run_cli('docs','auth-update','--summary','No reader-facing change in fixture.')
        self.run_cli('archive','auth-update','--paths','app.py','--message','Update auth')
        self.assertEqual(spec.read_text(),'- AC-1: New behavior\n')

if __name__=='__main__':unittest.main()
