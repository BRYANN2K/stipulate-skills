# Cloud review evidence and prioritization

Load this reference for complex scoped/full assessments. A focused question needs only enough cited evidence to support its material claims; do not create one ledger row per sentence.

## Optional material-claim ledger

Use when several sources, contradictions, or handoffs make provenance hard to retain:

| Claim/control | Source and observation date | Evidence class | Confidence/limits | Contradictions |
|---|---|---|---|---|

Useful evidence classes include tested/observed, current configuration, documented design, stakeholder-reported, inferred, and unknown. Evidence expires at different rates: IaC can differ from runtime, a current diagram can omit resource detail, and inventory is a point-in-time observation.

## Finding language

Severity and confidence are independent. Use the repository's vocabulary when one exists; otherwise describe impact directly or use:

- **Critical/High** for plausible compromise, unrecoverable data loss, or broad failure of a critical objective;
- **Medium** for meaningful degradation, operational burden, or a material defense/recovery gap;
- **Low** for localized improvement with limited near-term exposure;
- **Opportunity** for optimization not tied to a current control failure.

Do not turn these labels into maturity points or a checklist total. An important unknown remains visible because of its possible impact and low confidence.

## Recommendation quality

Include only fields needed to make or execute the decision:

- objective/failure mode addressed;
- smallest useful capability/change;
- evidence and confidence;
- trade-off, dependency, or cost driver;
- validation signal;
- owner/effort/rollback/migration only when governance or production change needs them.

Prioritize qualitatively by impact, likelihood/exposure, uncertainty, dependency order, effort, and reversibility. Avoid false numeric precision. Recommend a capability first, then map it to target-provider or portable implementations.
