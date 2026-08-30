#!/usr/bin/env python3
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from typing import Any

SCRIPT=Path(__file__).with_name("validate_web_application_contract.py")
class WebApplicationContractTests(unittest.TestCase):
 def setUp(self): self.tmp=tempfile.TemporaryDirectory(); self.addCleanup(self.tmp.cleanup); self.root=Path(self.tmp.name); self.manifest=self.root/"contract.json"; self.write()
 def data(self,**overrides:Any):
  value={"schema_version":"1.0","kind":"web-application","project":{"name":"orbit-app","primary_user":"Platform operator","core_outcome":"Safely change a deployment"},"routes":[{"id":"login","path":"/login","purpose":"Authenticate","access":"public","roles":[]},{"id":"deployments","path":"/deployments","purpose":"List deployments","access":"authenticated","roles":[]},{"id":"deployment-detail","path":"/deployments/:id","purpose":"Operate one deployment","access":"role-gated","roles":["operator"]}],"state_domains":[{"id":"deployment-filter","owner":"url","source_of_truth":"URL query parameters","stale_policy":"Revalidate on navigation"},{"id":"deployments","owner":"server","source_of_truth":"Deployments API","stale_policy":"Invalidate after mutation"}],"journeys":[{"id":"restart-deployment","actor":"operator","steps":[{"route":"deployments","action":"Open a deployment","expected":"Detail loads"},{"route":"deployment-detail","action":"Restart","expected":"Status reconciles"}],"success":"Restart is confirmed","failure_states":["Permission denied","API unavailable"]}],"mutations":[{"id":"restart","route":"deployment-detail","permission":"operator","optimistic":False,"rollback":"Not applicable; wait for server","success_feedback":"Show accepted operation","error_feedback":"Preserve context and offer retry"}],"quality":{"accessibility_target":"WCAG 2.2 AA","browsers":["chromium","firefox","webkit"],"viewports":["mobile","desktop"]},"verification":[{"id":"restart-e2e","claim":"Authorized restart works and reconciles","evidence":"Real browser E2E with success and failure paths"}]}; value.update(overrides); return value
 def write(self,**overrides): self.manifest.write_text(json.dumps(self.data(**overrides),indent=2)+"\n")
 def run_cli(self): return subprocess.run([sys.executable,str(SCRIPT),"check","--manifest",str(self.manifest),"--json"],text=True,capture_output=True,check=False)
 def test_reference_contract_passes_read_only(self): before=self.manifest.read_bytes(); r=self.run_cli(); self.assertEqual(r.returncode,0,r.stderr); self.assertEqual(json.loads(r.stdout)["status"],"PASS"); self.assertEqual(before,self.manifest.read_bytes())
 def test_route_ids_and_paths_are_unique(self): routes=self.data()["routes"]; self.write(routes=routes+[dict(routes[0])]); self.assertNotEqual(self.run_cli().returncode,0)
 def test_route_paths_are_internal_and_canonical(self):
  for path in ("//example.test/path","/../admin",r"/docs\admin","/docs?draft=1","/docs#draft","/%61dmin","/%2e%2e/admin","/%252e%252e/admin","/safe%2f..%2fadmin","/%zz","/%c0%ae/admin","/%u002e%u002e/admin"):
   with self.subTest(path=path): routes=self.data()["routes"]; routes[0]["path"]=path; self.write(routes=routes); result=self.run_cli(); self.assertEqual(result.returncode,2); self.assertIn("canonical",result.stderr); self.assertNotIn("Traceback",result.stderr)
 def test_role_gated_route_requires_roles(self): routes=self.data()["routes"]; routes[2]["roles"]=[]; self.write(routes=routes); self.assertNotEqual(self.run_cli().returncode,0)
 def test_non_role_gated_routes_reject_roles(self):
  for route_index in (0,1):
   with self.subTest(access=self.data()["routes"][route_index]["access"]): routes=self.data()["routes"]; routes[route_index]["roles"]=["operator"]; self.write(routes=routes); result=self.run_cli(); self.assertEqual(result.returncode,2); self.assertIn("roles",result.stderr); self.assertNotIn("Traceback",result.stderr)
 def test_journeys_and_mutations_reference_routes(self): journeys=self.data()["journeys"]; journeys[0]["steps"][0]["route"]="missing"; self.write(journeys=journeys); self.assertNotEqual(self.run_cli().returncode,0); mutations=self.data()["mutations"]; mutations[0]["route"]="missing"; self.write(mutations=mutations); self.assertNotEqual(self.run_cli().returncode,0)
 def test_journey_actor_must_be_allowed_on_each_role_gated_route(self):
  journeys=self.data()["journeys"]; journeys[0]["actor"]="viewer"; self.write(journeys=journeys); result=self.run_cli(); self.assertEqual(result.returncode,2); self.assertIn("journey actor",result.stderr)
 def test_route_references_reject_wrong_json_types_without_traceback(self):
  journeys=self.data()["journeys"]; journeys[0]["steps"][0]["route"]={}; self.write(journeys=journeys); result=self.run_cli(); self.assertEqual(result.returncode,2); self.assertNotIn("Traceback",result.stderr)
  mutations=self.data()["mutations"]; mutations[0]["route"]=[]; self.write(mutations=mutations); result=self.run_cli(); self.assertEqual(result.returncode,2); self.assertNotIn("Traceback",result.stderr)
 def test_optimistic_mutation_requires_real_rollback(self):
  for rollback in ("", "none", "not applicable", "n/a", "eventually", "unspecified", "tbd", "later", "todo", "pending", "defer", "deferred", "unknown", "placeholder", "to be determined"):
   with self.subTest(rollback=rollback): mutations=self.data()["mutations"]; mutations[0]["optimistic"]=True; mutations[0]["rollback"]=rollback; self.write(mutations=mutations); self.assertNotEqual(self.run_cli().returncode,0)
 def test_optimistic_mutation_rejects_composite_deferred_rollback_but_allows_domain_language(self):
  for rollback in ("TODO: define the rollback later", "TODO implement rollback handling", "Note: TODO define rollback", "%54ODO: define rollback", "TODO_rollback: define later", "TODO123: define later", "T%4FDO_rollback: define later", "TBD after implementation", "Deferred until implementation", "Deferred: add rollback handling", "Placeholder implementation note", "Rollback will be implemented later", "Rollback details are not yet defined", "Future work: define rollback", "Define rollback after implementation", "Plan: define rollback in a later phase", "Rollback definition is postponed until implementation is complete", "We intend to specify rollback eventually", "Rollback behavior remains to be decided"):
   with self.subTest(rollback=rollback): mutations=self.data()["mutations"]; mutations[0]["optimistic"]=True; mutations[0]["rollback"]=rollback; self.write(mutations=mutations); self.assertEqual(self.run_cli().returncode,2)
  for rollback in ("Pending resources are restored from the previous snapshot.", "Later failures restore the prior snapshot and refetch."):
   with self.subTest(rollback=rollback): mutations=self.data()["mutations"]; mutations[0]["optimistic"]=True; mutations[0]["rollback"]=rollback; self.write(mutations=mutations); self.assertEqual(self.run_cli().returncode,0)
 def test_optimistic_mutation_rejects_subject_specific_future_promises(self):
  for rollback in ("Rollback remains to be decided.","The team intends to specify rollback eventually.","We plan to define rollback in a later phase."):
   with self.subTest(rollback=rollback): mutations=self.data()["mutations"]; mutations[0]["optimistic"]=True; mutations[0]["rollback"]=rollback; self.write(mutations=mutations); self.assertEqual(self.run_cli().returncode,2)
 def test_optimistic_mutation_rejects_interposed_future_promises(self):
  negatives=("We plan, after review, to define rollback in a later phase.","The team plans on defining rollback in a later phase.","Our plan is to define rollback in a later phase.","The team intends, after review, to specify rollback eventually.","Rollback remains, for now, to be decided.")
  for rollback in negatives:
   with self.subTest(rollback=rollback): mutations=self.data()["mutations"]; mutations[0]["optimistic"]=True; mutations[0]["rollback"]=rollback; self.write(mutations=mutations); self.assertEqual(self.run_cli().returncode,2)
  mutations=self.data()["mutations"]; mutations[0]["optimistic"]=True; mutations[0]["rollback"]="Restore the prior snapshot and refetch after a failed request."; self.write(mutations=mutations); self.assertEqual(self.run_cli().returncode,0)
 def test_lowercase_and_separated_credential_assignments_fail_without_echo(self):
  marker="EXAMPLEVALUEWITH24CHARACTERS"
  for value in (f"clientsecretprod={marker}",f"config.api.key={marker}",f"api key={marker}"):
   with self.subTest(identifier=value.split("=",1)[0]): self.write(project={"name":"orbit-app","primary_user":value,"core_outcome":"Operate"}); result=self.run_cli(); self.assertEqual(result.returncode,2); self.assertNotIn(marker,result.stdout+result.stderr)
  self.write(project={"name":"orbit-app","primary_user":"Document config.api.key and clientsecretprod rotation without assigning values.","core_outcome":"Operate"}); result=self.run_cli(); self.assertEqual(result.returncode,0,result.stderr)
 def test_role_gated_mutation_permission_matches_route_role(self): mutations=self.data()["mutations"]; mutations[0]["permission"]="viewer"; self.write(mutations=mutations); self.assertNotEqual(self.run_cli().returncode,0)
 def test_state_owner_and_stale_policy_are_required(self): states=self.data()["state_domains"]; states[0]["owner"]="database"; self.write(state_domains=states); self.assertNotEqual(self.run_cli().returncode,0); states=self.data()["state_domains"]; states[1]["stale_policy"]=""; self.write(state_domains=states); self.assertNotEqual(self.run_cli().returncode,0)
 def test_quality_accepts_one_claim_relevant_viewport(self): q=self.data()["quality"]; q["viewports"]=["desktop"]; self.write(quality=q); self.assertEqual(self.run_cli().returncode,0)
 def test_duplicate_keys_and_credentials_fail_without_echo(self): self.manifest.write_text('{"schema_version":"1.0","schema_version":"2.0"}'); self.assertNotEqual(self.run_cli().returncode,0); marker="EXAMPLEVALUEWITH24CHARACTERS"; self.write(project={"name":"orbit-app","primary_user":f"password={marker}","core_outcome":"Operate"}); r=self.run_cli(); self.assertNotEqual(r.returncode,0); self.assertNotIn(marker,r.stdout+r.stderr)
 def test_invalid_utf8_manifest_is_rejected_without_traceback(self): self.manifest.write_bytes(b'{"project":"\xff"}'); r=self.run_cli(); self.assertEqual(r.returncode,2); self.assertIn("could not be read as valid JSON",r.stderr); self.assertNotIn("Traceback",r.stderr)
 def test_huge_integer_manifest_is_rejected_without_traceback(self): self.manifest.write_text('{"schema_version":'+"9"*5000+'}'); r=self.run_cli(); self.assertEqual(r.returncode,2); self.assertIn("could not be read as valid JSON",r.stderr); self.assertNotIn("Traceback",r.stderr)
 def test_encoded_and_uri_credentials_fail_without_echo(self):
  marker="EXAMPLEVALUEWITH24CHARACTERS"
  for value in (f"clientSecr\\u0065t={marker}",f"accessKey={marker}",f"privateKey={marker}",f"passphrase={marker}",f"source=https://{marker}@example.test/path",f'Authorization: ***"Bearer {marker}"'):
   with self.subTest(value=value.split("=",1)[0]): self.write(project={"name":"orbit-app","primary_user":value,"core_outcome":"Operate"}); r=self.run_cli(); self.assertNotEqual(r.returncode,0); self.assertNotIn(marker,r.stdout+r.stderr)
  self.write(project={"name":"orbit-app","primary_user":"Document Bearer authorization without assigning a credential value.","core_outcome":"Operate"}); r=self.run_cli(); self.assertEqual(r.returncode,0,r.stderr)
 def test_repeated_quote_serialized_credentials_fail_without_echo(self):
  marker="EXAMPLEVALUEWITH24CHARACTERS"
  for value in (f"config={{'''apiKey''': '''{marker}'''}}",f'config={{"""apiKey""": """{marker}"""}}'):
   with self.subTest(delimiter=value[8:11]): self.write(project={"name":"orbit-app","primary_user":value,"core_outcome":"Operate"}); result=self.run_cli(); self.assertEqual(result.returncode,2); self.assertNotIn(marker,result.stdout+result.stderr)
  self.write(project={"name":"orbit-app","primary_user":"Document the triple-quoted apiKey example without assigning a value.","core_outcome":"Operate"}); result=self.run_cli(); self.assertEqual(result.returncode,0,result.stderr)
 def test_compact_uppercase_credential_identifier_fails_without_echo(self):
  marker="EXAMPLEVALUEWITH24CHARACTERS"
  for value in (f"PROD_CLIENTSECRET={marker}",f"CLIENTSECRET_PROD={marker}",f"CLIENTSECRETV3={marker}",f"INTERNALAPIKEY_PROD={marker}",f"PROD%5FCLIENTSECRET={marker}",f"CLIENTSECRET%5FPROD={marker}",f"CLIENTSECRETV%33={marker}",f"INTERNALAPIKEY%5FPROD={marker}",f"CLIENTSECRETPROD={marker}",f"INTERNALAPIKEYPROD={marker}",f"CLIENTSECRETSTAGING={marker}",f"ACCESSKEYIDUAT={marker}",f"PASSWORDDEV={marker}",f"PRIVATEKEYLOCAL={marker}",f"CLIENTSECRETPR%4FD={marker}",f"INTERNALAPIKEYSTAG%49NG={marker}"):
   with self.subTest(identifier=value.split("=",1)[0]): self.write(project={"name":"orbit-app","primary_user":value,"core_outcome":"Operate"}); result=self.run_cli(); self.assertEqual(result.returncode,2); self.assertNotIn(marker,result.stdout+result.stderr)
  self.write(project={"name":"orbit-app","primary_user":"CLIENTSECRET rotation policy","core_outcome":"Operate"}); result=self.run_cli(); self.assertEqual(result.returncode,0,result.stderr)
 def test_non_finite_json_numbers_are_rejected(self): self.manifest.write_text(json.dumps(self.data()).replace('"schema_version": "1.0"','"schema_version": NaN')); r=self.run_cli(); self.assertNotEqual(r.returncode,0); self.assertIn("non-finite",r.stderr)
if __name__=="__main__": unittest.main()
