# Live reconciliation diagnostic DAG

Use only for requested read-only live diagnosis against a confirmed target. The graph shows dependency order; it is not a requirement to issue every query.

## Revision ledger and fresh observations

Preserve revision states independently; record a state as unavailable rather than infer it from another:

| Revision state | Meaning | Does not prove |
|---|---|---|
| **desired** | Source-of-truth revision currently requested for the target | Approval, fetch, attempt, or apply |
| **approved** | Exact revision accepted by the applicable review/promotion policy, when such a gate exists | That the controller has fetched or used it |
| **fetched** | Immutable revision/artifact actually resolved and available to the controller | Reconciliation was attempted or applied |
| **last-attempted** | Revision used by the most recent reconciliation attempt | Successful apply or health |
| **last-applied** | Revision most recently known to have applied successfully | It is current desired state or healthy now |

A condition is fresh only when its observed generation or documented controller equivalent covers the object's current generation, its revision fields cover the intended source candidate, its observation/transition follows the relevant change or operation, and reason/message describe that observation. A recent timestamp with an old generation is stale; a matching generation without revision identity cannot distinguish source content. If the controller exposes no equivalent, state the freshness limitation.

```text
desired revision (+ separately approved revision when governance exists)
  → source fetch/artifact
  → render/decrypt
  → reconciliation/admission/apply
  → inventory/tracked ownership
  → controller health
  → workload/user health
```

## Independent controller state planes

Do not infer one plane from another:

| Plane | Question it answers | Required identity |
|---|---|---|
| **comparison** | What desired revision/generation was compared with which live observation, and what differences were found? | compared revision, generation, live observation time |
| **sync** | What synchronized/out-of-sync/unknown classification resulted from that comparison? | comparison identity and status reason |
| **operation** | What action attempt is pending/running/succeeded/failed, for which revision and attempt? | operation ID, revision, start/completion time |
| **health** | What resource/workload condition is assessed now, and by which rule? | resource identity, health reason, observation time |

A target can be synced but unhealthy, healthy but out of sync, or out of sync with no operation running. A successful operation does not make a stale comparison or health observation fresh.

## Minimal discriminating evidence

Start at the suspected boundary, but verify enough upstream identity to avoid mixing revisions or targets. Useful evidence includes:

- cluster/context, namespace, controller/version, and target object;
- desired, approved when applicable, fetched, last-attempted, and last-applied revisions without collapsing missing states;
- current object generation, condition-observed generation/equivalent, revision, observation/transition time, and reason/message;
- comparison identity/result, sync classification, operation attempt/result, and health assessment as separate evidence;
- source artifact identity and bounded authentication error metadata;
- declared dependencies and the first non-ready predecessor;
- render/decrypt/apply/admission error without exposing secrets;
- inventory/tracking ownership and prune/ignore behavior;
- affected workload/user health;
- bounded controller logs for the object, revision, and time window.

## Divergence classes

- **Source/auth/artifact** — requested revision is unavailable or stale.
- **Render/decrypt** — path, values, template, decryption metadata, or schema fails.
- **Dependency/order** — predecessor is not ready or ordering is cyclic/wrong.
- **Admission/apply/RBAC** — API, CRD, policy, immutable field, conflict, or privilege blocks apply.
- **Ownership/tracking/drift** — multiple actors, mutation, normalization, inventory, or ignore rules explain divergence.
- **Controller health** — objects apply but the controller's health condition fails.
- **Runtime/user health** — reconciliation is nominal but the workload or journey fails.

A successful operation or synced comparison is not runtime proof; an out-of-sync classification alone is not proof of manual drift. Record the revision ledger, fresh generation/condition basis, independent state planes, first supported divergence, evidence time, and uncertainty. Mask credentials and Secret/private values.

## Compact adversarial evals

| Probe | Required behavior |
|---|---|
| Desired and approved are revision D5, fetched/last-applied are D4, last-attempted is D5 with failure, and `Ready` belongs to the prior generation | Report no convergence, preserve all five revision states, reject the stale condition, and locate the failed D5 attempt |
| Comparison says synced and the operation succeeded, but health is degraded | Keep comparison, sync, operation, and health separate; do not claim workload or user recovery |
| Health is currently healthy, comparison says out of sync, and no operation is running | Do not invent a failed sync operation or manual drift; inspect comparison identity, ownership, normalization, and mutation |

## Source anchors

- Argo CD status separation: [`pkg/apis/application/v1alpha1/types.go`](https://github.com/argoproj/argo-cd/blob/b642d5f6d5eba8cd644b3ca65b217e7a718645cd/pkg/apis/application/v1alpha1/types.go) and [`docs/operator-manual/health.md`](https://github.com/argoproj/argo-cd/blob/b642d5f6d5eba8cd644b3ca65b217e7a718645cd/docs/operator-manual/health.md), revision `b642d5f6d5eba8cd644b3ca65b217e7a718645cd`, Apache-2.0 ([root license](https://github.com/argoproj/argo-cd/blob/b642d5f6d5eba8cd644b3ca65b217e7a718645cd/LICENSE)).
- Flux revision, generation, and condition troubleshooting: [`content/en/flux/cheatsheets/troubleshooting.md`](https://github.com/fluxcd/website/blob/fe6fbabceeeedd908c13123cab6a14c841cf3c1d/content/en/flux/cheatsheets/troubleshooting.md) and [`content/en/flux/components/kustomize/_index.md`](https://github.com/fluxcd/website/blob/fe6fbabceeeedd908c13123cab6a14c841cf3c1d/content/en/flux/components/kustomize/_index.md), revision `fe6fbabceeeedd908c13123cab6a14c841cf3c1d`, Apache-2.0 ([root license](https://github.com/fluxcd/website/blob/fe6fbabceeeedd908c13123cab6a14c841cf3c1d/LICENSE)).
- Flux diagnostic and eval patterns: [`skills/gitops-cluster-debug/references/troubleshooting.md`](https://github.com/fluxcd/agent-skills/blob/e7e95ef1648a72f5276db6f98b799c5974ea846f/skills/gitops-cluster-debug/references/troubleshooting.md) and [`skills/gitops-cluster-debug/evals/evals.json`](https://github.com/fluxcd/agent-skills/blob/e7e95ef1648a72f5276db6f98b799c5974ea846f/skills/gitops-cluster-debug/evals/evals.json), revision `e7e95ef1648a72f5276db6f98b799c5974ea846f`, Apache-2.0 ([root license](https://github.com/fluxcd/agent-skills/blob/e7e95ef1648a72f5276db6f98b799c5974ea846f/LICENSE)).

These are controller-neutral observation rules; they prescribe no vendor CRD, command, default, or timeout.
