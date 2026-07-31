# v3.9.71.2 生产验收记录

## 发布信息

- 应用发布 PR：#91
- 应用发布提交：`770936b68fb138656cbe2607c6edd2dc03506376`
- 发布版本：`v3.9.71.2`
- 静态索引版本：`local-strength-static-v3971_2`
- 生产健康工作流：`Verify production API health v3971.2`
- 验收运行：`30606912966`
- 验收结论：`success`
- 验收时间：2026-07-31

## 生产验收结果

- Pages 运行时健康接口：HTTP 200
- `major-bands` 健康探针：HTTP 200
- 579 分查询：返回 48 条当前分页记录
- 650 分并限定东北大学查询：返回 13 条当前分页记录
- LocalStrength 页面发布号：`v3.9.71.2`
- 辽宁省内投档院校：62 所
- 省内投档专业全量解析：1,992 条
- 通过背景证据门禁并公开展示：243 条
- 自定义域名当次验证触发 Cloudflare Managed Challenge；Pages 默认域名已完成严格 JSON HTTP 200 验证

## 架构边界

- LocalStrength 生产页面不引用 `/api/local-strength`。
- 全量扫描在构建阶段完成，生产查询、筛选和分页只读取不可变静态索引。
- 未修改 `/fenxi/`、`functions/fenxi/` 或 `functions/_middleware.js`。
- 原有分数查询、学校查询及 v3970_0 主运行时保持不变。

## PR #93 清理说明

PR #93 最初仅用于触发一次性生产验收。合并前已将分支重置到稳定 `main`，清除所有临时关闭或缩减正式工作流的改动；本文件是该 PR 唯一需要合并的变更。
