# Security policy

## Operational boundary

These skills provide reusable workflows, not autonomous authorization. Operational skills default to read-only discovery and analysis.

The following actions require explicit, scoped user authorization at execution time:

- Terraform/OpenTofu `apply`, `destroy`, import, state mutation, or backend migration;
- Kubernetes create, apply, patch, delete, rollout, scale, drain, or exec actions;
- cloud IAM, networking, data, billing, or control-plane changes;
- CI/CD reruns, releases, deployments, promotions, or secret changes;
- GitOps reconciliation, suspension, resume, rollback, or source mutation;
- chaos experiments or any deliberate fault injection.

Authorization to review a plan is not authorization to execute it.

## Secrets

Skills must never print, store, commit, or transmit secret values. Mask tokens, private keys, credentials, cookies, kubeconfig data, Terraform state values, and Kubernetes Secret contents. Prefer metadata and key names when diagnosis does not require values.

Private journals created by a skill remain sensitive local data. A `.gitignore` rule only reduces accidental commits; it is not encryption or access control. A journaling workflow must verify that its file is ignored and untracked, minimize retained data, and refuse secrets, customer data, sensitive personal information, confidential infrastructure details, and unresolved exploit details.

## Reporting a vulnerability

Do not open a public issue for a vulnerability that could lead an agent to expose secrets or perform an unsafe mutation. Contact the repository owner privately through GitHub instead. Include the affected skill, trigger, unsafe behavior, and a minimal reproduction without real credentials.
