import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('native_agents', ROOT/'scripts/configure_agents.py')
native = importlib.util.module_from_spec(spec)
spec.loader.exec_module(native)


def configuration(host='opencode', **client):
    return {'orchestration': {'version': 1, 'clients': {host: client}}}


def capabilities(host='opencode'):
    return {'version': 1, 'host': host, 'models': {
        ('vendor/reasoner' if host == 'opencode' else 'reasoner'): {
            'efforts': ['low', 'high'], 'default_effort': 'low',
            'variants': {
                'deep': {'effort': 'high', 'fast': False},
                'deep-priority': {'effort': 'high', 'fast': True},
                'light': {'effort': 'low', 'fast': False},
                'light-priority': {'effort': 'low', 'fast': True},
            }}}}


class NativeAgentsTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        (self.root/'.workflow').mkdir()
        self.config_path = self.root/'.workflow/config.json'
        self.config_path.write_text('{}')

    def config(self, value):
        self.config_path.write_text(json.dumps(value))

    def files(self):
        return {p.relative_to(self.root).as_posix(): p.read_bytes()
                for p in self.root.rglob('*') if p.is_file()}

    def test_inherited_default_and_native_formats(self):
        for host in native.HOSTS:
            with self.subTest(host=host):
                result = native.configure(self.root, host)
                self.assertEqual(result['bindings'], {'*/*': 'stip-worker'})
                self.assertEqual(len(result['added']), 1)
                output = (self.root/result['added'][0]).read_text()
                self.assertNotIn('model:', output)
                self.assertNotIn('model =', output)
                self.assertIn('coordinator', output)
                if host == 'codex':
                    if sys.version_info >= (3, 11):
                        import tomllib
                        parsed = tomllib.loads(output)
                        self.assertEqual(parsed['name'], 'stip-worker')
                        self.assertIn('developer_instructions', parsed)
                    else:
                        self.assertIn('name = "stip-worker"', output)
                        self.assertIn('developer_instructions =', output)
                elif host == 'opencode':
                    self.assertIn('mode: "subagent"', output)
                    self.assertIn('"action": "subagent"', output)
                else:
                    self.assertIn('disallowedTools: ["Agent"]', output)
                self.assertEqual(native.configure(self.root, host)['added'], [])

    def test_dry_run_has_no_writes_even_manifest_or_lock(self):
        before = self.files()
        result = native.configure(self.root, 'opencode', dry_run=True)
        self.assertEqual(len(result['added']), 1)
        self.assertEqual(before, self.files())

    def test_preserves_other_hosts_and_unrelated_files(self):
        self.config(configuration('opencode', roles={'backend': {}}))
        custom = self.root/'.opencode/agents/custom.md'
        custom.parent.mkdir(parents=True)
        custom.write_text('Keep my agent')
        claude = self.root/'.claude/agents/stip-worker.md'
        claude.parent.mkdir(parents=True)
        claude.write_text('Other host')
        original_config = self.config_path.read_bytes()
        native.configure(self.root, 'opencode')
        self.assertEqual(custom.read_text(), 'Keep my agent')
        self.assertEqual(claude.read_text(), 'Other host')
        self.assertEqual(self.config_path.read_bytes(), original_config)

    def test_model_effort_fast_maps_to_one_verified_variant(self):
        config = configuration(roles={'backend': {'model': 'vendor/reasoner', 'effort': 'high', 'fast': True}})
        files, _ = native.build_projection(config, 'opencode', capabilities())
        output = files['.opencode/agents/stip-role-backend.md'].decode()
        self.assertIn('model: "vendor/reasoner#deep-priority"', output)
        self.assertNotIn('request:', output)
        self.assertNotIn('codex', output)
        config['orchestration']['clients']['opencode']['roles']['backend']['fast'] = 'inherit'
        files, _ = native.build_projection(config, 'opencode', capabilities())
        self.assertIn('vendor/reasoner#deep"', files['.opencode/agents/stip-role-backend.md'].decode())

    def test_fast_variant_name_is_not_a_speed_tier(self):
        caps = capabilities()
        caps['models']['vendor/reasoner']['variants'] = {'fast': {'effort': 'low'}}
        self.config(configuration(roles={'backend': {'model': 'vendor/reasoner', 'fast': True}}))
        before = self.files()
        with self.assertRaisesRegex(ValueError, 'verified variant'):
            native.configure(self.root, 'opencode', caps, dry_run=True)
        self.assertEqual(before, self.files())

    def test_unavailable_or_unsupported_model_options_fail(self):
        for assignment in [
            {'model': 'vendor/missing'},
            {'model': 'vendor/reasoner', 'effort': 'ultra'},
            {'model': 'vendor/reasoner', 'fast': True},  # ambiguous without effort
            {'effort': 'high'},  # no coordinator model
        ]:
            with self.subTest(assignment=assignment):
                self.config(configuration(roles={'backend': assignment}))
                with self.assertRaises(ValueError):
                    native.configure(self.root, 'opencode', capabilities(), dry_run=True)
                self.assertFalse((self.root/'.opencode').exists())

    def test_native_explicit_model_uses_verified_default_effort(self):
        for host in ['codex', 'claude-code']:
            with self.subTest(host=host):
                config = configuration(host, roles={'documentation': {'model': 'reasoner'}})
                files, _ = native.build_projection(config, host, capabilities(host))
                output = next(value.decode() for name, value in files.items() if 'documentation' in name)
                self.assertIn('model_reasoning_effort = "low"' if host == 'codex' else 'effort: "low"', output)
                caps = capabilities(host)
                del caps['models']['reasoner']['default_effort']
                with self.assertRaisesRegex(ValueError, 'default_effort'):
                    native.build_projection(config, host, caps)

    def test_native_per_worker_fast_rejects_true_and_false(self):
        for host in ['codex', 'claude-code']:
            for fast in [True, False]:
                config = configuration(host, roles={'backend': {'model': 'reasoner', 'fast': fast}})
                with self.assertRaisesRegex(ValueError, 'per-worker Fast'):
                    native.build_projection(config, host, capabilities(host))

    def test_resolution_precedence_and_model_option_reset(self):
        config = configuration(roles={'backend': {'model': 'vendor/b'}},
            phases={'apply': {'effort': 'high'}},
            phase_roles={'apply': {'backend': {'fast': False}}})
        config['orchestration']['defaults'] = {'model': 'vendor/a', 'effort': 'low', 'fast': True}
        defaults, client = native.validate_config(config, 'opencode')
        actual = native.resolve_assignment(defaults, client, 'backend', 'apply')
        self.assertEqual(actual, {'model': 'vendor/b', 'effort': 'inherit', 'fast': False})
        client['phase_roles']['apply']['backend']['effort'] = 'low'
        self.assertEqual(native.resolve_assignment(defaults, client, 'backend', 'apply')['effort'], 'low')

    def test_phase_bindings_include_role_precedence(self):
        config = configuration(roles={'backend': {}}, phases={'check': {}},
                               phase_roles={'docs': {'documentation': {}}})
        files, bindings = native.build_projection(config, 'opencode')
        self.assertIn('check/backend', bindings)
        self.assertIn('docs/documentation', bindings)
        self.assertEqual(bindings['*/*'], 'stip-worker')
        self.assertEqual(len(files), len(bindings))

    def test_bound_agent_requires_catalog_and_does_not_overwrite(self):
        config = configuration(roles={'security': {'agent': 'my-reviewer'}})
        caps = capabilities()
        with self.assertRaisesRegex(ValueError, 'Native agent'):
            native.build_projection(config, 'opencode', caps)
        caps['agents'] = ['my-reviewer']
        files, bindings = native.build_projection(config, 'opencode', caps)
        self.assertEqual(bindings['*/security'], 'my-reviewer')
        self.assertEqual(len(files), 1)
        config['orchestration']['clients']['opencode']['roles']['security']['model'] = 'vendor/reasoner'
        with self.assertRaisesRegex(ValueError, 'cannot also override'):
            native.build_projection(config, 'opencode', caps)

    def test_discovery_unknown_fields_and_bad_paths_fail(self):
        invalid = [configuration(roles={'discovery': {}}), configuration(roles={'../escape': {}}),
                   configuration(roles={'backend': {'runtime': 'codex'}}),
                   configuration(phases={'deploy': {}}),
                   configuration(roles={'backend': {'fast': 1}})]
        invalid.append({'orchestration': {'version': 2}})
        invalid.append({'orchestration': {'version': 1, 'defaults': {'max_shared_writers': 2}}})
        for config in invalid:
            with self.subTest(config=config), self.assertRaises(ValueError):
                native.build_projection(config, 'opencode')

    def test_collision_and_customized_owned_file_preserve_batch(self):
        self.config(configuration(roles={'backend': {}}))
        target = self.root/'.opencode/agents/stip-role-backend.md'
        target.parent.mkdir(parents=True)
        target.write_text('Custom agent')
        before = self.files()
        with self.assertRaisesRegex(ValueError, 'Unowned agent collision'):
            native.configure(self.root, 'opencode', dry_run=True)
        self.assertEqual(before, self.files())
        target.unlink()
        native.configure(self.root, 'opencode')
        target.write_text('My edits')
        self.config(configuration(roles={'backend': {}, 'frontend': {}}))
        before = self.files()
        with self.assertRaisesRegex(ValueError, 'Customized generated agent'):
            native.configure(self.root, 'opencode')
        self.assertEqual(before, self.files())

    def test_owned_updates_and_stale_projection_removal(self):
        self.config(configuration(roles={'backend': {}}))
        native.configure(self.root, 'opencode')
        self.config(configuration(roles={'backend': {'model': 'vendor/reasoner', 'effort': 'high'}}))
        result = native.configure(self.root, 'opencode', capabilities())
        self.assertEqual(result['updated'], ['.opencode/agents/stip-role-backend.md'])
        self.config({})
        result = native.configure(self.root, 'opencode')
        self.assertEqual(result['removed'], ['.opencode/agents/stip-role-backend.md'])
        self.assertFalse((self.root/result['removed'][0]).exists())

    def test_symlink_directory_or_file_is_rejected(self):
        external = self.root/'external'
        external.mkdir()
        link = self.root/'.opencode'
        link.symlink_to(external, target_is_directory=True)
        with self.assertRaisesRegex(ValueError, 'symlinks'):
            native.configure(self.root, 'opencode')
        self.assertEqual(list(external.iterdir()), [])

    def test_failed_write_rolls_back_files_and_manifest(self):
        native.configure(self.root, 'opencode')
        self.config(configuration(roles={'backend': {}, 'frontend': {}}))
        before = self.files()
        original = native._replace
        calls = 0
        def fail_second(path, content):
            nonlocal calls
            calls += 1
            if calls == 2:
                raise OSError('simulated disk failure')
            return original(path, content)
        with mock.patch.object(native, '_replace', side_effect=fail_second):
            with self.assertRaises(OSError):
                native.configure(self.root, 'opencode')
        self.assertEqual(before, self.files())

    def test_coordinator_snapshot_pins_options_safely(self):
        config = configuration('codex', roles={'backend': {'effort': 'high'}})
        files, _ = native.build_projection(config, 'codex', capabilities('codex'), 'reasoner')
        output = files['.codex/agents/stip-role-backend.toml'].decode()
        self.assertIn('model = "reasoner"', output)
        self.assertIn('model_reasoning_effort = "high"', output)

    def test_rollback_preserves_an_edit_after_our_write(self):
        native.configure(self.root, 'opencode')
        self.config(configuration(roles={'backend': {}, 'frontend': {}}))
        original = native._replace
        calls = 0
        backend = self.root/'.opencode/agents/stip-role-backend.md'
        def fail_after_user_edit(path, content):
            nonlocal calls
            calls += 1
            if calls == 2:
                backend.write_text('Concurrent user edit')
                raise OSError('simulated disk failure')
            return original(path, content)
        with mock.patch.object(native, '_replace', side_effect=fail_after_user_edit):
            with self.assertRaises(OSError):
                native.configure(self.root, 'opencode')
        self.assertEqual(backend.read_text(), 'Concurrent user edit')
        self.assertFalse((self.root/'.opencode/agents/stip-role-frontend.md').exists())

    def test_cli_requires_host_and_has_machine_readable_dry_run(self):
        result = subprocess.run([sys.executable, str(ROOT/'scripts/configure_agents.py'),
                                 '--project', str(self.root), '--host', 'claude-code', '--dry-run'],
                                capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(json.loads(result.stdout)['dry_run'])
        missing = subprocess.run([sys.executable, str(ROOT/'scripts/configure_agents.py'),
                                  '--project', str(self.root)], capture_output=True, text=True)
        self.assertEqual(missing.returncode, 2)


if __name__ == '__main__':
    unittest.main()
