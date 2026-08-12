# Postmortem and corrective actions

## Causal structure

Separate:

- **Trigger** — event that initiated the incident.
- **Contributing conditions** — design, configuration, workload, or process that amplified it.
- **Propagation** — how impact crossed boundaries.
- **Detection** — what signaled it and what stayed invisible.
- **Response** — what accelerated or delayed restoration.
- **Recovery** — what actually restored the critical journey.

Avoid “human error” as an endpoint. Ask what control, interface, review, automation, or safe default allowed one action to have that effect.

## Action quality

Each action must include owner, priority, due condition/date, linked failure mode, deliverable, and proof of effectiveness.

Strong: “Platform team adds a rollout gate that aborts when checkout 5xx exceeds 1% for 5 minutes; validate in staging fault test and next canary.”

Weak: “Improve alerts.”

Balance actions across prevention, detection, containment, recovery, and learning. Do not create twenty low-value tasks that hide the two systemic fixes.

## Counterfactual test

For each action ask: if it had existed before the incident, would it have prevented, shortened, detected, or contained the event? If none, remove or reframe it.
