# v3.9.72.0 Cloudflare Worker Error 1102 事故记录

## 时间线

- 2026-07-31 17:32（Asia/Singapore）：PR #94 合并，发布 v3.9.72.0。
- 合并前 CI、静态索引审计和 PC/Pad/Android 浏览器旅程全部通过。
- 合并后严格生产验收确认 211 页面与 `all-211-static-v3972_0` 已上线。
- 同一验收连续请求 `major-bands`、学校查询和健康探针时，Pages 默认域名间歇性返回 HTTP 503，Cloudflare 错误码 1102（Worker exceeded resource limits）。
- `main` 随即回滚到生产验收通过的 v3.9.71.2；事故版本保留在 `incident/v3972-worker-1102-20260731`。
- 回滚后运行时健康、major-bands 健康、579 分查询、650 分＋东北大学查询和 LocalStrength 静态索引重新通过。

## 根因

211 页面本身已经使用构建期静态索引，不调用动态背景 API。事故来自 Functions 依赖边界：

- `functions/_lib/academic-background-provider.js` 静态导入 `functions/_lib/211-mainline-kb.js`；
- v3.9.72.0 的 `211-mainline-kb.js` 又静态导入完整学校资料和双一流学科资源；
- Cloudflare Pages Functions 使用共享 Worker 打包，这些 211 构建资源因此进入核心查询 Worker；
- 生产冷启动和连续无缓存请求下，原有分数、学校查询与健康探针出现 CPU 或内存超限。

## v3.9.72.1 修复

- 完整 211 专业—学科匹配迁移到 `tools/lib/211-static-evidence.v3972.mjs`，仅在构建阶段执行。
- `functions/_lib/211-mainline-kb.js` 改为无重资源导入的静态迁移兼容适配层。
- `/api/academic-background?scope=211` 与 `/api/211-mainline` 不再读取或扫描投档数据；返回静态页面和索引位置，`scannedCount` 与 `matchedCount` 均为 0。
- 211 页面继续只读取不可变静态索引，浏览器本地完成模式切换、筛选、排序、分页和状态恢复。
- LocalStrength 不再隐式消费 211 背景证据，保持省内资源所有权与不可变索引语义。
- 生产验收增加旧 211 API 零扫描断言和连续核心查询资源验证。

## 保护边界

- 未修改 `/fenxi/`、`functions/fenxi/`、`functions/_middleware.js`。
- 未引入 `/api/local-strength`。
- `functions/_lib/release-contract.js` 双导出保持不变。
- 主资产代际保持 `v3970_0`；211 静态资产代际保持 `v3972_0`。
