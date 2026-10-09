"""The real EXTENSION_SCRIPT (hooks/core/settings.ts) run with python3 on a temporary project.

The mod's tests (`claude plugin test`) run without processes and answer the script with a fake; this
file runs the script itself, as the core does (`python3 -c <script>`, the request on stdin), for
AC-47 and AC-48: only `extensions.<id>.enabled` (and `path` when newly enabled) changes, the file
keeps its layout, a disable a change not yet archived selects is refused under the lock, and every
failure is one line of JSON on stderr.

Run: python3 -m unittest discover -s packages/claude-code/tests/python -v
"""
import hashlib
import json
import os
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

SETTINGS = Path(__file__).resolve().parents[2] / 'hooks' / 'core' / 'settings.ts'
PYTHON = shutil.which('python3')


def extension_script() -> str:
    """The script's text as the template literal in settings.ts evaluates to it."""
    source = SETTINGS.read_text(encoding='utf-8')
    start = source.index('export const EXTENSION_SCRIPT = `') + len('export const EXTENSION_SCRIPT = `')
    end = source.index('\n`', start)
    body = source[start:end + 1]
    assert '${' not in body, 'the script must not interpolate'
    out, i = [], 0
    while i < len(body):
        c = body[i]
        if c == '\\':
            nxt = body[i + 1]
            assert nxt in '\\`', f'unexpected template escape \\{nxt}'
            out.append(nxt)
            i += 2
        else:
            out.append(c)
            i += 1
    return ''.join(out)


