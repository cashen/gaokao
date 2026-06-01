# v3.9.5.8-ln-rank-candidate-context-recompute

## 目标

修复自选池中“相对考生分差 / 冲稳保标签 / AI诊断 / 飞书报告”没有随当前考生成绩统一重算的问题。

核心原则：

- 自选池是候选专业容器。
- 当前考生成绩是统一计算口径。
- 所有相对分差、冲稳保、位次功能区、AI解读、飞书报告，都必须由“当前考生成绩 + 自选池原始专业数据”重新计算。
- 不再信任加入自选池时留下的旧 scoreDelta/statusKey/statusLabel。

## 本版关键修复

1. 新增前端 candidate context：`candidate-context.v3958.js`。
2. 新增前端自选池重算层：`recompute-selection-pool.v3958.js`。
3. 自选池列表渲染前先按当前分数重算每条专业：例如考生 550，专业 578，必须显示 `相对考生 +28 分`。
4. “按冲稳保整理”改为按当前分数口径排序，不再使用历史缓存标签。
5. “检查当前排序与AI解读”“发送当前排序到飞书”“发送AI诊断报告到飞书”执行前均使用当前成绩口径的 computedItems。
6. 后端 `advisor-fact-builder.js` 也强制按 candidateScore 重算 scoreDelta，不信任前端或 localStorage 传入的旧 scoreDelta/statusKey。
7. 页面新增“当前计算口径”提示，明确当前成绩、重算数量和诊断是否过期。

## 不动范围

- 不包含 `/fenxi/` 静态目录。
- 不包含 `functions/fenxi/`。
- 不包含 `functions/_middleware.js`。
- 不改 fenxi 登录鉴权链路。

## 验收样例

- 输入考生分数 `550`。
- 自选池第一条为 `大连交通大学 · 机械电子工程 578分`。
- 页面必须显示：`相对考生 +28 分`，不能显示旧缓存 `+18 分`。

## 版本文件

- `ln-rank/selection-pool.html` 引用 v3958。
- `ln-rank/js/selection-pool.v3958.js`
- `ln-rank/js/feature/selection-pool/candidate-context.v3958.js`
- `ln-rank/js/feature/selection-pool/recompute-selection-pool.v3958.js`
- `ln-rank/js/feature/selection-pool/path-analysis-api.v3958.js`
- `ln-rank/css/selection-pool.v3958.css`
- `functions/_lib/advisor-fact-builder.js`
- `functions/api/path-analysis.js`

## 注意

本版不是新增“推荐规则”，而是修正计算一致性。后续所有诊断和报告必须先确认当前成绩上下文。
