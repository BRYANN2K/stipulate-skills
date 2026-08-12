# Cloud review evidence and scoring

## Evidence ledger

Maintain one row per claim:

| ID | Claim/control | Source | Freshness | Confidence | Contradictions |
|---|---|---|---|---|---|

Evidence expires at different rates. A current Terraform file may still differ from runtime; a diagram may remain conceptually useful while resource details drift. State the observation date when live data is used.

## Finding severity

- **Critical** — plausible compromise, unrecoverable data loss, or broad outage with no effective control.
- **High** — major objective can fail; workaround or recovery is uncertain.
- **Medium** — meaningful degradation, operational burden, or defense-in-depth gap.
- **Low** — localized improvement with limited near-term exposure.
- **Opportunity** — optimization not tied to a current control failure.

Severity is not confidence. A critical unknown remains critical and should trigger evidence collection.

## Recommendation test

A recommendation is actionable only if it states:

- failure or objective addressed;
- smallest useful change;
- owner role and dependencies;
- validation signal;
- cost/complexity trade-off;
- rollback or migration strategy when applicable.

Avoid vendor feature shopping. Recommend a capability first, then map it to provider-native or portable implementations.
