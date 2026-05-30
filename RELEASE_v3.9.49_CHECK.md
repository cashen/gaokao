# RELEASE v3.9.49 CHECK

## 文件引用

- [x] `ln-rank/index.html` 已引用 `app.v3949.js` 与 `selection-pool.v3949.css`。
- [x] `ln-rank/selection-pool.html` 已引用 `selection-pool.v3949.js` 与 `selection-pool.v3949.css`。
- [x] 自选池 store 使用 `lnRank.selectionPool.physics2025.v3949`，并迁移 v3948 旧数据。
- [x] 考生分数使用 `lnRank.selectionPool.candidateScore.v3949`，并迁移 v3948 旧数据。
- [x] 整理页不再显示 `pathCandidateRank` / “考生位次（可选）”。

## API 检查

- [x] `/api/major-bands` 入口未破坏，仅修正缺失位次排序。
- [x] `/api/path-analysis` 业务口径未破坏。
- [x] `/api/feishu-create-selection-pool-report` 仍走原入口。
- [x] 飞书写入顺序仍为 styled blocks → Markdown convert → fallback blocks。

## 位次口径检查

- [x] 460 分：同分人数 542，上一档累计 76,197，位次区间 76,198–76,739。
- [x] 461 分：同分人数 511，累计 76,197。
- [x] 飞书标题不再出现 `参考约 76,197 位`。
- [x] 位次跨度计算采用同分末位累计口径。
- [x] 不再使用自选池中最接近专业反推考生位次。
- [x] 非正位次按缺失处理，避免“最低位次 0”。

## 测试

- [x] `node tests/selection-pool-summary.test.mjs` 通过。
- [x] 关键 JS 语法检查通过。
- [x] 飞书报告 builder 本地 smoke test 通过。
