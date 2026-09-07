import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'scripts'))
import install_extensions
import validate_extensions


class ExtensionTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()/'project with spaces'
        self.root.mkdir()
        self.git('init','-q')
        self.git('config','user.email','fixture@example.invalid')
        self.git('config','user.name','Extension fixture')
        (self.root/'app.txt').write_text('initial\n')
        self.git('add','.')
        self.git('commit','-qm','initial')
        self.cli('bootstrap')
        self.git('add','.')
        self.git('commit','-qm','bootstrap')

    def git(self,*args):
        result=subprocess.run(['git','-C',str(self.root),*args],capture_output=True,text=True)
        self.assertEqual(result.returncode,0,result.stderr)
        return result.stdout

    def cli(self,*args,ok=True):
        result=subprocess.run([sys.executable,str(ROOT/'scripts/workflow.py'),'--root',str(self.root),*args],capture_output=True,text=True)
        self.assertEqual(result.returncode == 0,ok,result.stderr or result.stdout)
        return json.loads(result.stdout) if result.stdout else result.stderr

    def installer(self,*names,dry=False,ok=True):
        args=[sys.executable,str(ROOT/'scripts/install_extensions.py'),'--project',str(self.root)]
        for name in names: args.extend(['--extension',name])
        if dry: args.append('--dry-run')
        result=subprocess.run(args,capture_output=True,text=True)
        self.assertEqual(result.returncode == 0,ok,result.stderr or result.stdout)
        return json.loads(result.stdout) if result.stdout else result.stderr

    def test_catalogue_portability_and_cases(self):
        result=validate_extensions.validate()
        self.assertEqual(result['packages'],28)
        self.assertFalse(result['behavioral_evaluation_performed'])

    def test_bootstrap_installs_no_domain(self):
        self.assertEqual(self.cli('extensions'),{})
        self.assertFalse((self.root/'.workflow/extensions').exists())

    def test_dry_run_is_read_only(self):
        before=self.git('status','--porcelain')
        config=(self.root/'.workflow/config.json').read_bytes()
        self.installer('cloud-engineering',dry=True)
        self.assertEqual((self.root/'.workflow/config.json').read_bytes(),config)
        self.assertFalse((self.root/'.workflow/extensions').exists())
        self.assertEqual(self.git('status','--porcelain'),before)

    def test_explicit_selection_and_cloud_does_not_select_design(self):
        self.installer('cloud-engineering','ux-design','visual-design')
        self.assertEqual(self.cli('explore','empty')['extensions'],{})
        selected=self.cli('explore','cloud','--extension','cloud-engineering')['extensions']
        self.assertEqual(set(selected),{'cloud-engineering'})
        self.assertEqual(set(selected['cloud-engineering']['references']),set(install_extensions.PHASES))
        self.assertEqual(self.cli('status','empty')['extensions'],[])

    def test_idempotence_preserves_configuration_and_project_instructions(self):
        cfg=self.root/'.workflow/config.json'
        data=json.loads(cfg.read_text());data['custom']={'keep':True}
        data['extensions']['other']={'enabled':False,'path':'custom/other'}
        cfg.write_text(json.dumps(data))
        agents=(self.root/'AGENTS.md').read_bytes()
        project=(self.root/'.workflow/project.md').read_bytes()
        self.installer('cli-tooling')
        before=cfg.read_bytes()
        self.installer('cli-tooling','cli-tooling')
        self.assertEqual(cfg.read_bytes(),before)
        self.assertEqual(json.loads(before)['custom'],{'keep':True})
        self.assertEqual((self.root/'AGENTS.md').read_bytes(),agents)
        self.assertEqual((self.root/'.workflow/project.md').read_bytes(),project)

    def test_preflight_prevents_partial_install_and_overwrite(self):
        self.installer('cloud-engineering')
        path=self.root/'.workflow/extensions/cloud-engineering/apply.md'
        path.write_text('User customization')
        cfg=(self.root/'.workflow/config.json').read_bytes()
        self.installer('cli-tooling','cloud-engineering',ok=False)
        self.assertFalse((self.root/'.workflow/extensions/cli-tooling').exists())
        self.assertEqual(path.read_text(),'User customization')
        self.assertEqual((self.root/'.workflow/config.json').read_bytes(),cfg)

    def test_conflicting_config_preserved(self):
        cfg=self.root/'.workflow/config.json'
        data=json.loads(cfg.read_text());data['extensions']['cloud-engineering']={'enabled':False,'path':'custom/cloud'}
        cfg.write_text(json.dumps(data));before=cfg.read_bytes()
        self.installer('cloud-engineering',ok=False)
        self.assertEqual(cfg.read_bytes(),before)

    def test_symlink_destination_refused(self):
        outside=Path(self.temp.name)/'outside';outside.mkdir()
        (self.root/'.workflow/extensions').symlink_to(outside,target_is_directory=True)
        self.installer('cloud-engineering',ok=False)
        self.assertEqual(list(outside.iterdir()),[])

    def test_unknown_and_traversal_refused(self):
        self.installer('unknown',ok=False)
        self.installer('../cloud-engineering',ok=False)
        self.assertEqual(self.cli('extensions'),{})

    def test_existing_engine_lock_respected(self):
        lock=self.root/'.workflow/.lock';lock.write_text('other task')
        self.installer('cloud-engineering',ok=False)
        self.assertEqual(lock.read_text(),'other task')

    def test_copy_failure_rolls_back_only_created_packages(self):
        cfg=(self.root/'.workflow/config.json').read_bytes()
        real=shutil.copytree
        def fail_second(source,destination,*args,**kwargs):
            if Path(source).name=='ux-design':
                raise OSError('Simulated interrupted copy')
            return real(source,destination,*args,**kwargs)
        with patch.object(install_extensions.shutil,'copytree',side_effect=fail_second):
            with self.assertRaises(OSError):
                install_extensions.install(self.root,['cloud-engineering','ux-design'])
        self.assertEqual((self.root/'.workflow/config.json').read_bytes(),cfg)
        self.assertFalse((self.root/'.workflow/extensions').exists())

    def test_installed_packages_work_with_standalone_runtime(self):
        self.installer('cloud-engineering')
        runtime=Path(self.temp.name)/'standalone.py'
        shutil.copy2(ROOT/'skills/spec-explore/scripts/workflow.py',runtime)
        result=subprocess.run([sys.executable,str(runtime),'--root',str(self.root),'extensions'],
                              cwd=self.temp.name,capture_output=True,text=True)
        self.assertEqual(result.returncode,0,result.stderr)
        refs=json.loads(result.stdout)['cloud-engineering']['references']
        for reference in refs.values():
            self.assertTrue(reference['path'].startswith('.workflow/extensions/cloud-engineering/'))
            self.assertTrue((self.root/reference['path']).is_file())

    def test_reference_edit_invalidates_approval(self):
        self.installer('cloud-engineering')
        self.cli('explore','cloud','--extension','cloud-engineering')
        (self.root/'.workflow/changes/cloud/spec.md').write_text('- AC-1: Fixture output matches expected value.\n')
        self.cli('approve','cloud','--by','fixture','--ack-user-approval')
        ref=self.root/'.workflow/extensions/cloud-engineering/check.md'
        ref.write_text(ref.read_text()+'\nChanged reference\n')
        self.cli('start','cloud',ok=False)

    def test_all_packages_synthetic_lifecycle_and_failure_gate(self):
        names=[p.name for p in (ROOT/'extensions').iterdir() if p.is_dir()]
        self.installer(*names)
        self.git('add','.workflow');self.git('commit','-qm','Fixture packages')
        (self.root/'unrelated.txt').write_text('User work preserved')
        for number,name in enumerate(sorted(names),1):
            with self.subTest(extension=name):
                selected=self.cli('explore',name,'--extension',name)['extensions']
                self.assertEqual(set(selected),{name})
                change=self.root/'.workflow/changes'/name
                (change/'spec.md').write_text('- AC-1: Synthetic fixture output equals this extension id.\n')
                self.cli('validate',name)
                # Fixture attestation only, never represents a real user's approval.
                self.cli('approve',name,'--by','fixture','--ack-user-approval')
                self.cli('start',name)
                (self.root/'app.txt').write_text(name+'\n')
                self.assertEqual((self.root/'app.txt').read_text().strip(),name)
                report=Path(self.temp.name)/'results.json'
                data={'subject_digest':self.cli('snapshot')['subject_digest'],'criteria':[{'id':'AC-1','status':'unverified','evidence':'Synthetic fixture: incomplete report exercises gate, not domain verification.'}]}
                report.write_text(json.dumps(data))
                self.cli('check',name,'--results',str(report),ok=False)
                self.cli('docs',name,'--summary','Must remain blocked',ok=False)
                data['criteria'][0].update(status='passed',evidence='Read app.txt and compared its content with the extension id in disposable fixture.')
                report.write_text(json.dumps(data))
                self.cli('check',name,'--results',str(report))
                self.cli('docs',name,'--summary','Synthetic fixture only; no reader-facing docs affected.')
                self.cli('archive',name,'--paths','app.txt','--message','Verify fixture '+name)
                self.assertTrue((self.root/'.workflow/archive'/name/'state.json').exists())
        self.assertEqual((self.root/'unrelated.txt').read_text(),'User work preserved')
        self.assertNotIn('unrelated.txt',self.git('ls-files').splitlines())


if __name__=='__main__':
    unittest.main()
