#!/usr/bin/env python3
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from typing import Any

SCRIPT=Path(__file__).with_name("validate_dashboard_contract.py")
class DashboardContractTests(unittest.TestCase):
 def setUp(self): self.tmp=tempfile.TemporaryDirectory(); self.addCleanup(self.tmp.cleanup); self.root=Path(self.tmp.name); self.manifest=self.root/"contract.json"; self.write()
 def data(self,**overrides:Any):
  value={"schema_version":"1.0","kind":"dashboard","dashboard":{"name":"orbit-operations","mode":"hybrid","primary_users":["operator"],"decisions":["Which deployment needs intervention?"]},"data_sources":[{"id":"deployments-api","owner":"platform","grain":"one row per deployment","freshness":"within 30 seconds","reconciliation":"compare counts with deployment service"}],"metrics":[{"id":"failed-deployments","label":"Failed deployments","source":"deployments-api","formula":"count(status = failed)","grain":"deployment","freshness":"within 30 seconds"}],"resources":[{"id":"deployment","label":"Deployment","source":"deployments-api","identity":"deployment id","statuses":["running","failed","stopped"]}],"filters":[{"id":"status","type":"multi-select","scope":"dashboard","default":"all","shareable":True}],"views":[{"id":"overview","path":"/deployments","purpose":"Prioritize interventions","widgets":[{"id":"failed-count","type":"metric","subject":"failed-deployments"},{"id":"deployment-table","type":"resource-table","subject":"deployment"}],"filters":["status"],"roles":["operator"],"states":["loading","empty","partial","error","ready"]}],"actions":[{"id":"restart","resource":"deployment","roles":["operator"],"destructive":True,"confirmation":"Require resource-scoped confirmation","audit_event":"deployment.restart.requested","success_state":"Accepted then reconcile status","failure_state":"Keep row context and show retry","reconciliation":"Refetch resource and overview metric"}],"permissions":[{"role":"operator","resources":["deployment"],"actions":["restart"]}],"verification":[{"id":"reconcile","claim":"Metric and table reconcile after restart","evidence":"Seeded integration test plus browser journey"}]}; value.update(overrides); return value
 def write(self,**overrides): self.manifest.write_text(json.dumps(self.data(**overrides),indent=2)+"\n")
 def run_cli(self): return subprocess.run([sys.executable,str(SCRIPT),"check","--manifest",str(self.manifest),"--json"],text=True,capture_output=True,check=False)
 def test_reference_contract_passes_read_only(self): before=self.manifest.read_bytes(); r=self.run_cli(); self.assertEqual(r.returncode,0,r.stderr); self.assertEqual(json.loads(r.stdout)["status"],"PASS"); self.assertEqual(before,self.manifest.read_bytes())
 def test_mode_and_unique_ids_are_enforced(self): d=self.data()["dashboard"]; d["mode"]="website"; self.write(dashboard=d); self.assertNotEqual(self.run_cli().returncode,0); sources=self.data()["data_sources"]; self.write(data_sources=sources+[dict(sources[0])]); self.assertNotEqual(self.run_cli().returncode,0)
 def test_metrics_and_resources_reference_sources(self): metrics=self.data()["metrics"]; metrics[0]["source"]="missing"; self.write(metrics=metrics); self.assertNotEqual(self.run_cli().returncode,0); resources=self.data()["resources"]; resources[0]["source"]="missing"; self.write(resources=resources); self.assertNotEqual(self.run_cli().returncode,0)
 def test_widgets_reference_known_subjects_and_filters(self): views=self.data()["views"]; views[0]["widgets"][0]["subject"]="missing"; self.write(views=views); self.assertNotEqual(self.run_cli().returncode,0); views=self.data()["views"]; views[0]["filters"]=["missing"]; self.write(views=views); self.assertNotEqual(self.run_cli().returncode,0)
 def test_view_paths_are_internal_and_canonical(self):
  for path in ("//example.test/path","/../admin",r"/docs\admin","/docs?draft=1","/docs#draft","/%61dmin","/%2e%2e/admin","/%252e%252e/admin","/safe%2f..%2fadmin","/%zz","/%c0%ae/admin","/%u002e%u002e/admin"):
   with self.subTest(path=path): views=self.data()["views"]; views[0]["path"]=path; self.write(views=views); result=self.run_cli(); self.assertEqual(result.returncode,2); self.assertIn("canonical",result.stderr); self.assertNotIn("Traceback",result.stderr)
 def test_destructive_action_requires_confirmation_and_reconciliation(self):
  for confirmation in ("", "none", "not applicable", "n/a", "eventually", "unspecified", "tbd", "later", "todo", "pending", "defer", "deferred", "unknown", "placeholder", "to be determined"):
   with self.subTest(confirmation=confirmation): actions=self.data()["actions"]; actions[0]["confirmation"]=confirmation; self.write(actions=actions); self.assertNotEqual(self.run_cli().returncode,0)
  actions=self.data()["actions"]; actions[0]["reconciliation"]=""; self.write(actions=actions); self.assertNotEqual(self.run_cli().returncode,0)
 def test_semantic_evidence_fields_reject_placeholder_values(self):
  cases=[]
  for value in ("eventually","unspecified","tbd","later","todo","pending","defer","deferred","unknown","placeholder","to be determined","none","not applicable"):
   sources=self.data()["data_sources"]; sources[0]["grain"]=value; cases.append({"data_sources":sources})
   sources=self.data()["data_sources"]; sources[0]["freshness"]=value; cases.append({"data_sources":sources})
   sources=self.data()["data_sources"]; sources[0]["reconciliation"]=value; cases.append({"data_sources":sources})
   metrics=self.data()["metrics"]; metrics[0]["freshness"]=value; cases.append({"metrics":metrics})
   metrics=self.data()["metrics"]; metrics[0]["formula"]=value; cases.append({"metrics":metrics})
   metrics=self.data()["metrics"]; metrics[0]["grain"]=value; cases.append({"metrics":metrics})
   actions=self.data()["actions"]; actions[0]["reconciliation"]=value; cases.append({"actions":actions})
   for field in ("claim","evidence"):
    verification=self.data()["verification"]; verification[0][field]=value; cases.append({"verification":verification})
  for overrides in cases:
   with self.subTest(field=next(iter(overrides))): self.write(**overrides); result=self.run_cli(); self.assertEqual(result.returncode,2); self.assertIn("deferred placeholder",result.stderr)
 def test_semantic_fields_reject_composite_deferrals_but_allow_domain_language(self):
  cases=[]
  actions=self.data()["actions"]; actions[0]["confirmation"]="TODO: define the confirmation later"; cases.append({"actions":actions})
  actions=self.data()["actions"]; actions[0]["reconciliation"]="TBD after implementation"; cases.append({"actions":actions})
  verification=self.data()["verification"]; verification[0]["evidence"]="TODO: collect evidence later"; cases.append({"verification":verification})
  for value in ("TODO implement this contract", "Note: TODO define this contract", "%54ODO: define this contract", "TODO_contract: define later", "TODO123: define later", "T%4FDO_contract: define later", "Deferred: add this contract", "This contract will be implemented later", "This contract is not yet defined", "Future work: define this contract", "Define this contract after implementation", "Plan: define this contract in a later phase", "This contract definition is postponed until implementation is complete", "We intend to specify this contract eventually", "This contract behavior remains to be decided"):
   sources=self.data()["data_sources"]; sources[0]["grain"]=value; cases.append({"data_sources":sources})
   sources=self.data()["data_sources"]; sources[0]["freshness"]=value; cases.append({"data_sources":sources})
   sources=self.data()["data_sources"]; sources[0]["reconciliation"]=value; cases.append({"data_sources":sources})
   metrics=self.data()["metrics"]; metrics[0]["freshness"]=value; cases.append({"metrics":metrics})
   metrics=self.data()["metrics"]; metrics[0]["formula"]=value; cases.append({"metrics":metrics})
   metrics=self.data()["metrics"]; metrics[0]["grain"]=value; cases.append({"metrics":metrics})
   actions=self.data()["actions"]; actions[0]["confirmation"]=value; cases.append({"actions":actions})
   actions=self.data()["actions"]; actions[0]["reconciliation"]=value; cases.append({"actions":actions})
   for field in ("claim","evidence"):
    verification=self.data()["verification"]; verification[0][field]=value; cases.append({"verification":verification})
  for overrides in cases:
   with self.subTest(field=next(iter(overrides))): self.write(**overrides); self.assertEqual(self.run_cli().returncode,2)
  for field,value in (("claim","Pending records are excluded by the reconciliation query."),("evidence","Later failures are covered by a seeded reconciliation assertion.")):
   with self.subTest(field=field): verification=self.data()["verification"]; verification[0][field]=value; self.write(verification=verification); self.assertEqual(self.run_cli().returncode,0)
 def test_semantic_fields_reject_subject_specific_future_promises(self):
  paths=(("data_sources","grain"),("data_sources","freshness"),("data_sources","reconciliation"),("metrics","formula"),("metrics","grain"),("metrics","freshness"),("actions","confirmation"),("actions","reconciliation"),("verification","claim"),("verification","evidence"))
  for group,field in paths:
   label=f"{group} {field}".replace("_"," ")
   for value in (f"{label.title()} remains to be decided.",f"The team intends to define {label} eventually.",f"We plan to define {label} in a later phase."):
    with self.subTest(group=group,field=field,value=value): items=self.data()[group]; items[0][field]=value; self.write(**{group:items}); self.assertEqual(self.run_cli().returncode,2)
 def test_semantic_fields_reject_interposed_future_promises(self):
  paths=(("data_sources","grain"),("data_sources","freshness"),("data_sources","reconciliation"),("metrics","formula"),("metrics","grain"),("metrics","freshness"),("actions","confirmation"),("actions","reconciliation"),("verification","claim"),("verification","evidence"))
  negatives=("We plan, after review, to define this behavior in a later phase.","The team plans on defining this behavior in a later phase.","Our plan is to define this behavior in a later phase.","The team intends, after review, to specify this behavior eventually.","This behavior remains, for now, to be decided.")
  for group,field in paths:
   for value in negatives:
    with self.subTest(group=group,field=field,value=value): items=self.data()[group]; items[0][field]=value; self.write(**{group:items}); self.assertEqual(self.run_cli().returncode,2)
   with self.subTest(group=group,field=field,positive=True): items=self.data()[group]; items[0][field]="Use a concrete source invariant and reconcile it after every operation."; self.write(**{group:items}); self.assertEqual(self.run_cli().returncode,0)
 def test_lowercase_and_separated_credential_assignments_fail_without_echo(self):
  marker="EXAMPLEVALUEWITH24CHARACTERS"
  for value in (f"clientsecretprod={marker}",f"config.api.key={marker}",f"api key={marker}"):
   with self.subTest(identifier=value.split("=",1)[0]): dashboard=self.data()["dashboard"]; dashboard["decisions"]=[value]; self.write(dashboard=dashboard); result=self.run_cli(); self.assertEqual(result.returncode,2); self.assertNotIn(marker,result.stdout+result.stderr)
  dashboard=self.data()["dashboard"]; dashboard["decisions"]=["Document config.api.key and clientsecretprod rotation without assigning values."]; self.write(dashboard=dashboard); result=self.run_cli(); self.assertEqual(result.returncode,0,result.stderr)
 def test_permissions_reference_known_resources_and_actions(self): permissions=self.data()["permissions"]; permissions[0]["actions"]=["missing"]; self.write(permissions=permissions); self.assertNotEqual(self.run_cli().returncode,0)
 def test_permission_role_and_resource_must_match_each_action(self):
  data=self.data(); action=data["actions"][0]; data["dashboard"]["primary_users"].append("viewer"); data["permissions"].append({"role":"viewer","resources":[action["resource"]],"actions":[action["id"]]}); self.write(**data); result=self.run_cli(); self.assertEqual(result.returncode,2); self.assertIn("permission contradicts",result.stderr)
 def test_each_action_role_permission_grants_the_action_and_resource(self):
  for field in ("actions","resources"):
   with self.subTest(field=field): data=self.data(); action=data["actions"][0]; role=action["roles"][0]; permission=next(item for item in data["permissions"] if item["role"]==role); permission[field].remove(action["id"] if field=="actions" else action["resource"]); self.write(**data); result=self.run_cli(); self.assertEqual(result.returncode,2); self.assertIn("action role",result.stderr)
 def test_view_role_permission_grants_each_resource_widget_subject(self):
  data=self.data(); data["dashboard"]["primary_users"].append("viewer"); data["views"][0]["roles"].append("viewer"); data["permissions"].append({"role":"viewer","resources":[],"actions":[]}); self.write(**data); result=self.run_cli(); self.assertEqual(result.returncode,2); self.assertIn("view role",result.stderr)
  data["views"][0]["widgets"]=[widget for widget in data["views"][0]["widgets"] if widget["subject"] not in {item["id"] for item in data["resources"]}]; self.write(**data); result=self.run_cli(); self.assertEqual(result.returncode,0,result.stderr)
 def test_reference_fields_reject_wrong_json_types_without_traceback(self):
  cases=[]
  metrics=self.data()["metrics"]; metrics[0]["source"]=[]; cases.append({"metrics":metrics})
  resources=self.data()["resources"]; resources[0]["source"]={}; cases.append({"resources":resources})
  views=self.data()["views"]; views[0]["widgets"][0]["subject"]={}; cases.append({"views":views})
  actions=self.data()["actions"]; actions[0]["resource"]=[]; cases.append({"actions":actions})
  for overrides in cases:
   with self.subTest(fields=tuple(overrides)): self.write(**overrides); result=self.run_cli(); self.assertEqual(result.returncode,2); self.assertNotIn("Traceback",result.stderr)
 def test_permissions_cover_every_primary_user_role(self): dashboard=self.data()["dashboard"]; dashboard["primary_users"].append("viewer"); self.write(dashboard=dashboard); self.assertNotEqual(self.run_cli().returncode,0)
 def test_each_view_declares_partial_and_error_states(self): views=self.data()["views"]; views[0]["states"]=["loading","ready"]; self.write(views=views); self.assertNotEqual(self.run_cli().returncode,0)
 def test_duplicate_keys_and_credentials_fail_without_echo(self): self.manifest.write_text('{"schema_version":"1.0","schema_version":"2.0"}'); self.assertNotEqual(self.run_cli().returncode,0); marker="EXAMPLEVALUEWITH24CHARACTERS"; dashboard=self.data()["dashboard"]; dashboard["decisions"]=[f"token={marker}"]; self.write(dashboard=dashboard); r=self.run_cli(); self.assertNotEqual(r.returncode,0); self.assertNotIn(marker,r.stdout+r.stderr)
 def test_invalid_utf8_manifest_is_rejected_without_traceback(self): self.manifest.write_bytes(b'{"dashboard":"\xff"}'); r=self.run_cli(); self.assertEqual(r.returncode,2); self.assertIn("could not be read as valid JSON",r.stderr); self.assertNotIn("Traceback",r.stderr)
 def test_huge_integer_manifest_is_rejected_without_traceback(self): self.manifest.write_text('{"schema_version":'+"9"*5000+'}'); r=self.run_cli(); self.assertEqual(r.returncode,2); self.assertIn("could not be read as valid JSON",r.stderr); self.assertNotIn("Traceback",r.stderr)
 def test_encoded_and_uri_credentials_fail_without_echo(self):
  marker="EXAMPLEVALUEWITH24CHARACTERS"
  for value in (f"clientSecr\\u0065t={marker}",f"accessKey={marker}",f"privateKey={marker}",f"passphrase={marker}",f"source=https://{marker}@example.test/path",f'Authorization: ***"Bearer {marker}"'):
   with self.subTest(value=value.split("=",1)[0]): dashboard=self.data()["dashboard"]; dashboard["decisions"]=[value]; self.write(dashboard=dashboard); r=self.run_cli(); self.assertNotEqual(r.returncode,0); self.assertNotIn(marker,r.stdout+r.stderr)
  dashboard=self.data()["dashboard"]; dashboard["decisions"]=["Document Bearer authorization without assigning a credential value."]; self.write(dashboard=dashboard); r=self.run_cli(); self.assertEqual(r.returncode,0,r.stderr)
 def test_repeated_quote_serialized_credentials_fail_without_echo(self):
  marker="EXAMPLEVALUEWITH24CHARACTERS"
  for value in (f"config={{'''apiKey''': '''{marker}'''}}",f'config={{"""apiKey""": """{marker}"""}}'):
   with self.subTest(delimiter=value[8:11]): dashboard=self.data()["dashboard"]; dashboard["decisions"]=[value]; self.write(dashboard=dashboard); result=self.run_cli(); self.assertEqual(result.returncode,2); self.assertNotIn(marker,result.stdout+result.stderr)
  dashboard=self.data()["dashboard"]; dashboard["decisions"]=["Document the triple-quoted apiKey example without assigning a value."]; self.write(dashboard=dashboard); result=self.run_cli(); self.assertEqual(result.returncode,0,result.stderr)
 def test_compact_uppercase_credential_identifier_fails_without_echo(self):
  marker="EXAMPLEVALUEWITH24CHARACTERS"
  for value in (f"PROD_CLIENTSECRET={marker}",f"CLIENTSECRET_PROD={marker}",f"CLIENTSECRETV3={marker}",f"INTERNALAPIKEY_PROD={marker}",f"PROD%5FCLIENTSECRET={marker}",f"CLIENTSECRET%5FPROD={marker}",f"CLIENTSECRETV%33={marker}",f"INTERNALAPIKEY%5FPROD={marker}",f"CLIENTSECRETPROD={marker}",f"INTERNALAPIKEYPROD={marker}",f"CLIENTSECRETSTAGING={marker}",f"ACCESSKEYIDUAT={marker}",f"PASSWORDDEV={marker}",f"PRIVATEKEYLOCAL={marker}",f"CLIENTSECRETPR%4FD={marker}",f"INTERNALAPIKEYSTAG%49NG={marker}"):
   with self.subTest(identifier=value.split("=",1)[0]): dashboard=self.data()["dashboard"]; dashboard["decisions"]=[value]; self.write(dashboard=dashboard); result=self.run_cli(); self.assertEqual(result.returncode,2); self.assertNotIn(marker,result.stdout+result.stderr)
  dashboard["decisions"]=["CLIENTSECRET rotation policy"]; self.write(dashboard=dashboard); result=self.run_cli(); self.assertEqual(result.returncode,0,result.stderr)
 def test_non_finite_json_numbers_are_rejected(self): self.manifest.write_text(json.dumps(self.data()).replace('"schema_version": "1.0"','"schema_version": Infinity')); r=self.run_cli(); self.assertNotEqual(r.returncode,0); self.assertIn("non-finite",r.stderr)
if __name__=="__main__": unittest.main()
