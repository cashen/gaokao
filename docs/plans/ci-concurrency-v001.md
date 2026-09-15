# CI concurrency and trigger plan

## Goal
Keep PR verification responsive by making legacy compatibility workflows own only their version-specific assets, while v014 owns the current simulation workbench page-level verification.

## Rules
- Legacy simulation report workflows must not use the shared current `ln-rank/simulation-report.html` as a trigger.
- Each PR workflow uses workflow-scoped concurrency with `cancel-in-progress: true`.
- Current v014 contract/browser remains the page-level gate for the simulation workbench.
- Mainline release/runtime/resource/production/deployment verification remains the final release gate.
- A small PR change must not fan out into unrelated historical simulation checks.

## Rollout
1. Narrow v001/v003/v005/v006/v007/v008/v009/v010/v011/v012/v013 triggers.
2. Retain v014 as the current page owner.
3. Verify that a new v014 HEAD no longer creates the historical simulation fan-out.
4. Keep the existing full release gate for merge/main verification.
