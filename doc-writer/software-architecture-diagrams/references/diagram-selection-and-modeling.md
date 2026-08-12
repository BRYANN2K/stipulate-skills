# Diagram selection and architecture modeling

## C4-style levels

### Context

Shows people, the focal software system, and external systems. No internal services or databases unless they are external systems in their own right.

### Container

Shows independently deployable/runnable units and data stores inside the system boundary, plus external actors/systems. “Container” is a C4 term, not necessarily a Docker container.

### Component

Shows meaningful modules inside one container. Create it only when it answers an implementation/ownership question; do not diagram every class.

### Deployment

Maps software instances to infrastructure/runtime nodes, environments, regions/AZs, networks, or orchestrators. Keep it separate from logical architecture when both become crowded.

## Other diagrams

- **Sequence:** one scenario, ordered messages, success/failure/async behavior.
- **State:** lifecycle states, guarded transitions, terminal/error states.
- **ER:** entities, keys, cardinality, and ownership; not runtime call flow.
- **Data flow:** transformations, stores, trust boundaries, and data classes.
- **Flowchart:** decisions, pipelines, dependencies, or a simplified topology.

## Relationship labels

Prefer “Publishes OrderPlaced via Kafka” over “uses.” Include protocol/transport only when it matters to the question. Distinguish synchronous call, asynchronous event, data replication, human action, and control-plane management.

## Views, not one master diagram

Maintain a small shared model vocabulary, then create audience-specific views. A security review needs trust/data boundaries; onboarding needs systems and ownership; incident response needs runtime dependencies; deployment needs environments and failover.
