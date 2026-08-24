# Resource Consistency & Site Release v3990_3

## Purpose

将当前站点可执行资源、缓存身份、发布台账和验证门禁收敛到一个 canonical active release：

- public release: `v3.9.90.3`
- runtime generation: `v3990_3`
- asset query: `3990_3`

历史稳定资源可以继续存在，但只能以 `stable dependency` 或 `compatibility` 身份存在，不能被当前入口、当前发布号或当前状态台账误认为 active owner。

## Work plan

1. Reconcile the current release center, site-runtime contract, runtime-cache contract, resource-execution contract and active-generation manifest.
2. Register the AIPLuS transitive execution graph (workspace, model, render, history and fact bridge) under one release-owned manifest.
3. Register the source-backed major interpretation package, its chunk manifest, source date/hash and cache identity under the same data-resource graph.
4. Keep the shared school identity center as the only school-entity truth and route directory loading through one bounded school-resource loader; preserve Tongxue compatibility.
5. Update active page entrypoints, release presenters, cache markers, health/release metadata and validation gates to the same active version.
6. Reconcile durable status files so each current ledger has a current-main snapshot and does not present historical PR/SHA evidence as an unfinished current task.
7. Run source, architecture, syntax, human-copy, resource-graph, AIPLuS, Tongxue, major-source, browser and protected-boundary checks.
8. Keep Draft through exact-head Preview and multi-terminal verification; freeze one head SHA; mark Ready without changing it; run a second fresh verification round; merge only with that exact head; verify exact-main Production.

## Ownership rules

- `current-release.js` owns the public release identity.
- `site-runtime-contract` owns active/stable/compatibility classifications.
- `runtime-cache-contract` owns cache identities and invalidation policy.
- `resource-registry.js` owns the whole-site resource graph.
- AIPLuS keeps one workspace/history/render owner; no second workspace or state machine.
- `school-identity-center.js` remains the school identity truth owner.
- Canonical 2026 major catalog remains the major identity owner.
- Source-backed major interpretation is additive evidence and never admissions truth.
- Protected paths remain unchanged: `/fenxi/`, `functions/fenxi/`, `functions/_middleware.js`.
- `functions/_lib/release-contract.js` must retain `LN_RANK_RELEASE_CONTRACT` and `RELEASE_CONTRACT`.

## Version policy

Only the active public/runtime/entrypoint/manifest/cache/status/verification identities use `v3.9.90.3 / v3990_3 / 3990_3`. Immutable historical assets retain their filenames only when explicitly registered as stable or compatibility resources. Root and `ln-rank` historical `VERSION.txt` files are not release owners.

## Completion gate

This plan is complete only when the final exact main SHA has:

- one active site release identity;
- no unclassified browser-reachable resource;
- no active AIPLuS v3992 transitive dependency outside the release manifest;
- source-profile data and cache identity registered;
- status ledgers reconciled to current main;
- all required checks green on the same final SHA;
- exact-main Pages/custom-domain Production and live PC/Pad/Android journeys verified.
