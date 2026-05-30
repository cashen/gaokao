# v3.9.48 发布检查

## 文件检查

- [x] `ln-rank/index.html` 已引用 `app.v3948.js` 与 `selection-pool.v3948.css`。
- [x] `ln-rank/selection-pool.html` 已引用 `selection-pool.v3948.js` 与 `selection-pool.v3948.css`。
- [x] 自选池 store 使用 `lnRank.selectionPool.physics2025.v3948`，并迁移 v3947 旧数据。
- [x] 考生分数使用 `lnRank.selectionPool.candidateScore.v3948`，并迁移 v3947 旧数据。
- [x] 考生位次使用 `lnRank.selectionPool.candidateRank.v3948`，可选填写。

## API 检查

- [x] 未改动 `/api/major-bands`。
- [x] 未改动 `/api/path-analysis` 的业务口径。
- [x] `/api/feishu-create-selection-pool-report` 仍走原入口。
- [x] 飞书写入顺序仍为 styled blocks → Markdown convert → fallback blocks。

## 口径检查

- [x] 飞书概要只统计自选池已有冲稳保标签，不重新判定。
- [x] 位次字段由 `selection-pool-rank-utils.js` 统一读取。
- [x] 位次概要由 `selection-pool-summary.js` 统一计算。
- [x] 位次缺失时不输出虚假跨度。
