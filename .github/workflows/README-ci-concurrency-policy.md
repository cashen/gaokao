# CI concurrency policy

Simulation report compatibility workflows are scoped to their owned version-specific assets and must not use the current shared `ln-rank/simulation-report.html` as a trigger. The current simulation workbench is owned by the v014 contract/browser gates. Legacy compatibility checks run only when their own assets, contracts, plans, or workflow definitions change.

PR workflows should use workflow-scoped concurrency with `cancel-in-progress: true` so a newer commit supersedes an older queued run within the same workflow.

Full release, runtime, resource, production, and deployment verification remains a mainline release gate rather than a reason for every small PR edit to fan out into all historical checks.
