# v3.9.33.15-ln-rank-unified-position-background-engine-local-211-no-fenxi

## 目标

本版修正 v3.9.33.14 的方向性问题：211 背景页不能用空 score index 代替真实功能。

统一原则：主查询、本地属性背景、211 背景都服从同一个“孩子位置口径”。当前无 2026 一分一段时，先按输入分数对照辽宁 2025 物理类历史专业记录；2026 一分一段接入后，应统一切换为“2026 分数 → 2026 位次 → 历史专业记录参考窗口”。

## 已做

1. 新增 `functions/_lib/background-position-engine.js`。
2. `functions/api/local-mainline.js` 与 `functions/api/211-mainline.js` 共用同一套历史专业记录读取、normalize、分数窗口分组、位置上下文。
3. 211 score 不再读取空 `211-score-index.generated.js` 作为主功能。
4. 前台文案从“按分数看”改为“按孩子位置看”。
5. 保持 no-fenxi 打包边界，不包含 `/fenxi/`、`functions/fenxi/`、`functions/_middleware.js`。

## 人类解释

这里不是拿今年分数硬比去年分数。现在先用历史记录做位置附近查看；2026 一分一段表出来后，要先换算孩子位次，再用同一个参考窗口给本地属性和 211 背景做提示。
