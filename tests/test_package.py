import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CompletePackageTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name).resolve()
        self.project = self.base / 'project with spaces'
        self.project.mkdir()
        self.skills = self.base / 'installed'
        self.run_command(ROOT / 'scripts/install.py', '--destination', str(self.skills))
        self.setup_script = self.skills / 'stip-bootstrap/scripts/setup_stip.py'

    def run_command(self, script, *args, ok=True):
        result = subprocess.run([sys.executable, str(script), *args], cwd=self.base,
                                capture_output=True, text=True)
        self.assertEqual(result.returncode == 0, ok, result.stderr or result.stdout)
        return json.loads(result.stdout) if result.returncode == 0 else result.stderr

    def setup_project(self, ok=True):
        return self.run_command(self.setup_script, '--root', str(self.project), ok=ok)

    def test_portable_full_catalog_and_selective_exploration(self):
        result = self.setup_project()
        self.assertEqual(len(result['added']), 28)
        self.assertEqual(len(list(self.skills.glob('*/SKILL.md'))), 7)
        self.assertEqual(list((self.project / '.workflow/changes').iterdir()), [])
        subprocess.run(['git', 'init', '-q', str(self.project)], check=True)
        runtime = self.skills / 'stip-explore/scripts/workflow.py'
        result = self.run_command(runtime, '--root', str(self.project), 'explore', 'cloud',
                                  '--extension', 'cloud-engineering')
        self.assertEqual(set(result['extensions']), {'cloud-engineering'})

    def test_repeat_preserves_custom_disabled_and_active_state(self):
        self.setup_project()
        config_path = self.project / '.workflow/config.json'
        config = json.loads(config_path.read_text())
        config['extensions']['ux-design']['enabled'] = False
        config_path.write_text(json.dumps(config))
        custom = self.project / '.workflow/extensions/ux-design/explore.md'
        custom.write_text('Project-specific design guidance\n')
        active = self.project / '.workflow/changes/existing'
        active.mkdir()
        (active / 'state.json').write_text('{"sentinel": "preserve"}')
        before = {p.relative_to(self.project): p.read_bytes() for p in self.project.rglob('*') if p.is_file()}
        result = self.setup_project()
        after = {p.relative_to(self.project): p.read_bytes() for p in self.project.rglob('*') if p.is_file()}
        self.assertEqual(result['added'], [])
        self.assertEqual(before, after)

    def test_conflicting_unconfigured_package_is_not_overwritten(self):
        self.setup_project()
        cp = self.project / '.workflow/config.json'
        config = json.loads(cp.read_text())
        del config['extensions']['ux-design']
        cp.write_text(json.dumps(config))
        custom = self.project / '.workflow/extensions/ux-design/explore.md'
        custom.write_text('Custom unconfigured content\n')
        before = cp.read_bytes()
        self.setup_project(ok=False)
        self.assertEqual(cp.read_bytes(), before)
        self.assertEqual(custom.read_text(), 'Custom unconfigured content\n')

    def test_incomplete_distribution_fails_before_project_writes(self):
        (self.skills / 'stip-bootstrap/assets/extensions/ux-design/check.md').unlink()
        self.setup_project(ok=False)
        self.assertEqual(list(self.project.iterdir()), [])

    def test_claude_import_preserves_instructions_and_is_idempotent(self):
        path = self.project / 'CLAUDE.md'
        original = b'# Team instructions\r\nKeep our commands.\r\n'
        path.write_bytes(original)
        self.setup_project()
        self.assertTrue(path.read_bytes().startswith(original))
        self.assertIn(b'@AGENTS.md', path.read_bytes())
        before = path.read_bytes()
        self.setup_project()
        self.assertEqual(path.read_bytes(), before)

    def test_existing_import_is_preserved(self):
        path = self.project / 'CLAUDE.md'
        original = b'@./AGENTS.md\n\nCustom guidance\n'
        path.write_bytes(original)
        self.setup_project()
        self.assertEqual(path.read_bytes(), original)

    def test_fenced_example_does_not_count_as_import(self):
        path = self.project / 'CLAUDE.md'
        path.write_text('Example:\n```md\n@AGENTS.md\n```\n')
        self.setup_project()
        self.assertTrue(path.read_text().endswith('```\n\n@AGENTS.md\n'))

    def test_existing_agents_symlink_is_preserved(self):
        path = self.project / 'CLAUDE.md'
        path.symlink_to('AGENTS.md')
        self.setup_project()
        self.assertTrue(path.is_symlink())
        self.assertTrue(path.is_file())

    def test_external_claude_symlink_is_rejected_without_overwrite(self):
        outside = self.base / 'external.md'
        outside.write_text('Private instructions')
        (self.project / 'CLAUDE.md').symlink_to(outside)
        self.setup_project(ok=False)
        self.assertEqual(outside.read_text(), 'Private instructions')
        self.assertFalse((self.project / 'AGENTS.md').exists())
