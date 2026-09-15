# CI concurrency policy

The current `/ln-rank/simulation-report.html` is owned by the v014 workbench verification workflow. Historical v001-v013 compatibility workflows should not use the current shared page as their automatic pull-request trigger; their verification remains available for explicit/manual regression runs.

PR verification should prefer one current workflow per owned surface and use workflow-scoped concurrency with `cancel-in-progress: true`, so newer commits supersede stale queued runs.

Full release/runtime/resource/production/deployment verification remains a mainline release gate. A small simulation workbench change must not fan out into every historical simulation workflow.
