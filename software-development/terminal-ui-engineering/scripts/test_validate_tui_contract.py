#!/usr/bin/env python3
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from typing import Any

SCRIPT=Path(__file__).with_name("validate_tui_contract.py")
class TuiContractTests(unittest.TestCase):
 def setUp(self): self.tmp=tempfile.TemporaryDirectory(); self.addCleanup(self.tmp.cleanup); self.root=Path(self.tmp.name); self.manifest=self.root/"contract.json"; self.write()
 def data(self,**overrides:Any):
  value={"schema_version":"1.0","kind":"terminal-ui","application":{"name":"orbit-tui","primary_user":"operator","core_task":"Inspect and operate deployments"},"screens":[{"id":"deployments","purpose":"List deployments","minimum_size":{"columns":80,"rows":24},"focus_order":["list","details"],"states":["loading","empty","error","ready"]},{"id":"confirm-restart","purpose":"Confirm restart","minimum_size":{"columns":60,"rows":16},"focus_order":["cancel","confirm"],"states":["ready","submitting","error"]}],"keybindings":[{"key":"q","action":"quit","scope":"global","discoverable":True},{"key":"ctrl+c","action":"cancel-or-quit","scope":"global","discoverable":True},{"key":"r","action":"restart","scope":"deployments","discoverable":True}],"operations":[{"id":"restart","screen":"deployments","async":True,"cancellable":True,"destructive":True,"confirmation_screen":"confirm-restart","success_state":"Refresh selected deployment","failure_state":"Preserve focus and show retry"}],"terminal":{"alternate_screen":True,"restore_on_exit":True,"resize_behavior":"Reflow and preserve selected item","color_mode":"auto with NO_COLOR fallback","unicode_fallback":"ASCII symbols","non_tty_behavior":"Print a concise diagnostic and exit non-zero"},"compatibility":{"platforms":["linux","macos","windows"],"terminals":["xterm-compatible","windows-terminal"],"minimum_sizes":["60x16","80x24"]},"verification":{"state_tests":True,"snapshot_tests":True,"virtual_terminal_tests":True,"pty_tests":True,"cleanup_test":"Terminal modes restored after normal exit, error, panic and signal"}}; value.update(overrides); return value
 def write(self,**overrides): self.manifest.write_text(json.dumps(self.data(**overrides),indent=2)+"\n")
 def run_cli(self): return subprocess.run([sys.executable,str(SCRIPT),"check","--manifest",str(self.manifest),"--json"],text=True,capture_output=True,check=False)
 def test_reference_contract_passes_read_only(self): before=self.manifest.read_bytes(); r=self.run_cli(); self.assertEqual(r.returncode,0,r.stderr); self.assertEqual(json.loads(r.stdout)["status"],"PASS"); self.assertEqual(before,self.manifest.read_bytes())
 def test_screen_ids_and_keybindings_are_unique_per_scope(self): screens=self.data()["screens"]; self.write(screens=screens+[dict(screens[0])]); self.assertNotEqual(self.run_cli().returncode,0); keys=self.data()["keybindings"]; self.write(keybindings=keys+[dict(keys[0])]); self.assertNotEqual(self.run_cli().returncode,0)
 def test_global_quit_and_cancel_paths_are_required(self):
  keys=[k for k in self.data()["keybindings"] if k["action"]!="quit"]; self.write(keybindings=keys); self.assertNotEqual(self.run_cli().returncode,0)
  keys=[k for k in self.data()["keybindings"] if k["action"]!="cancel-or-quit"]; keys.append({"key":"ctrl+c","action":"uncancellable","scope":"global","discoverable":True}); self.write(keybindings=keys); self.assertNotEqual(self.run_cli().returncode,0)
 def test_operations_reference_screens_and_destructive_confirmation(self): ops=self.data()["operations"]; ops[0]["screen"]="missing"; self.write(operations=ops); self.assertNotEqual(self.run_cli().returncode,0); ops=self.data()["operations"]; ops[0]["confirmation_screen"]=""; self.write(operations=ops); self.assertNotEqual(self.run_cli().returncode,0)
 def test_destructive_confirmation_screen_is_distinct_and_operation_bound(self):
  data=self.data(); data["operations"][0]["confirmation_screen"]=data["operations"][0]["screen"]; self.write(**data); result=self.run_cli(); self.assertEqual(result.returncode,2); self.assertIn("confirmation screen",result.stderr)
  data=self.data(); confirmation=next(screen for screen in data["screens"] if screen["id"]==data["operations"][0]["confirmation_screen"]); confirmation["purpose"]="Show generic details"; self.write(**data); result=self.run_cli(); self.assertEqual(result.returncode,2); self.assertIn("operation",result.stderr)
  data=self.data(); confirmation=next(screen for screen in data["screens"] if screen["id"]==data["operations"][0]["confirmation_screen"]); confirmation["focus_order"]=["confirm"]; self.write(**data); result=self.run_cli(); self.assertEqual(result.returncode,2); self.assertIn("cancel",result.stderr)
  data=self.data(); confirmation=next(screen for screen in data["screens"] if screen["id"]==data["operations"][0]["confirmation_screen"]); confirmation["focus_order"]=["confirm","cancel"]; self.write(**data); result=self.run_cli(); self.assertEqual(result.returncode,2); self.assertIn("before confirm",result.stderr)
 def test_screen_references_reject_wrong_json_types_without_traceback(self):
  keys=self.data()["keybindings"]; keys[2]["scope"]=[]; self.write(keybindings=keys); result=self.run_cli(); self.assertEqual(result.returncode,2); self.assertNotIn("Traceback",result.stderr)
  ops=self.data()["operations"]; ops[0]["screen"]=[]; self.write(operations=ops); result=self.run_cli(); self.assertEqual(result.returncode,2); self.assertNotIn("Traceback",result.stderr)
  ops=self.data()["operations"]; ops[0]["confirmation_screen"]={}; self.write(operations=ops); result=self.run_cli(); self.assertEqual(result.returncode,2); self.assertNotIn("Traceback",result.stderr)
 def test_async_operation_requires_failure_and_cancellation_contract(self): ops=self.data()["operations"]; ops[0]["cancellable"]=False; ops[0]["failure_state"]=""; self.write(operations=ops); self.assertNotEqual(self.run_cli().returncode,0)
 def test_terminal_cleanup_and_fallbacks_are_required(self): terminal=self.data()["terminal"]; terminal["restore_on_exit"]=False; self.write(terminal=terminal); self.assertNotEqual(self.run_cli().returncode,0); terminal=self.data()["terminal"]; terminal["unicode_fallback"]=""; self.write(terminal=terminal); self.assertNotEqual(self.run_cli().returncode,0)
 def test_operation_states_reject_deferred_placeholders(self):
  for field in ("success_state","failure_state"):
   for value in ("todo","tbd","later","pending","unknown","placeholder"):
    with self.subTest(field=field,value=value): operations=self.data()["operations"]; operations[0][field]=value; self.write(operations=operations); self.assertEqual(self.run_cli().returncode,2)
  operations=self.data()["operations"]; operations[0]["success_state"]="Refresh the selected deployment from the authoritative source."; operations[0]["failure_state"]="Preserve focus, explain the failure, and offer a safe retry."; self.write(operations=operations); self.assertEqual(self.run_cli().returncode,0)
 def test_terminal_and_cleanup_contracts_reject_deferred_placeholders(self):
  for field in ("resize_behavior","color_mode","unicode_fallback","non_tty_behavior"):
   for value in ("todo","tbd","later","pending","unknown","placeholder"):
    with self.subTest(field=field,value=value): terminal=self.data()["terminal"]; terminal[field]=value; self.write(terminal=terminal); self.assertEqual(self.run_cli().returncode,2)
  for value in ("todo","tbd","later","pending","unknown","placeholder"):
   with self.subTest(field="cleanup_test",value=value): verification=self.data()["verification"]; verification["cleanup_test"]=value; self.write(verification=verification); self.assertEqual(self.run_cli().returncode,2)
  terminal=self.data()["terminal"]; terminal["resize_behavior"]="Reflow and preserve the selected item."; terminal["color_mode"]="Use automatic color with a NO_COLOR fallback."; terminal["unicode_fallback"]="Use equivalent ASCII symbols."; terminal["non_tty_behavior"]="Print a concise diagnostic and return non-zero."; verification=self.data()["verification"]; verification["cleanup_test"]="Assert terminal modes are restored after normal exit, error, panic, and signal."; self.write(terminal=terminal,verification=verification); self.assertEqual(self.run_cli().returncode,0)
 def test_layered_verification_is_required(self): verification=self.data()["verification"]; verification["pty_tests"]=False; self.write(verification=verification); self.assertNotEqual(self.run_cli().returncode,0)
 def test_duplicate_keys_and_credentials_fail_without_echo(self): self.manifest.write_text('{"schema_version":"1.0","schema_version":"2.0"}'); self.assertNotEqual(self.run_cli().returncode,0); marker="EXAMPLEVALUEWITH24CHARACTERS"; app=self.data()["application"]; app["core_task"]=f"apiKey={marker}"; self.write(application=app); r=self.run_cli(); self.assertNotEqual(r.returncode,0); self.assertNotIn(marker,r.stdout+r.stderr)
 def test_invalid_utf8_manifest_is_rejected_without_traceback(self): self.manifest.write_bytes(b'{"application":"\xff"}'); r=self.run_cli(); self.assertEqual(r.returncode,2); self.assertIn("could not be read as valid JSON",r.stderr); self.assertNotIn("Traceback",r.stderr)
 def test_huge_integer_manifest_is_rejected_without_traceback(self): self.manifest.write_text('{"schema_version":'+"9"*5000+'}'); r=self.run_cli(); self.assertEqual(r.returncode,2); self.assertIn("could not be read as valid JSON",r.stderr); self.assertNotIn("Traceback",r.stderr)
 def test_encoded_and_uri_credentials_fail_without_echo(self):
  marker="EXAMPLEVALUEWITH24CHARACTERS"
  for value in (f"clientSecr\\u0065t={marker}",f"accessKey={marker}",f"privateKey={marker}",f"passphrase={marker}",f"source=https://{marker}@example.test/path",f'Authorization: ***"Bearer {marker}"'):
   with self.subTest(value=value.split("=",1)[0]): app=self.data()["application"]; app["core_task"]=value; self.write(application=app); r=self.run_cli(); self.assertNotEqual(r.returncode,0); self.assertNotIn(marker,r.stdout+r.stderr)
  app=self.data()["application"]; app["core_task"]="Document Bearer authorization without assigning a credential value."; self.write(application=app); r=self.run_cli(); self.assertEqual(r.returncode,0,r.stderr)
 def test_repeated_quote_serialized_credentials_fail_without_echo(self):
  marker="EXAMPLEVALUEWITH24CHARACTERS"
  for value in (f"config={{'''apiKey''': '''{marker}'''}}",f'config={{"""apiKey""": """{marker}"""}}'):
   with self.subTest(delimiter=value[8:11]): app=self.data()["application"]; app["core_task"]=value; self.write(application=app); result=self.run_cli(); self.assertEqual(result.returncode,2); self.assertNotIn(marker,result.stdout+result.stderr)
  app=self.data()["application"]; app["core_task"]="Document the triple-quoted apiKey example without assigning a value."; self.write(application=app); result=self.run_cli(); self.assertEqual(result.returncode,0,result.stderr)
 def test_compact_uppercase_credential_identifier_fails_without_echo(self):
  marker="EXAMPLEVALUEWITH24CHARACTERS"
  for value in (f"PROD_CLIENTSECRET={marker}",f"CLIENTSECRET_PROD={marker}",f"CLIENTSECRETV3={marker}",f"INTERNALAPIKEY_PROD={marker}",f"PROD%5FCLIENTSECRET={marker}",f"CLIENTSECRET%5FPROD={marker}",f"CLIENTSECRETV%33={marker}",f"INTERNALAPIKEY%5FPROD={marker}",f"CLIENTSECRETPROD={marker}",f"INTERNALAPIKEYPROD={marker}",f"CLIENTSECRETSTAGING={marker}",f"ACCESSKEYIDUAT={marker}",f"PASSWORDDEV={marker}",f"PRIVATEKEYLOCAL={marker}",f"CLIENTSECRETPR%4FD={marker}",f"INTERNALAPIKEYSTAG%49NG={marker}"):
   with self.subTest(identifier=value.split("=",1)[0]): app=self.data()["application"]; app["core_task"]=value; self.write(application=app); result=self.run_cli(); self.assertEqual(result.returncode,2); self.assertNotIn(marker,result.stdout+result.stderr)
  app["core_task"]="CLIENTSECRET rotation policy"; self.write(application=app); result=self.run_cli(); self.assertEqual(result.returncode,0,result.stderr)
 def test_lowercase_and_separated_credential_assignments_fail_without_echo(self):
  marker="EXAMPLEVALUEWITH24CHARACTERS"
  for value in (f"clientsecretprod={marker}",f"config.api.key={marker}",f"api key={marker}"):
   with self.subTest(identifier=value.split("=",1)[0]): app=self.data()["application"]; app["core_task"]=value; self.write(application=app); result=self.run_cli(); self.assertEqual(result.returncode,2); self.assertNotIn(marker,result.stdout+result.stderr)
  app=self.data()["application"]; app["core_task"]="Document config.api.key and clientsecretprod rotation without assigning values."; self.write(application=app); result=self.run_cli(); self.assertEqual(result.returncode,0,result.stderr)
 def test_non_finite_json_numbers_are_rejected(self): self.manifest.write_text(json.dumps(self.data()).replace('"columns": 80','"columns": NaN')); r=self.run_cli(); self.assertNotEqual(r.returncode,0); self.assertIn("non-finite",r.stderr)
if __name__=="__main__": unittest.main()