@unittest.skipUnless(PYTHON, 'python3 is not on PATH')
class ExtensionScript(unittest.TestCase):
    def setUp(self):
        self.script = extension_script()
        self.root = Path(tempfile.mkdtemp(prefix='stip-ext-'))
        self.addCleanup(shutil.rmtree, self.root, True)
        (self.root / '.workflow' / 'changes').mkdir(parents=True)
        self.config = self.root / '.workflow' / 'config.json'

    def change(self, name, phase, extensions):
        d = self.root / '.workflow' / 'changes' / name
        d.mkdir(parents=True, exist_ok=True)
        (d / 'state.json').write_text(json.dumps({'id': name, 'phase': phase, 'extensions': extensions}))

    def run_script(self, ident, enabled, revision=None):
        text = self.config.read_bytes().decode('utf-8') if self.config.exists() else ''
        req = {
            'lock': str(self.root / '.workflow' / '.lock'),
            'config': str(self.config),
            'changes': str(self.root / '.workflow' / 'changes'),
            'revision': revision or hashlib.sha256(text.encode('utf-8')).hexdigest(),
            'id': ident,
            'enabled': enabled,
            'path': f'.workflow/extensions/{ident}',
        }
        r = subprocess.run([PYTHON, '-c', self.script], input=json.dumps(req), capture_output=True, text=True, timeout=30)
        return r

    def error_of(self, r):
        self.assertNotEqual(r.returncode, 0)
        lines = r.stderr.strip().splitlines()
        self.assertEqual(len(lines), 1, r.stderr)
        self.assertNotIn('Traceback', r.stderr)
        return json.loads(lines[0])

    def write(self, text):
        self.config.write_text(text, encoding='utf-8')

    BASE = {
        'schema_version': 1,
        'extensions': {
            'cli-tooling': {'enabled': True, 'path': '.workflow/extensions/cli-tooling'},
            'ai-engineering': {'enabled': True, 'path': '.workflow/extensions/ai-engineering', 'note': 'kept'},
        },
        'settings': {'require_user_approval': True},
        'custom': {'é': [1, 2.5, None]},
    }

    def test_disable_selected_by_a_live_change_is_refused_and_names_it(self):
        self.write(json.dumps(self.BASE, indent=2, ensure_ascii=False) + '\n')
        self.change('demo', 'exploring', ['cli-tooling'])
        self.change('other', 'applying', ['cli-tooling'])
        before = self.config.read_bytes()
        err = self.error_of(self.run_script('cli-tooling', False))
        self.assertEqual(err, {'error': 'in use', 'users': ['demo', 'other']})
        self.assertEqual(self.config.read_bytes(), before)
        self.assertFalse((self.root / '.workflow' / '.lock').exists())

    def test_archived_and_non_list_selections_do_not_count(self):
        # A string `extensions` must not match by substring (D6); an archived change does not count.
        self.write(json.dumps(self.BASE, indent=2, ensure_ascii=False) + '\n')
        self.change('archived-one', 'archived', ['ai-engineering'])
        self.change('odd', 'exploring', 'xx-ai-engineering-yy')
        r = self.run_script('ai-engineering', False)
        self.assertEqual(r.returncode, 0, r.stderr)
        doc = json.loads(self.config.read_text(encoding='utf-8'))
        expected = json.loads(json.dumps(self.BASE))
        expected['extensions']['ai-engineering']['enabled'] = False
        self.assertEqual(doc, expected)
        self.assertEqual(list(doc), list(self.BASE))

    def test_enable_writes_only_the_flag_and_path_and_keeps_the_layout(self):
        layouts = {
            'two spaces': json.dumps(self.BASE, indent=2, ensure_ascii=False) + '\n',
            'four spaces, no final newline': json.dumps(self.BASE, indent=4, ensure_ascii=False),
            'tabs': json.dumps(self.BASE, indent='\t', ensure_ascii=False) + '\n',
            'one line, compact': json.dumps(self.BASE, separators=(',', ':'), ensure_ascii=False),
            'escaped non-ASCII': json.dumps(self.BASE, indent=2) + '\n',
        }
        for name, text in layouts.items():
            with self.subTest(name):
                self.write(text)
                r = self.run_script('new-one', True)
                self.assertEqual(r.returncode, 0, r.stderr)
                after = self.config.read_text(encoding='utf-8')
                expected = json.loads(json.dumps(self.BASE))
                expected['extensions']['new-one'] = {'enabled': True, 'path': '.workflow/extensions/new-one'}
                self.assertEqual(json.loads(after), expected)
                self.assertEqual(list(json.loads(after)), list(self.BASE))
                # Written exactly as the same layout writes the new document.
                if name == 'two spaces':
                    self.assertEqual(after, json.dumps(expected, indent=2, ensure_ascii=False) + '\n')
                elif name.startswith('four'):
                    self.assertEqual(after, json.dumps(expected, indent=4, ensure_ascii=False))
                elif name == 'tabs':
                    self.assertEqual(after, json.dumps(expected, indent='\t', ensure_ascii=False) + '\n')
                elif name.startswith('one line'):
                    self.assertEqual(after, json.dumps(expected, separators=(',', ':'), ensure_ascii=False))
                else:
                    self.assertEqual(after, json.dumps(expected, indent=2) + '\n')

    def test_reenable_keeps_its_path_and_other_fields(self):
        doc = json.loads(json.dumps(self.BASE))
        doc['extensions']['ai-engineering']['enabled'] = False
        self.write(json.dumps(doc, indent=2, ensure_ascii=False) + '\n')
        self.assertEqual(self.run_script('ai-engineering', True).returncode, 0)
        self.assertEqual(json.loads(self.config.read_text())['extensions']['ai-engineering'], {'enabled': True, 'path': '.workflow/extensions/ai-engineering', 'note': 'kept'})

    def test_stale_revision_and_held_lock_are_refused_without_writing(self):
        self.write(json.dumps(self.BASE, indent=2) + '\n')
        before = self.config.read_bytes()
        self.assertIn('changed elsewhere', self.error_of(self.run_script('cli-tooling', False, revision='0' * 64))['error'])
        lock = self.root / '.workflow' / '.lock'
        lock.write_text('someone')
        self.assertIn('locked', self.error_of(self.run_script('cli-tooling', False))['error'])
        self.assertTrue(lock.exists(), 'another holder keeps its lock')
        self.assertEqual(self.config.read_bytes(), before)

    def test_missing_or_invalid_config_is_one_clear_line(self):
        err = self.error_of(self.run_script('cli-tooling', True))
        self.assertIn('config.json is missing', err['error'])
        self.write('{ "schema_version": 1, "extensions": { ')
        err = self.error_of(self.run_script('cli-tooling', True))
        self.assertIn('not valid JSON', err['error'])
        self.write('[]')
        self.assertIn('no extensions object', self.error_of(self.run_script('cli-tooling', True))['error'])
        self.assertFalse((self.root / '.workflow' / '.lock').exists())


    # --- Attempt 3 (C): the edit is textual; only the touched member changes ---

    REAL = (
        '{\n  "schema_version": 1,\n  "extensions": {\n    "cli-tooling": {\n      "enabled": true,\n'
        '      "path": ".workflow/extensions/cli-tooling"\n    }\n  },\n  "settings": {\n    "require_user_approval": true\n  }\n}\n'
    )

    def edited(self, text, ident, enabled):
        self.config.write_bytes(text.encode('utf-8'))
        r = self.run_script(ident, enabled)
        self.assertEqual(r.returncode, 0, r.stderr)
        return self.config.read_bytes().decode('utf-8')

    def test_c_file_mode_is_kept(self):
        self.write(self.REAL)
        os.chmod(self.config, 0o600)
        self.assertEqual(self.run_script('cli-tooling', False).returncode, 0)
        self.assertEqual(os.stat(self.config).st_mode & 0o777, 0o600)
        os.chmod(self.config, 0o640)
        self.assertEqual(self.run_script('new-one', True).returncode, 0)
        self.assertEqual(os.stat(self.config).st_mode & 0o777, 0o640)

    def test_c_crlf_is_kept(self):
        crlf = self.REAL.replace('\n', '\r\n')
        after = self.edited(crlf, 'cli-tooling', False)
        self.assertEqual(after, crlf.replace('"enabled": true', '"enabled": false'))
        after = self.edited(crlf, 'new-one', True)
        self.assertNotIn('\n', after.replace('\r\n', ''))
        self.assertIn('    "new-one": {\r\n      "enabled": true,\r\n      "path": ".workflow/extensions/new-one"\r\n    }\r\n', after)

    def test_c_inline_values_and_number_spellings_are_kept(self):
        text = '{\n  "schema_version": 1,\n  "tags": ["a", "b"],\n  "extensions": {"x": {"enabled": true, "path": ".workflow/extensions/x"}},\n  "n": 1.50,\n  "big": 1e3\n}\n'
        self.assertEqual(self.edited(text, 'x', False), text.replace('"enabled": true', '"enabled": false'))
        after = self.edited(text, 'y', True)
        self.assertEqual(after, text.replace('extensions/x"}}', 'extensions/x"}, "y": {"enabled": true, "path": ".workflow/extensions/y"}}'))

    def test_c_one_line_file_with_comma_space_in_a_string_stays_compact(self):
        text = '{"name":"a, b","extensions":{}}'
        self.assertEqual(self.edited(text, 'y', True), '{"name":"a, b","extensions":{"y":{"enabled":true,"path":".workflow/extensions/y"}}}')

    def test_c_bom_and_entry_shapes(self):
        bom = '\ufeff' + self.REAL
        self.assertEqual(self.edited(bom, 'cli-tooling', False), bom.replace('"enabled": true', '"enabled": false'))
        # An entry without enabled gets it, after its own members; a non-object entry is replaced when enabling.
        text = '{\n  "extensions": {\n    "q": {\n      "path": "p"\n    },\n    "r": true\n  }\n}\n'
        self.assertEqual(self.edited(text, 'q', True), text.replace('"path": "p"\n', '"path": "p",\n      "enabled": true\n'))
        self.assertEqual(json.loads(self.edited(text, 'r', True))['extensions']['r'], {'enabled': True, 'path': '.workflow/extensions/r'})


if __name__ == '__main__':
    unittest.main()
