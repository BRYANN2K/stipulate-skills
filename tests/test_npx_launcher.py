from pathlib import Path
import json
import os
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]

class LauncherTests(unittest.TestCase):
    def run_cli(self, cwd, *args):
        return subprocess.run(['node', str(ROOT/'bin/install.mjs'), *args],cwd=cwd,capture_output=True,text=True)

    def test_preview_does_not_create_project_files(self):
        with tempfile.TemporaryDirectory() as tmp:
            result=self.run_cli(tmp,'--dry-run')
            self.assertEqual(result.returncode,0,result.stderr)
            self.assertEqual(list(Path(tmp).iterdir()),[])
            self.assertIn('opencode',result.stdout)

    def test_invalid_agent_fails_before_writes(self):
        with tempfile.TemporaryDirectory() as tmp:
            result=self.run_cli(tmp,'--agent','unknown','--yes')
            self.assertNotEqual(result.returncode,0)
            self.assertEqual(list(Path(tmp).iterdir()),[])

    def test_global_preview_uses_host_config_for_commands_and_plugin(self):
        with tempfile.TemporaryDirectory() as tmp:
            config=Path(tmp).resolve()/'Orca config'
            env={**os.environ,'OPENCODE_CONFIG_DIR':str(config),'XDG_CONFIG_HOME':str(Path(tmp)/'unused-xdg')}
            result=subprocess.run(['node',str(ROOT/'bin/install.mjs'),'--global','--dry-run'],
                cwd=tmp,env=env,capture_output=True,text=True)
            self.assertEqual(result.returncode,0,result.stderr)
            decoder=json.JSONDecoder()
            _,offset=decoder.raw_decode(result.stdout)
            report=decoder.decode(result.stdout[offset:].strip())
            self.assertEqual(report['commands'],str(config/'commands'))
            self.assertEqual(report['plugin']['destination'],str(config/'plugins/stipulate'))
            self.assertEqual(list(Path(tmp).iterdir()),[])

    def test_conflicting_command_blocks_skill_install(self):
        with tempfile.TemporaryDirectory() as tmp:
            folder=Path(tmp)/'.opencode/commands';folder.mkdir(parents=True)
            custom=folder/'stip-apply.md';custom.write_text('custom command')
            result=self.run_cli(tmp,'--yes')
            self.assertNotEqual(result.returncode,0)
            self.assertIn('Conflicting command',result.stderr)
            self.assertFalse((Path(tmp)/'.agents').exists())
            self.assertEqual(custom.read_text(),'custom command')
