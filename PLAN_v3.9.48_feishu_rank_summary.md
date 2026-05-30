# v3.9.48 飞书位次概要增强计划

## 目标

在不改变 /ln-rank 主工具结构、不另起自选池体系、不重写冲稳保判定的前提下，让飞书报告开头形成一个家长能直接看懂的“分数｜位次｜冲稳保位次跨度”概要。

## 本版原则

1. 主工具仍是 `/ln-rank`，`/fenxi/data` 只是专业数据来源。
2. 飞书概要只统计自选池现有标签，不重新判断冲稳保。
3. 位次字段集中读取，避免在报告 builder 里散落 `rank || minRank || lowestRank`。
4. 位次缺失不硬编；能算则算，不能算则写明“位次待核验”。
5. 彩色飞书 blocks 失败时继续 fallback 到 Markdown / 普通 blocks。

## 新增与调整

- 新增 `functions/_lib/selection-pool-rank-utils.js`
  - 统一读取考生位次、专业参考位次、专业参考分。
  - 统一输出位次跨度文案。

- 新增 `functions/_lib/selection-pool-summary.js`
  - 统计冲刺、匹配/稳妥、保底数量。
  - 统计最高向前跨越、最大向后回落。
  - 匹配/稳妥区拆分为向前、接近、向后。
  - 统计缺失位次数量。

- 增强 `functions/_lib/feishu-selection-pool-report-builder.js`
  - 标题升级为 `分数｜位次｜报告类型｜辽宁物理类`。
  - Markdown fallback 也包含概要判断。

- 增强 `functions/_lib/feishu-selection-pool-styled-builder.js`
  - 飞书彩色 blocks 开头新增“概要判断”。
  - 关键位次跨度、冲稳保标签彩色加粗。

- 增强整理页
  - 新增“考生位次（可选）”输入。
  - 位次未填时，飞书报告只做参考估算，并明确标注。

## 不做事项

- 不改 `/api/major-bands`。
- 不改 `/api/path-analysis` 业务口径。
- 不改 `/fenxi/data` 数据结构。
- 不改变首页“右侧胶囊进入整理页”的产品判断。
