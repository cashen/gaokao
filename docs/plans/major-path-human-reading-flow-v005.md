# major-path human reading flow v0.05

## Goal

让 `/major-path` 先回答用户正在看的问题，再展开本科、研究生与关系图谱信息；消除核心渲染后的原始内容闪现和多次滚动争抢，同时保留 `ln-rank → major-path → tongxue` 的来源、返回与证据边界。

## Scope

- active module versions: `major-path v0.05`, `core v0.05`, `human v0.05`
- preserve site release identity: `v3.9.90.2 / v3990_2`
- preserve canonical catalog, resolver, pathway, relationship graph, background-context and major-path-navigation owners
- no changes to protected `fenxi` paths, release-contract exports, or the 883/92/13 data boundary
- no new truth, viewport, storage, or runtime owner

## Implementation

1. Add this checkpoint and keep the branch based on main SHA `5d4e7a90463ddebf6be578037b3076fc34b97a64`.
2. Promote the major-path core and human shell to v0.05.
3. Make the core render-only: remove its `scrollIntoView` ownership, use neutral result language, and expose stable suggestion ARIA state.
4. Let the human shell hold the result until its answer-first presentation is complete, then perform one intentional viewport action.
5. Tune v0.05 CSS toward a warmer, quieter reading hierarchy while preserving mobile tap targets and direct-entry handoff.
6. Update source-contract, browser, live, workflow, architecture, and handoff documentation to the same version.

## Network-interruption recovery

- the branch and checkpoint file are the durable handoff record
- before every write, re-read the branch head and PR head
- after a timeout, treat write state as unknown until the file/commit is read back
- after every test transition, record the verified SHA and workflow run
- never merge unless Ready checks pass against the exact PR head SHA and the merge call uses `expected_head_sha`

## Verification and acceptance

- `node --check` for active JS
- major-path truth/source-contract tests
- browser tests for PC, Pad, Android, compact/mobile and direct `ln-rank`/Tongxue handoff
- Preview exact-head resource and browser checks
- main exact-SHA resource graph and production route/style checks after merge
- reject the release for CSS/JS 404, raw-to-human flicker, viewport tug-of-war, broken source context/return, data parity drift, failed/no-op workflow, version mismatch, or P1 security regression

## Rollback

If any gate fails, leave main unchanged, keep the PR unmerged, and either fix on this branch or revert the single merge commit after exact-main evidence is captured.
