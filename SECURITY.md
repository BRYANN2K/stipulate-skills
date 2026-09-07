# Scope and security

The engine runs locally and offline. It does not invoke a production shell, deploy services, or make network calls. Git commits use repository hooks, whose behavior depends on the project's environment.

The operator records user approval. The core does not provide authentication, signatures, or protection against a user falsifying their own files. Acceptance reports must reflect real observations. Digests identify local work; they do not establish the truth of results or the state of an external service.

Workflow paths reject traversal and symlinks. Archive rejects preexisting source changes on affected files, a nonempty index, stale evidence, and concurrently modified targets. A local lock prevents concurrent writes through the CLI. It does not lock editors or every external Git operation.

Do not put credentials, customer payloads, or private logs in proposals, specifications, evidence, or documentation summaries. `state.json` includes names and digests of tracked or non-ignored files; inspect what will be committed. Do not put private information in Git on the assumption that archiving protects it.

Publication, pushing commits, and remote domain operations require the corresponding scope and authorization. No skill can expand environment permissions.
