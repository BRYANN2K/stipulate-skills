# ADR decision quality

## Evidence classes

- **Observed:** current code, production data, measured test, executed spike, contractual fact.
- **Sourced:** authoritative external documentation or standard.
- **Estimated:** explicit model with assumptions and range.
- **Assumed:** not yet validated; name owner and validation path.

Do not convert an estimate into a fact by placing it in a comparison table.

## Decision matrix

Use a matrix only when it clarifies—not replaces—judgment:

| Driver | Weight | Option A | Option B | Status quo | Evidence |
|---|---:|---:|---:|---:|---|

Weights and scores need definitions. A weighted total cannot override a hard constraint. Record sensitivity when a small score change flips the result.

## Decision readiness test

An ADR is ready for acceptance when:

- accountable deciders and affected stakeholders are known;
- hard constraints and viable options are explicit;
- high-impact unknowns have been validated or consciously accepted;
- migration and operational consequences are understood;
- implementation ownership exists;
- no unresolved contradiction with a governing ADR remains.

## Revisit triggers

Tie triggers to assumptions: volume, latency, availability, cost, team size, dependency lifecycle, security/regulatory posture, portability, or operational load. “Review annually” is weaker than “revisit when monthly spend exceeds X or cross-region RPO becomes < Y,” unless calendar review is itself required.
