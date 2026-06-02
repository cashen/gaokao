# v3.9.5.6-ln-rank-ai-zone-consistency-cleanup

## 目标

本版把 ln-rank 的自选池诊断升级为“全分数段一致的 AI 高报师位次功能区判断”。

核心链路：

```text
事实层：分数、位次、控制线、密度、自选池结构
候选层：代码给出 1-2 个候选位次功能区
AI层：AI 在候选区范围内判断主功能区、辅助功能区和主要矛盾
校验层：代码拦截越界、禁词、编造、JSON泄漏
展示层：前端和飞书只展示人类可读 narrative
```

## 硬约束

- 不包含 `/fenxi` 静态目录。
- 不包含 `functions/fenxi`。
- 不包含 `functions/_middleware.js`。
- 未修改 `/fenxi/data`。
- AI 不生成完整 112 志愿，不预测录取概率。
- AI 不能说“必录、稳进、闭眼报、一定上岸”。
- AI 的 `finalZone.zoneKey` 必须来自代码给出的 `candidateZones`。

## 新增文件

```text
functions/_lib/advisor-fact-builder.js
functions/_lib/advisor-zone-candidates.js
functions/_lib/advisor-zone-policy.js
functions/_lib/advisor-ai-prompt.js
functions/_lib/advisor-ai-validator.js
functions/_lib/advisor-fallback-writer.js
```

## 修改文件

```text
functions/api/path-analysis.js
functions/_lib/feishu-selection-pool-report-builder.js
ln-rank/selection-pool.html
ln-rank/js/selection-pool.v3956.js
ln-rank/js/feature/selection-pool/path-analysis-api.v3956.js
ln-rank/css/selection-pool.v3956.css
```

## 功能区覆盖

```text
below-undergraduate-zone
undergraduate-edge-zone
undergraduate-quality-zone
public-sensitive-zone
special-edge-zone
applied-tech-main-zone
industry-entry-zone
industry-platform-zone
platform-major-balance-zone
high-platform-zone
top-platform-fine-sort-zone
```

## 验收重点

- 450、495、515、545、565、585、605、640、680 都能输出不同功能区判断。
- AI 成功时展示 AI narrative。
- AI 不可用或校验失败时展示 fallback narrative。
- 前端不显示 JSON。
- 飞书报告不重复堆叠 AI/规则/快速复核全文。
