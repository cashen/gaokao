# Resource Consistency & Site Release v3990_2

## Purpose

在不复制或重命名稳定运行时的前提下，将当前站点可执行资源、缓存身份、发布台账和验证门禁收敛到现有 canonical active release：

- public release: `v3.9.90.2`
- runtime generation: `v3990_2`
- asset query: `3990_2`

本 PR 是资源治理与发布台账收口，不创建第二套 `v3990_3` 运行时。AIPLuS 的 `v3992.x` 只作为已登记的传递实现，不再被误认为独立站点版本。

## Work plan

1. Reconcile the current release center, site-runtime contract, runtime-cache contract, resource-execution contract and active-generation manifest.
2. Register the AIPLuS transitive execution graph (workspace, model, render, history and fact bridge) under one release-owned manifest.
3. Register the source-backed major interpretation package, its chunk manifest, source date/hash and cache identity under the same data-resource graph.
4. Keep the shared school identity center as the only school-entity truth and route directory loading through one bounded school-resource loader; preserve Tongxue compatibility.
5. Make all current public/version metadata, active entrypoint markers, cache contracts, status ledgers and verification expectations resolve to `v3.9.90.2 / v3990_2 / 3990_2`.
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

All current public/runtime/entrypoint/manifest/cache/status/verification identities must resolve to `v3.9.90.2 / v3990_2 / 3990_2`. Capability-local versions such as AIPLuS v0.02, Decision Focus v0.06, Tongxue v1.5.9 and the internal AIPLuS v3992 implementation are subordinate capability identities, not competing site releases. Immutable historical assets retain their filenames only when explicitly registered as stable or compatibility resources. Root and `ln-rank` historical `VERSION.txt` files are not release owners.

## Completion gate

This plan is complete only when the final exact main SHA has:

- one active site release identity;
- no unclassified browser-reachable resource;
- no AIPLuS v3992 transitive dependency outside the release-owned manifest;
- source-profile data and cache identity registered;
- status ledgers reconciled to current main;
- all required checks green on the same final SHA;
- exact-main Pages/custom-domain Production and live PC/Pad/Android journeys verified.
