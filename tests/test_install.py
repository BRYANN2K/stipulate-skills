import os
from pathlib import Path
import subprocess
import tempfile
import unittest
ROOT=Path(__file__).resolve().parents[1]
class InstallTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup)
        self.dest=Path(self.temp.name).resolve()/'installed'
    def install(self,*args,ok=True):
        p=subprocess.run([os.sys.executable,str(ROOT/'scripts/install.py'),'--destination',str(self.dest),*args],capture_output=True,text=True)
        self.assertEqual(p.returncode==0,ok,p.stderr)
    def test_install_run_update_uninstall(self):
        self.install()
        project=Path(self.temp.name).resolve()/'project';project.mkdir()
        script=self.dest/'spec-bootstrap/scripts/workflow.py'
        p=subprocess.run([os.sys.executable,str(script),'--root',str(project),'bootstrap'],capture_output=True,text=True,cwd='/tmp')
        self.assertEqual(p.returncode,0,p.stderr)
        self.assertTrue((project/'.workflow/config.json').exists())
        self.install();self.install('--uninstall')
        self.assertEqual(list(self.dest.glob('spec-*')),[])
    def test_foreign_directory_preserved(self):
        p=self.dest/'spec-apply';p.mkdir(parents=True);(p/'custom').write_text('keep')
        self.install(ok=False);self.assertEqual((p/'custom').read_text(),'keep')
    def test_modified_installation_preserved(self):
        self.install();p=self.dest/'spec-apply/SKILL.md';p.write_text('user changes')
        self.install('--uninstall',ok=False);self.assertEqual(p.read_text(),'user changes')
    def test_dry_run_no_mutation(self):
        self.install('--dry-run');self.assertFalse(self.dest.exists())
if __name__=='__main__':unittest.main()
