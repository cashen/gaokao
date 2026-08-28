# V2.92RC2.5 debug 根因修复说明

## 为什么之前一直 debug 搞不定

1. `debug.html` 外层有总超时 `Promise.race`。完整 36 例只要超过总时限，就直接返回 `caseTotal: 0`，把已经完成的 case 结果全部丢掉。
2. `ln-abc-policy-audit.v292rc2.js` 的 case 大多只有分数，没有位次。旧逻辑先依赖页面 `resolveRank/currentRank`，解析不到就返回 `null`，导致候选池和 A/B/C 计算不稳定。
3. 数据等待、计算等待、bucket 等待没有统一降级：单 case 本来应该超时后继续，但外层总超时让整轮审计看起来像“完全没跑”。

## 本版只做什么

- 增加 `rankFromScore(score)`：优先使用 `RANK2025`，低分段再用审计兜底位次。
- case 注入时自动写入 `myRank`，避免“有分无位次”。
- `runAll()` 每完成一个 case 都写入 `window.__LN_ABC_POLICY_AUDIT_LAST__`，外层超时时返回 partial report，不再清零。
- 缩短单 case 默认等待，保留 per-case timeout，避免完整审计无限拖。

## 本版不做什么

- 不改 `LN_COMPUTE_PIPELINE_V2983.applyFilters`。
- 不改 `plan-engine`。
- 不改 `rules-closure4`。
- 不改正式 A/B/C 业务公式。
