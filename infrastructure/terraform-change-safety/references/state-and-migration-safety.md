# State and migration safety

Load this reference only for state, import, address-move, or backend work. State operations can detach, re-address, or recreate real infrastructure. Treat every state mutation as a live change even when no cloud API call is expected. Design may remain read-only; execution requires exact authorization and the safeguards below.

## Before any authorized state/backend mutation

1. Identify the authoritative backend and workspace.
2. Confirm no concurrent run or lock owner.
3. Create a protected, access-controlled recovery copy without displaying values; encrypt it when the selected tool, storage, and custody policy support that choice.
4. Inventory serial/lineage and affected addresses.
5. Prove the target resource identity from provider IDs.
6. Write the forward and reverse command sequence.
7. Rehearse the exact transformation with isolated state copies when the operation will actually migrate state.

## Prefer declarative moves

Use `moved` blocks for durable address changes. They are reviewable, versioned, and repeatable. Use direct `state mv` only when declarative migration is impossible and explicit authorization is granted.

## Conditional state and saved-plan encryption

First identify the implementation and version. OpenTofu can optionally encrypt state and saved-plan data at rest; it does not enable that behavior merely because OpenTofu is in use, and Terraform or a backend can have a different encryption/custody contract. Recommend or validate this branch only when the threat model, tool capability, key ownership, recovery process, and consumers of state/plan artifacts make it applicable.

When OpenTofu encryption is selected, assess state and plan targets separately, preserve access to required keys and configuration, and rehearse recovery before removing an old method or fallback. A migration from plaintext or an old method needs an explicitly bounded read fallback and writes with the selected new method; remove fallback material only after every authoritative artifact has been rewritten and read back. Encryption at rest does not provide freshness, prevent replay, replace backend access control/versioning/locking, or recover corrupted/lost state.

## Isolated two-state rehearsal

For an actual split, merge, or cross-state move, rehearse with disposable copies of **both** authoritative inputs: one source-state copy and one destination-state copy. Keep immutable recovery copies separate from the rehearsal pair. Use the same tool version, configuration roots, address mapping, and destination-collision rules planned for execution, but point all state operations at the isolated copies and prevent an apply.

After the forward rehearsal, verify source removals, destination additions, lineage/serial expectations, one-to-one remote IDs, absence of duplicate ownership, and a no-unintended-change plan from both configuration roots under explicitly chosen refresh behavior. Exercise the reverse procedure against the rehearsal pair. A single synthetic state cannot reveal destination address collisions or duplicate ownership across two states.

Address-only moves within one state do not need a fabricated second state. Conversely, “non-production” is not isolation if it shares the authoritative backend, lock, credentials, or remote objects.

## Backend migration

Separate backend migration from resource changes. Verify destination encryption, access control, versioning, and locking first. Preserve the source until the destination state is readable and a no-change plan is demonstrated from the new backend.

## Import

Before import, confirm the configuration exactly models the remote object. Importing first and “fixing the plan later” can produce destructive convergence.

## Recovery evidence

A recovery plan names:

- protected backup location and timestamp;
- lineage/serial or equivalent identity;
- restore command/procedure;
- owner authorized to restore;
- validation proving resources and addresses match afterward.


A reference checklist or successful no-change plan is not proof that recovery works. Preserve the exact target, operation output, and post-operation state/address plus remote-resource readback.

## Compact adversarial examples

- “OpenTofu is installed, so all state and plans are encrypted” is false without the selected encryption configuration and artifact readback.
- A cross-state `state mv` is tested only against a copy of the source. The rehearsal misses an address already owned by the destination and therefore does not support execution readiness.
- The rehearsal uses production backend configuration with a different workspace name. Because backend/workspace mapping is not proven isolated, stop rather than assuming the name prevents authoritative-state access.
- Encryption rollover succeeds, but the old fallback and key are deleted before every stored plan/state consumer is read back. Recovery remains unproved.

## Source notes

The optional encryption branch is independently paraphrased from OpenTofu commit [`1d920536abf6162e3f336e751c336bcef788c64d`](https://github.com/opentofu/opentofu/tree/1d920536abf6162e3f336e751c336bcef788c64d) (MPL-2.0), especially [`website/docs/language/state/encryption.mdx`](https://github.com/opentofu/opentofu/blob/1d920536abf6162e3f336e751c336bcef788c64d/website/docs/language/state/encryption.mdx), [`internal/encryption/plan.go`](https://github.com/opentofu/opentofu/blob/1d920536abf6162e3f336e751c336bcef788c64d/internal/encryption/plan.go), and the migration cases in [`internal/command/e2etest/encryption_test.go`](https://github.com/opentofu/opentofu/blob/1d920536abf6162e3f336e751c336bcef788c64d/internal/command/e2etest/encryption_test.go). These citations do not make encryption mandatory or extend OpenTofu behavior to Terraform or every backend.
