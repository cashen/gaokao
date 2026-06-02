# v3.9.5.7-ln-rank-push-rate-reference

## 本版目标
在 v3.9.5.6 的“位次功能区 + AI 高报师判断”基础上，新增“升学与推免参考”轻量指标。

核心原则：

- 保研/推免数据只作为升学路径参考，不作为录取概率、硬排序或冲稳保判定依据。
- 第一版只使用学校级推免参考、来源可信度、专业/学院待核验机制。
- 专业级保研率目前不展示精确值；没有官方学院/专业分母时，一律提示人工核验。
- AI 可以解释升学跳板价值，但只能使用 facts.pushRateSummary 与 orderedItemsLite.pushRate 中提供的数据，不得编造保研率。
- 继续不包含、不修改 `/fenxi` 静态目录。

## 新增文件

- `functions/_lib/push-rate-reference-data.js`
- `functions/_lib/push-rate-matcher.js`

## 修改文件

- `functions/_lib/advisor-fact-builder.js`
- `functions/_lib/advisor-ai-prompt.js`
- `functions/_lib/advisor-ai-validator.js`
- `functions/_lib/advisor-fallback-writer.js`
- `functions/api/path-analysis.js`
- `functions/_lib/feishu-selection-pool-report-builder.js`
- `functions/_lib/feishu-selection-pool-styled-builder.js`
- `ln-rank/selection-pool.html`
- `ln-rank/js/selection-pool.v3957.js`
- `ln-rank/js/feature/selection-pool/path-analysis-api.v3957.js`
- `ln-rank/css/selection-pool.v3957.css`

## 数据口径

`push-rate-reference-data.js` 是第一轮数据表，字段包括：

- `sourceLevel`: A/B/C/D 可信度等级
- `pushOpportunityLevel`: high / medium-high / medium / low-medium / unknown
- `schoolPushRateText`: 学校级推免参考文本
- `recommendQuotaText`: 已知推免人数/指标文本
- `majorLevelStatus`: 默认 `need_manual_check`
- `notes`: 口径说明
- `sourceUrls`: 官方来源 URL；第三方线索默认不强写来源
- `collegeSignals`: 学院/方向名额线索，但不直接计算专业保研率

## 页面变化

自选池诊断页新增“升学与推免参考”段落：

- AI 成功时：由 AI 在事实约束下解释。
- AI 不可用时：由规则兜底 writer 输出人话。
- 展开“冲稳保快速复核”时显示推免参考匹配数量。

## 验收

- `/fenxi` 不包含在 zip 中。
- AI 不可用时 `/api/path-analysis` 仍返回 `fallback` 和 `narrative.pushRateDiagnosis`。
- `大连海事大学 / 辽宁师范大学 / 东北财经大学` 等学校可匹配推免参考。
- 前端不展示 JSON，只展示自然语言。
- 飞书报告可包含“升学与推免参考”。

## 后续维护建议

下一步不要盲目扩全国全量，优先补：

1. 辽宁大学、辽宁工程技术大学、沈阳农业大学、东北财经大学等官方名单人数。
2. 大连海事大学、辽宁师范大学等毕业生分母。
3. 高频院校学院名额分配表。
4. 对应学院/专业当届毕业生人数；没有分母不计算专业级保研率。

