# v3.9.8.3-ln-rank-formal-diagnosis-copy-cleanup

基于 `v3.9.8.2-ln-rank-asset-integrity-and-report-stability-baseline` 做正式页面与报告口径收口，不改 `/fenxi` 静态目录，不包含 `functions/fenxi` 与 `functions/_middleware.js`。

## 本版目标

- 搜索页与自选专业页统一升级到 `v3983` 入口资源。
- 正式自选专业页的“方案解读”不再展示 `workers-ai`、`model`、`规则兜底` 等工程痕迹。
- “方案解读”按 5 段输出：一句话结论、当前分数和位次定位、自选专业结构、主要风险、下一步调整建议。
- 飞书报告失败时，家长可见提示统一为“报告暂时生成失败。可以先复制文字版报告，稍后再试。”，技术详情折叠展示。
- 报告标题与副标题统一为“辽宁物理类专业初选参考报告”及 2025 数据口径说明。
- 自选专业报告条目字段收口为：顺序、学校、专业、专业代码、2025最低分、2025最低位次、相对孩子、匹配关系、需要复核。

## 发版检查

- `node tools/check-ln-rank-release-v3983.mjs` 通过。
- 入口 HTML 引用的 CSS / JS 均存在。
- `app.v3983.js` 与 `selection-pool.v3983.js` import 递归检查通过。
- 目标改动文件 Node syntax check 通过。
- 报告构建 smoke test 通过，未泄露 `workers-ai / model / debug / source / raw / payload` 等技术词到报告正文。
- 包内不包含 `/fenxi/`、`functions/fenxi/`、`functions/_middleware.js`。

## 部署提醒

如线上仍出现 JS/CSS MIME type 为 `text/html`，不是业务逻辑问题，而是 Cloudflare Pages 上 `ln-rank/` 静态目录没有完整覆盖，或 HTML 已更新但对应 `v3983` 资源未上传。需要完整覆盖 `ln-rank/` 静态目录和允许维护的 `functions/` 目录。
