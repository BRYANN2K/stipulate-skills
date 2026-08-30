# Postmortem and corrective-action branch

Use this reference only for requested or policy-required learning work. Scale the artifact to incident impact, complexity, recurrence risk, and expected follow-through.

## Causal structure

Preserve the applicable distinctions:

- **Trigger** — event that initiated the incident;
- **Contributing conditions** — design, configuration, workload, or process that amplified it;
- **Propagation** — how impact crossed boundaries;
- **Detection** — what signaled it and what stayed invisible;
- **Response** — what accelerated or delayed restoration;
- **Recovery** — what restored the critical journey.

Do not force one root cause, “five whys,” or a complete causal graph when evidence does not support it. Avoid “human error” as an endpoint; examine what control, interface, review, automation, or safe default allowed the effect.

## Action quality

A useful action links to an evidenced failure mode and states a concrete deliverable plus how effectiveness will be observed. Add the governance fields the team actually needs—owner, priority, due condition/date, tracking ID, dependencies, or proof—rather than requiring all fields for every note.

Balance prevention, detection, containment, recovery, and learning only where the incident shows gaps. Do not create many low-value tasks that hide the systemic fixes.

Separate delivery status from effectiveness. Before implementation, bind each material action to the failure mode, baseline, predicted leading/system signal, predicted user outcome, evidence source, and readback window or decision condition. After implementation, collect the planned readback and classify effectiveness as **effective**, **ineffective**, or **inconclusive**, with evidence and residual risk. `Implemented` or `closed` means the deliverable exists; it is not an effectiveness result. If the signal cannot be observed yet, schedule the readback rather than assume benefit.

## Optional counterfactual

For a material proposed control, ask whether it would plausibly have prevented, shortened, detected, or contained this event. Reframe or remove it if not. Counterfactual analysis is a quality aid for consequential actions, not required ceremony for every retrospective item.

## Compact adversarial evals

| Probe | Required behavior |
|---|---|
| “Add a dashboard” is marked complete, but no predicted detection or recovery behavior, baseline, or post-change observation exists | Keep delivery complete but effectiveness inconclusive; add a failure-mode-linked readback or reframe the action |
| A retry change reduced one error metric while user completion and downstream load worsened | Mark the action ineffective or harmful for the intended outcome; preserve the contradictory readback and residual risk |
| A training action is proposed after an operator followed the documented unsafe path | Do not end at human error; address the control/interface/default that allowed the path and define an observable effectiveness check |

## Source anchors

Corrective-action and learning structure is grounded in PagerDuty's [`docs/after/effective_post_mortems.md`](https://github.com/PagerDuty/incident-response-docs/blob/464fc9d3e47e19e9d8da17cec1a41dc09624e95a/docs/after/effective_post_mortems.md) and [`docs/after/post_mortem_template.md`](https://github.com/PagerDuty/incident-response-docs/blob/464fc9d3e47e19e9d8da17cec1a41dc09624e95a/docs/after/post_mortem_template.md), revision `464fc9d3e47e19e9d8da17cec1a41dc09624e95a`, Apache-2.0 ([root license](https://github.com/PagerDuty/incident-response-docs/blob/464fc9d3e47e19e9d8da17cec1a41dc09624e95a/LICENSE)). The effectiveness readback classification is a tool-neutral extension; it adds no mandatory incident phase.
