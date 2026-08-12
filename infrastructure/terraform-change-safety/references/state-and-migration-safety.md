# State and migration safety

State operations can detach, re-address, or recreate real infrastructure. Treat every state mutation as a production change even when no cloud API call is expected.

## Before any state/backend operation

1. Identify the authoritative backend and workspace.
2. Confirm no concurrent run or lock owner.
3. Pull an encrypted recovery copy without displaying values.
4. Inventory serial/lineage and affected addresses.
5. Prove the target resource identity from provider IDs.
6. Write the forward and reverse command sequence.
7. Rehearse against an isolated copy or non-production environment when feasible.

## Prefer declarative moves

Use `moved` blocks for durable address changes. They are reviewable, versioned, and repeatable. Use direct `state mv` only when declarative migration is impossible and explicit authorization is granted.

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
