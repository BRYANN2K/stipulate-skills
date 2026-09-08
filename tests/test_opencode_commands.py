import importlib.util
from pathlib import Path
import shutil
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('command_installer', ROOT/'scripts/install_opencode_commands.py')
installer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(installer)


class CommandTests(unittest.TestCase):
    def test_install_dry_run_and_repeat(self):
        with tempfile.TemporaryDirectory() as tmp:
            dest = Path(tmp).resolve()/'commands'
            installer.install(dest, True)
            self.assertFalse(dest.exists())
            self.assertEqual(len(installer.install(dest)['added']), 7)
            self.assertEqual(installer.install(dest)['added'], [])
            for p in dest.glob('*.md'):
                self.assertIn('$ARGUMENTS', p.read_text())
                self.assertIn(f'`{p.stem}`', p.read_text())

    def test_conflict_preserves_entire_batch(self):
        with tempfile.TemporaryDirectory() as tmp:
            dest = Path(tmp).resolve()
            custom = dest/'stip-validate.md'
            custom.write_text('My command')
            with self.assertRaises(ValueError): installer.install(dest)
            self.assertEqual(list(dest.iterdir()), [custom])
            self.assertEqual(custom.read_text(), 'My command')

    def test_installed_helper_works_without_checkout(self):
        import subprocess,sys,json
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp).resolve()
            shutil.copytree(ROOT/'skills/stip-bootstrap', base/'bootstrap')
            result = subprocess.run([sys.executable,str(base/'bootstrap/scripts/install_opencode_commands.py'),'--destination',str(base/'commands')],capture_output=True,text=True)
            self.assertEqual(result.returncode,0,result.stderr)
            self.assertEqual(len(json.loads(result.stdout)['commands']),7)
