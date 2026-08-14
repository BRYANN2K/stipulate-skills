#!/usr/bin/env python3
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from typing import Any

SCRIPT = Path(__file__).with_name("validate_website_contract.py")

class WebsiteContractTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory(); self.addCleanup(self.tmp.cleanup)
        self.root=Path(self.tmp.name); self.manifest=self.root/"contract.json"; self.write()
    def data(self, **overrides: Any):
        value={"schema_version":"1.0","kind":"website","project":{"name":"orbit-site","audience":"Platform teams","primary_conversion":"Request a demo"},"pages":[{"id":"home","path":"/","purpose":"Explain the product","audience_need":"Understand value","primary_action":"Request a demo","indexable":True,"metadata":{"title":"Orbit","description":"Operate software safely."}},{"id":"privacy","path":"/privacy","purpose":"Explain privacy","audience_need":"Review data use","primary_action":"Return home","indexable":True,"metadata":{"title":"Privacy","description":"How data is handled."}}],"forms":[{"id":"demo","page":"home","success_state":"Confirmation shown","error_state":"Retry without losing input","spam_protection":"Rate limited","privacy_notice":"privacy"}],"redirects":[{"from":"/old","to":"/","status":301}],"analytics":{"enabled":True,"consent_required":True,"privacy_page":"privacy"},"quality":{"accessibility_target":"WCAG 2.2 AA","browsers":["chromium","firefox","webkit"],"viewports":["mobile","desktop"],"performance_budgets":{"lcp_ms":2500,"inp_ms":200,"cls":0.1}},"verification":[{"id":"browser-journey","claim":"Primary conversion works","evidence":"Real browser journey at mobile and desktop widths"}]}; value.update(overrides); return value
    def write(self, **overrides): self.manifest.write_text(json.dumps(self.data(**overrides),indent=2)+"\n")
    def run_cli(self): return subprocess.run([sys.executable,str(SCRIPT),"check","--manifest",str(self.manifest),"--json"],text=True,capture_output=True,check=False)
    def test_reference_contract_passes_read_only(self):
        before=self.manifest.read_bytes(); r=self.run_cli(); self.assertEqual(r.returncode,0,r.stderr); self.assertEqual(json.loads(r.stdout)["status"],"PASS"); self.assertEqual(self.manifest.read_bytes(),before)
    def test_kind_and_unknown_fields_fail(self):
        self.write(kind="web-application"); self.assertNotEqual(self.run_cli().returncode,0)
        d=self.data(); d["unexpected"]=True; self.manifest.write_text(json.dumps(d)); self.assertNotEqual(self.run_cli().returncode,0)
    def test_page_ids_and_paths_are_unique(self):
        pages=self.data()["pages"]; self.write(pages=pages+[dict(pages[0])]); self.assertNotEqual(self.run_cli().returncode,0)
    def test_page_and_redirect_paths_are_internal_and_canonical(self):
        for path in ("//example.test/path", "/../admin", r"/docs\admin", "/docs?draft=1", "/docs#draft", "/%61dmin", "/%2e%2e/admin", "/%252e%252e/admin", "/safe%2f..%2fadmin", "/%zz", "/%c0%ae/admin", "/%u002e%u002e/admin"):
            with self.subTest(page=path):
                pages=self.data()["pages"]; pages[0]["path"]=path; self.write(pages=pages); result=self.run_cli(); self.assertEqual(result.returncode,2); self.assertIn("canonical",result.stderr); self.assertNotIn("Traceback",result.stderr)
            with self.subTest(redirect=path):
                self.write(redirects=[{"from":path,"to":"/","status":301}]); result=self.run_cli(); self.assertEqual(result.returncode,2); self.assertIn("canonical",result.stderr); self.assertNotIn("Traceback",result.stderr)
    def test_form_and_privacy_page_references_must_exist(self):
        forms=self.data()["forms"]; forms[0]["page"]="missing"; self.write(forms=forms); self.assertNotEqual(self.run_cli().returncode,0)
        self.write(analytics={"enabled":True,"consent_required":True,"privacy_page":"missing"}); self.assertNotEqual(self.run_cli().returncode,0)
    def test_disabled_analytics_privacy_page_reference_must_exist(self):
        self.write(analytics={"enabled":False,"consent_required":False,"privacy_page":"missing"})
        result=self.run_cli(); self.assertEqual(result.returncode,2); self.assertNotIn("Traceback",result.stderr)
    def test_reference_fields_reject_wrong_json_types_without_traceback(self):
        cases=[]
        forms=self.data()["forms"]; forms[0]["page"]=[]; cases.append({"forms":forms})
        forms=self.data()["forms"]; forms[0]["privacy_notice"]={}; cases.append({"forms":forms})
        cases.append({"analytics":{"enabled":True,"consent_required":True,"privacy_page":[]}})
        cases.append({"redirects":[{"from":"/old","to":"/","status":[]}]})
        for overrides in cases:
            with self.subTest(fields=tuple(overrides)):
                self.write(**overrides); result=self.run_cli(); self.assertEqual(result.returncode,2); self.assertNotIn("Traceback",result.stderr)
    def test_indexable_page_requires_complete_metadata(self):
        pages=self.data()["pages"]; pages[0]["metadata"]["description"]=""; self.write(pages=pages); self.assertNotEqual(self.run_cli().returncode,0)
    def test_non_indexable_page_metadata_still_requires_string_types(self):
        pages=self.data()["pages"]; pages[0]["indexable"]=False; pages[0]["metadata"]["title"]=[]; self.write(pages=pages)
        result=self.run_cli(); self.assertEqual(result.returncode,2); self.assertNotIn("Traceback",result.stderr)
    def test_redirect_sources_cannot_shadow_live_pages_or_loop(self):
        self.write(redirects=[{"from":"/","to":"/privacy","status":301}]); self.assertNotEqual(self.run_cli().returncode,0)
        self.write(redirects=[{"from":"/old","to":"/old","status":301}]); self.assertNotEqual(self.run_cli().returncode,0)
    def test_redirects_must_terminate_at_a_known_live_page(self):
        self.write(redirects=[{"from":"/old","to":"/missing","status":301}]); self.assertNotEqual(self.run_cli().returncode,0)
    def test_quality_requires_multiple_viewports_and_positive_budgets(self):
        q=self.data()["quality"]; q["viewports"]=["desktop"]; self.write(quality=q); self.assertNotEqual(self.run_cli().returncode,0)
        q=self.data()["quality"]; q["performance_budgets"]["lcp_ms"]=0; self.write(quality=q); self.assertNotEqual(self.run_cli().returncode,0)
    def test_performance_budgets_reject_booleans_and_non_finite_numbers(self):
        q=self.data()["quality"]; q["performance_budgets"]["lcp_ms"]=True; self.write(quality=q); self.assertNotEqual(self.run_cli().returncode,0)
        q=self.data()["quality"]; q["performance_budgets"]["cls"]=float("nan"); self.write(quality=q); result=self.run_cli(); self.assertNotEqual(result.returncode,0); self.assertIn("non-finite",result.stderr)
    def test_performance_budgets_reject_overflowing_integers_without_traceback(self):
        huge=10**400
        for field in ("lcp_ms","inp_ms","cls"):
            with self.subTest(field=field):
                q=self.data()["quality"]; q["performance_budgets"][field]=huge; self.write(quality=q); result=self.run_cli(); self.assertEqual(result.returncode,2); self.assertIn("finite",result.stderr); self.assertNotIn(str(huge),result.stdout+result.stderr); self.assertNotIn("Traceback",result.stderr)
        q=self.data()["quality"]; q["performance_budgets"]["lcp_ms"]=10**308; self.write(quality=q); result=self.run_cli(); self.assertEqual(result.returncode,0,result.stderr)
    def test_conversion_and_verification_reject_deferred_placeholders(self):
        for value in ("todo","tbd","later","pending","unknown","placeholder"):
            with self.subTest(field="primary_conversion",value=value):
                project=self.data()["project"]; project["primary_conversion"]=value; self.write(project=project); self.assertEqual(self.run_cli().returncode,2)
            for field in ("claim","evidence"):
                with self.subTest(field=field,value=value):
                    verification=self.data()["verification"]; verification[0][field]=value; self.write(verification=verification); self.assertEqual(self.run_cli().returncode,2)
        project=self.data()["project"]; project["primary_conversion"]="Request a demo"; verification=self.data()["verification"]; verification[0]["claim"]="The primary conversion works across supported viewports."; verification[0]["evidence"]="A real-browser journey covers mobile and desktop success and failure."; self.write(project=project,verification=verification); self.assertEqual(self.run_cli().returncode,0)
    def test_form_states_and_protection_reject_deferred_placeholders(self):
        for field in ("success_state","error_state","spam_protection"):
            for value in ("todo","tbd","later","pending","unknown","placeholder"):
                with self.subTest(field=field,value=value):
                    forms=self.data()["forms"]; forms[0][field]=value; self.write(forms=forms); self.assertEqual(self.run_cli().returncode,2)
        forms=self.data()["forms"]; forms[0]["success_state"]="Show confirmation after the server accepts the request."; forms[0]["error_state"]="Preserve input and show an actionable retry."; forms[0]["spam_protection"]="Apply a server-side rate limit and honeypot."; self.write(forms=forms); self.assertEqual(self.run_cli().returncode,0)
    def test_duplicate_keys_and_credentials_fail_without_echo(self):
        self.manifest.write_text('{"schema_version":"1.0","schema_version":"2.0"}'); self.assertNotEqual(self.run_cli().returncode,0)
        marker="EXAMPLEVALUEWITH24CHARACTERS"; self.write(project={"name":"orbit-site","audience":f"token={marker}","primary_conversion":"Demo"}); r=self.run_cli(); self.assertNotEqual(r.returncode,0); self.assertNotIn(marker,r.stdout+r.stderr)
    def test_invalid_utf8_manifest_is_rejected_without_traceback(self):
        self.manifest.write_bytes(b'{"project":"\xff"}'); r=self.run_cli(); self.assertEqual(r.returncode,2); self.assertIn("could not be read as valid JSON",r.stderr); self.assertNotIn("Traceback",r.stderr)
    def test_huge_integer_manifest_is_rejected_without_traceback(self):
        self.manifest.write_text('{"schema_version":'+"9"*5000+'}'); r=self.run_cli(); self.assertEqual(r.returncode,2); self.assertIn("could not be read as valid JSON",r.stderr); self.assertNotIn("Traceback",r.stderr)
    def test_encoded_and_uri_credentials_fail_without_echo(self):
        marker="EXAMPLEVALUEWITH24CHARACTERS"
        for value in (f"clientSecr\\u0065t={marker}", f"accessKey={marker}", f"privateKey={marker}", f"passphrase={marker}", f"source=https://{marker}@example.test/path", f'Authorization: ***"Bearer {marker}"'):
            with self.subTest(value=value.split("=",1)[0]):
                self.write(project={"name":"orbit-site","audience":value,"primary_conversion":"Demo"}); r=self.run_cli(); self.assertNotEqual(r.returncode,0); self.assertNotIn(marker,r.stdout+r.stderr)
        self.write(project={"name":"orbit-site","audience":"Document Bearer authorization without assigning a credential value.","primary_conversion":"Demo"}); r=self.run_cli(); self.assertEqual(r.returncode,0,r.stderr)
    def test_repeated_quote_serialized_credentials_fail_without_echo(self):
        marker="EXAMPLEVALUEWITH24CHARACTERS"
        for value in (f"config={{'''apiKey''': '''{marker}'''}}",f'config={{"""apiKey""": """{marker}"""}}'):
            with self.subTest(delimiter=value[8:11]): self.write(project={"name":"orbit-site","audience":value,"primary_conversion":"Demo"}); result=self.run_cli(); self.assertEqual(result.returncode,2); self.assertNotIn(marker,result.stdout+result.stderr)
        self.write(project={"name":"orbit-site","audience":"Document the triple-quoted apiKey example without assigning a value.","primary_conversion":"Demo"}); result=self.run_cli(); self.assertEqual(result.returncode,0,result.stderr)
    def test_compact_uppercase_credential_identifier_fails_without_echo(self):
        marker="EXAMPLEVALUEWITH24CHARACTERS"
        for value in (f"PROD_CLIENTSECRET={marker}",f"CLIENTSECRET_PROD={marker}",f"CLIENTSECRETV3={marker}",f"INTERNALAPIKEY_PROD={marker}",f"PROD%5FCLIENTSECRET={marker}",f"CLIENTSECRET%5FPROD={marker}",f"CLIENTSECRETV%33={marker}",f"INTERNALAPIKEY%5FPROD={marker}",f"CLIENTSECRETPROD={marker}",f"INTERNALAPIKEYPROD={marker}",f"CLIENTSECRETSTAGING={marker}",f"ACCESSKEYIDUAT={marker}",f"PASSWORDDEV={marker}",f"PRIVATEKEYLOCAL={marker}",f"CLIENTSECRETPR%4FD={marker}",f"INTERNALAPIKEYSTAG%49NG={marker}"):
            with self.subTest(identifier=value.split("=",1)[0]): self.write(project={"name":"orbit-site","audience":value,"primary_conversion":"Demo"}); result=self.run_cli(); self.assertEqual(result.returncode,2); self.assertNotIn(marker,result.stdout+result.stderr)
        self.write(project={"name":"orbit-site","audience":"CLIENTSECRET rotation policy","primary_conversion":"Demo"}); result=self.run_cli(); self.assertEqual(result.returncode,0,result.stderr)
    def test_lowercase_and_separated_credential_assignments_fail_without_echo(self):
        marker="EXAMPLEVALUEWITH24CHARACTERS"
        for value in (f"clientsecretprod={marker}",f"config.api.key={marker}",f"api key={marker}"):
            with self.subTest(identifier=value.split("=",1)[0]):
                self.write(project={"name":"orbit-site","audience":value,"primary_conversion":"Demo"}); result=self.run_cli(); self.assertEqual(result.returncode,2); self.assertNotIn(marker,result.stdout+result.stderr)
        self.write(project={"name":"orbit-site","audience":"Document config.api.key and clientsecretprod rotation without assigning values.","primary_conversion":"Demo"}); result=self.run_cli(); self.assertEqual(result.returncode,0,result.stderr)
if __name__=="__main__": unittest.main()
