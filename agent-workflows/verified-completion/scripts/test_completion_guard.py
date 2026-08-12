#!/usr/bin/env python3
"""Black-box tests for completion_guard.py."""

from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import cast

SCRIPT = Path(__file__).with_name("completion_guard.py")
TEMPLATE = Path(__file__).resolve().parents[1] / "templates" / "completion-manifest.json"


def timestamp(delta: timedelta = timedelta()) -> str:
    value = datetime.now(timezone.utc) + delta
    return value.replace(microsecond=0).isoformat().replace("+00:00", "Z")


class CompletionGuardTests(unittest.TestCase):
    def setUp(self) -> None:
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.root = Path(temp.name)

    def evidence(self, kind: str, **extra: object) -> dict[str, object]:
        item: dict[str, object] = {
            "kind": kind,
            "status": "PASSED",
            "observed_at": timestamp(),
            "locator": f"test:{kind}",
            "summary": f"{kind} evidence passed",
        }
        item.update(extra)
        return item

    def manifest(
        self,
        *,
        outcome: str = "COMPLETE",
        target: str = "VERIFIED",
        claimed: str = "VERIFIED",
        requirement_status: str = "SATISFIED",
        required: str = "VERIFIED",
        evidence: list[dict[str, object]] | None = None,
        blockers: list[str] | None = None,
    ) -> dict[str, object]:
        return {
            "schema_version": "1.0",
            "task": "verify one artifact",
            "outcome": outcome,
            "target_level": target,
            "claimed_level": claimed,
            "changed_at": timestamp(timedelta(minutes=-2)),
            "blockers": blockers or [],
            "requirements": [
                {
                    "id": "R1",
                    "statement": "artifact meets the requested behavior",
                    "status": requirement_status,
                    "required_level": required,
                    "evidence": evidence
                    if evidence is not None
                    else [self.evidence("artifact"), self.evidence("test")],
                }
            ],
        }

    def run_raw_manifest(
        self,
        raw: str,
        *extra_args: str,
    ) -> subprocess.CompletedProcess[str]:
        path = self.root / "manifest.json"
        path.write_text(raw, encoding="utf-8")
        return subprocess.run(
            [
                sys.executable,
                str(SCRIPT),
                "check",
                "--manifest",
                str(path),
                "--repo",
                str(self.root),
                *extra_args,
            ],
            text=True,
            capture_output=True,
            check=False,
        )

    def run_manifest(
        self,
        manifest: dict[str, object],
        *extra_args: str,
    ) -> subprocess.CompletedProcess[str]:
        return self.run_raw_manifest(json.dumps(manifest), *extra_args)

    def assert_rejected(self, manifest: dict[str, object], message: str) -> None:
        result = self.run_manifest(manifest)
        self.assertNotEqual(result.returncode, 0, result.stdout)
        self.assertIn(message, result.stderr)

    def test_completion_manifest_template_is_valid_json(self) -> None:
        raw = TEMPLATE.read_text(encoding="utf-8")
        raw = raw.replace("{{LAST_RELEVANT_MUTATION_ISO8601}}", timestamp(timedelta(minutes=-2)))
        raw = raw.replace("{{ARTIFACT_OBSERVED_AT_ISO8601}}", timestamp(timedelta(minutes=-1)))
        raw = raw.replace("{{TEST_OBSERVED_AT_ISO8601}}", timestamp())
        template = json.loads(raw)
        self.assertEqual(template["schema_version"], "1.0")
        self.assertEqual(template["target_level"], "VERIFIED")
        self.assertEqual(template["requirements"][0]["required_level"], "VERIFIED")
        result = self.run_manifest(template)
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_accepts_verified_complete_manifest(self) -> None:
        result = self.run_manifest(self.manifest())
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("R1=SATISFIED/VERIFIED", result.stdout)

    def test_accepts_implemented_complete_manifest(self) -> None:
        manifest = self.manifest(
            target="IMPLEMENTED",
            claimed="IMPLEMENTED",
            required="IMPLEMENTED",
            evidence=[self.evidence("artifact")],
        )
        result = self.run_manifest(manifest)
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_accepts_published_manifest_with_verified_remote_readback(self) -> None:
        manifest = self.manifest(
            target="PUBLISHED",
            claimed="PUBLISHED",
            required="PUBLISHED",
            evidence=[
                self.evidence("artifact"),
                self.evidence("test"),
                self.evidence("remote", immutable_reference=True, read_back=True),
            ],
        )
        result = self.run_manifest(manifest)
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_rejects_published_without_readback(self) -> None:
        manifest = self.manifest(
            target="PUBLISHED",
            claimed="PUBLISHED",
            required="PUBLISHED",
            evidence=[
                self.evidence("artifact"),
                self.evidence("test"),
                self.evidence("remote", immutable_reference=True, read_back=False),
            ],
        )
        self.assert_rejected(manifest, "evidence reaches only VERIFIED")

    def test_rejects_verified_without_implementation_evidence(self) -> None:
        manifest = self.manifest(evidence=[self.evidence("test")])
        self.assert_rejected(manifest, "evidence reaches only CLAIMED")

    def test_rejects_stale_evidence_before_last_mutation(self) -> None:
        stale = self.evidence("artifact")
        stale["observed_at"] = timestamp(timedelta(hours=-2))
        manifest = self.manifest(
            target="IMPLEMENTED",
            claimed="IMPLEMENTED",
            required="IMPLEMENTED",
            evidence=[stale],
        )
        self.assert_rejected(manifest, "observed before changed_at")

    def test_rejects_overaged_evidence(self) -> None:
        old = self.evidence("artifact")
        old["observed_at"] = timestamp(timedelta(hours=-25))
        manifest = self.manifest(
            target="IMPLEMENTED",
            claimed="IMPLEMENTED",
            required="IMPLEMENTED",
            evidence=[old],
        )
        manifest["changed_at"] = timestamp(timedelta(hours=-26))
        self.assert_rejected(manifest, "exceeds maximum evidence age")

    def test_rejects_evidence_unreasonably_far_in_the_future(self) -> None:
        future = self.evidence("artifact")
        future["observed_at"] = timestamp(timedelta(hours=2))
        manifest = self.manifest(
            target="IMPLEMENTED",
            claimed="IMPLEMENTED",
            required="IMPLEMENTED",
            evidence=[future],
        )
        self.assert_rejected(manifest, "unreasonably far in the future")

    def test_accepts_evidence_stronger_than_target_level(self) -> None:
        manifest = self.manifest(
            target="IMPLEMENTED",
            claimed="VERIFIED",
            required="IMPLEMENTED",
        )
        result = self.run_manifest(manifest)
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_rejects_satisfied_requirement_with_failed_evidence(self) -> None:
        failed = self.evidence("test")
        failed["status"] = "FAILED"
        manifest = self.manifest(evidence=[self.evidence("artifact"), failed])
        self.assert_rejected(manifest, "contains non-passing evidence")

    def test_not_applicable_evidence_is_informational_not_positive(self) -> None:
        not_applicable = self.evidence("lint")
        not_applicable["status"] = "NOT_APPLICABLE"
        manifest = self.manifest(evidence=[self.evidence("artifact"), self.evidence("test"), not_applicable])
        result = self.run_manifest(manifest)
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_not_applicable_evidence_cannot_raise_proof_level(self) -> None:
        not_applicable = self.evidence("test")
        not_applicable["status"] = "NOT_APPLICABLE"
        manifest = self.manifest(evidence=[self.evidence("artifact"), not_applicable])
        self.assert_rejected(manifest, "evidence reaches only IMPLEMENTED")

    def test_rejects_complete_outcome_with_unsatisfied_requirement(self) -> None:
        manifest = self.manifest(
            claimed="CLAIMED",
            requirement_status="UNSATISFIED",
            evidence=[],
        )
        self.assert_rejected(manifest, "requires every requirement to be SATISFIED")

    def test_accepts_blocked_outcome_without_inflating_claim(self) -> None:
        manifest = self.manifest(
            outcome="BLOCKED",
            target="PUBLISHED",
            claimed="IMPLEMENTED",
            requirement_status="SATISFIED",
            required="IMPLEMENTED",
            evidence=[self.evidence("artifact")],
            blockers=["remote authentication unavailable"],
        )
        requirements = cast(list[dict[str, object]], manifest["requirements"])
        requirements.append(
            {
                "id": "R2",
                "statement": "artifact is published remotely",
                "status": "BLOCKED",
                "required_level": "PUBLISHED",
                "evidence": [],
            }
        )
        result = self.run_manifest(manifest)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("R2=BLOCKED/CLAIMED", result.stdout)

    def test_rejects_blocked_requirement_without_named_blocker(self) -> None:
        manifest = self.manifest(
            outcome="BLOCKED",
            target="PUBLISHED",
            claimed="CLAIMED",
            requirement_status="BLOCKED",
            required="PUBLISHED",
            evidence=[],
        )
        self.assert_rejected(manifest, "blockers is empty")

    def test_rejects_partial_outcome_that_hides_blocker(self) -> None:
        manifest = self.manifest(
            outcome="PARTIAL",
            target="PUBLISHED",
            claimed="CLAIMED",
            requirement_status="BLOCKED",
            required="PUBLISHED",
            evidence=[],
            blockers=["remote approval pending"],
        )
        self.assert_rejected(manifest, "PARTIAL outcome cannot contain blockers")

    def test_accepts_partial_outcome_with_satisfied_and_unsatisfied_requirements(self) -> None:
        manifest = self.manifest(
            outcome="PARTIAL",
            target="VERIFIED",
            claimed="IMPLEMENTED",
            required="IMPLEMENTED",
            evidence=[self.evidence("artifact")],
        )
        requirements = cast(list[dict[str, object]], manifest["requirements"])
        requirements.append(
            {
                "id": "R2",
                "statement": "behavior passes acceptance checks",
                "status": "UNSATISFIED",
                "required_level": "VERIFIED",
                "evidence": [],
            }
        )
        result = self.run_manifest(manifest)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("R1=SATISFIED/IMPLEMENTED", result.stdout)
        self.assertIn("R2=UNSATISFIED/CLAIMED", result.stdout)

    def test_rejects_claim_above_weakest_satisfied_requirement(self) -> None:
        manifest = self.manifest(
            claimed="VERIFIED",
            target="IMPLEMENTED",
            required="IMPLEMENTED",
            evidence=[self.evidence("artifact")],
        )
        self.assert_rejected(manifest, "weakest satisfied requirement level: IMPLEMENTED")

    def test_rejects_duplicate_requirement_ids(self) -> None:
        manifest = self.manifest()
        requirements = cast(list[dict[str, object]], manifest["requirements"])
        requirements.append(dict(requirements[0]))
        self.assert_rejected(manifest, "duplicate requirement id")

    def test_rejects_duplicate_json_keys(self) -> None:
        raw = json.dumps(self.manifest())
        raw = raw.replace('"outcome": "COMPLETE"', '"outcome": "PARTIAL", "outcome": "COMPLETE"')
        result = self.run_raw_manifest(raw)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("duplicate JSON key", result.stderr)

    def test_rejects_control_characters_in_requirement_id(self) -> None:
        manifest = self.manifest()
        requirements = cast(list[dict[str, object]], manifest["requirements"])
        requirements[0]["id"] = "R1\nOK: forged"
        result = self.run_manifest(manifest)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("must not contain control characters", result.stderr)
        self.assertNotIn("OK: forged", result.stdout)

    def test_rejects_requirement_above_target_level(self) -> None:
        manifest = self.manifest(
            target="IMPLEMENTED",
            claimed="PUBLISHED",
            required="PUBLISHED",
            evidence=[
                self.evidence("artifact"),
                self.evidence("test"),
                self.evidence("remote", immutable_reference=True, read_back=True),
            ],
        )
        self.assert_rejected(manifest, "above target_level IMPLEMENTED")

    def test_rejects_target_above_every_requirement(self) -> None:
        manifest = self.manifest(
            target="PUBLISHED",
            claimed="IMPLEMENTED",
            required="IMPLEMENTED",
            evidence=[self.evidence("artifact")],
        )
        self.assert_rejected(manifest, "highest requirement level: IMPLEMENTED")

    def test_rejects_claimed_as_target_level(self) -> None:
        manifest = self.manifest(
            target="CLAIMED",
            claimed="CLAIMED",
            requirement_status="UNSATISFIED",
            required="CLAIMED",
            evidence=[],
        )
        self.assert_rejected(manifest, "CLAIMED is not completion")

    def test_rejects_nonfinite_max_age_hours(self) -> None:
        for value in ("nan", "inf", "-inf"):
            with self.subTest(value=value):
                result = self.run_manifest(self.manifest(), f"--max-age-hours={value}")
                self.assertNotEqual(result.returncode, 0)
                self.assertIn("finite number greater than zero", result.stderr)


if __name__ == "__main__":
    unittest.main()
