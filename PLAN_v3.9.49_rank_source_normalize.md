# PLAN v3.9.49 rank-source-normalize

## 目标

修复 v3.9.48 飞书概要中“考生位次由自选池专业位次反推”的口径问题，改为：

- 整理页不再显示“考生位次（可选）”。
- 考生位次只按辽宁 2025 物理类一分一段表由分数自动取数。
- 飞书标题与概要显示同分位次区间。
- 位次跨度计算采用同分末位累计口径。
- 为 2026 一分一段发布后的等位分/同位分换算预留 provider 接口。

## 本版修复

1. 新增 `functions/_lib/ln-2025-physics-score-rank.js`。
2. 新增 `functions/_lib/rank-table-provider.js`。
3. 修改 `selection-pool-rank-utils.js`：删除自选池反推考生位次逻辑。
4. 修改 `selection-pool-summary.js`：summary 中保留 rankStart、rankEnd、sameCount、rankForGap。
5. 修改飞书 Markdown 与 styled blocks：标题、概要、口径说明均显示自动位次区间。
6. 修改整理页：只保留考生分数输入，不再展示手填位次。
7. 顺手修复其它位次相关代码：
   - 专业列表排序时，缺失/0 位次不再排到真实位次前面。
   - `fenxi-normalizer` 将非正位次视为缺失，避免出现“最低位次 0”。
   - `fenxi-catalog` 的 bestRank2025 忽略 0 / 非正位次。

## 460 分硬口径

- 461 分累计：76,197
- 460 分同分人数：542
- 460 分累计：76,739
- 展示区间：76,198–76,739
- 位次差计算：默认使用 76,739

## 2026 扩展口

保留：

- `lookupScoreRank({ year, region, subject, score })`
- `findEquivalentScoreByRank({ targetYear, region, subject, rank })`
- `describeEquivalentRankRoadmap()`

2026 一分一段发布后，新增 `ln-2026-physics-score-rank.js` 并在 provider 注册即可，不需要重写飞书概要和自选池算法。
