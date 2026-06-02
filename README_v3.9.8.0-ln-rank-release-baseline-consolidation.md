# v3.9.8.0-ln-rank-release-baseline-consolidation

本版是 ln-rank 发版基线整合版，不新增业务大功能，重点修复 v3.9.7.7 暴露的模块引用不完整问题。

## 核心

- 统一搜索页与自选专业页版本到 v3980。
- 补齐报告模块 `report-payload-builder.v3980.js`，避免 ES module 请求返回 HTML。
- 对 v3980 入口引用做完整性检查，防止缺文件导致分数区间、搜索结果、报告功能整体失效。
- 保留 v3.9.7.7 家长初选文案、专业代码、精准匹配、飞书诊断增强等能力。
- 不包含 /fenxi，不包含 functions/fenxi，不包含 functions/_middleware.js。

## 发版原则

以后优先按入口和模块清单发版，禁止出现 HTML 已升级但 JS/CSS 叶子文件未随包生成的情况。
