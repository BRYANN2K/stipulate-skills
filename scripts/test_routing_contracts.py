#!/usr/bin/env python3
"""Contract regressions for direct routing, handoff continuity, and claim truth.

These tests protect the documented routing/evidence behavior. They do not claim to
execute or score a model.
"""

from __future__ import annotations

import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HANDOFF = ROOT / "agent-workflows/agent-workflows/references/domain-handoffs.md"

ENTRY_SKILLS = (
    "infrastructure/infrastructure/SKILL.md",
    "devops/devops/SKILL.md",
    "software-development/software-engineering/SKILL.md",
    "doc-writer/documentation/SKILL.md",
    "agent-workflows/agent-workflows/SKILL.md",
    "creator/creator-workflows/SKILL.md",
)


def text(path: str | Path) -> str:
    return (ROOT / path).read_text(encoding="utf-8") if isinstance(path, str) else path.read_text(encoding="utf-8")


def description(skill: str) -> str:
    match = re.search(r'^description: "([^"]+)"$', text(skill), re.MULTILINE)
    if not match:
        raise AssertionError(f"missing quoted description in {skill}")
    return match.group(1)


class RoutingContractTests(unittest.TestCase):
    def test_domain_entries_are_broad_or_cross_cutting_not_specialist_wrappers(self) -> None:
        for skill in ENTRY_SKILLS:
            with self.subTest(skill=skill):
                body = text(skill)
                desc = description(skill).casefold()
                self.assertTrue(
                    any(term in desc for term in ("broad", "ambiguous", "crosses", "cross-cutting")),
                    desc,
                )
                self.assertRegex(body, r"(?i)(specialist directly|directly when|do not use this orchestrator)")
                self.assertNotIn("mandatory lifecycle", body.casefold())

    def test_compact_route_fixtures_preserve_direct_and_composed_cases(self) -> None:
        handoff = text(HANDOFF)
        expected = (
            '“Fix this README typo.” → `developer-documentation` directly',
            '“Review this Terraform plan; do not apply.” → `terraform-change-safety`',
            '“Why is Flux reporting HelmRelease drift?” → `gitops-operations`',
            '“500s began after deploy; investigate only.” → `sre-incident-investigation`',
            '“Add auth wizard to existing app; use current design.” → `web-application-engineering`',
            'Interface Studio resolves the visual contract, then one website engineer implements it without rediscovery',
            'Documentation selects ADR plus diagram only because the one deliverable needs both',
            'Agent Workflows selects authoring plus the completion adapter',
            '“Privately save this incident lesson; don’t draft/post.” → `build-in-public-journal` directly',
            'the identical second hop is blocked without new evidence',
            'preserves both sourced claims and reports the conflict',
        )
        for case in expected:
            with self.subTest(case=case):
                self.assertIn(case, handoff)

    def test_handoff_authority_never_widens_and_replay_is_blocked(self) -> None:
        handoff = text(HANDOFF).casefold()
        for phrase in (
            "intersection of incoming authority and its own stricter gates",
            "routing never expands authority",
            "do not replay completed work",
            "do not hand it back absent new evidence",
            "supporting",
            "contradicting",
            "qualifying",
            "missing",
            "never upgrade an inference",
        ):
            with self.subTest(phrase=phrase):
                self.assertIn(phrase, handoff)

    def test_classified_interface_transfers_to_a_direct_engineering_owner(self) -> None:
        studio = text("design/interface-studio/SKILL.md")
        self.assertIn("hand off directly", studio)
        self.assertIn("transfer ownership to the direct engineering specialist", studio)
        self.assertNotIn("Use `software-engineering` instead", studio)
        self.assertNotIn("design/web-craft", text("skill-registry.json"))

    def test_claim_and_adapter_boundaries_remain_narrow(self) -> None:
        completion = text("agent-workflows/verified-completion/SKILL.md")
        focus = text("agent-workflows/focus-friendly-delivery/SKILL.md")
        prose = text("creator/prose-pattern-audit/SKILL.md")
        self.assertIn("Missing, stale, irrelevant, failed, skipped, unavailable, inaccessible, or contradictory evidence", completion)
        self.assertIn("Use exactly one final `Next:` only for an explicit one-step-at-a-time preference", focus)
        self.assertIn("never claims to identify authorship", description("creator/prose-pattern-audit/SKILL.md"))
        self.assertIn("Detect mode is read-only", prose)

    def test_registry_contains_each_existing_skill_once(self) -> None:
        registry = json.loads(text("skill-registry.json"))
        entries = registry["skills"]
        names = [item["name"] for item in entries]
        self.assertEqual(len(names), len(set(names)))
        self.assertEqual(len(names), 33)
        for item in entries:
            with self.subTest(skill=item["name"]):
                self.assertTrue((ROOT / item["path"] / "SKILL.md").is_file())


if __name__ == "__main__":
    unittest.main()
