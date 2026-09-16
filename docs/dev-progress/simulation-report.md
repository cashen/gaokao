# 模拟志愿填报单页开发进度

当前主线：`main`
PR：#290（已合并）
最终 merge SHA：`191fd1d17ffa47d7d7ceb4aa061f265fea1a31de`
基线 main：`5ee9c9c30acc4eb686c6a0e25c4ff6312d2112f6`
当前产品版本：`simulation-workspace-v016.49`
当前产品修订：`r139-resolver-recovery`
运行时修订：`v016.46-r136`
阶段：merged → post-merge production verification complete

## v016.49 / r139 本轮修订：Worker 异常恢复

- [x] Worker 学校招生目录预热失败时清空 rejected Promise 缓存，后续输入可以重新加载。
- [x] Worker 学校目录 resolver 加载失败时清空 rejected Promise 缓存，避免瞬态失败永久阻断后续搜索/确认。
- [x] 保留 100ms debounce、sequence supersession 与 stale-response guard。
- [x] 发布版本递增到 `simulation-workspace-v016.49 / r139-resolver-recovery`。
- [x] durable checkpoint 已写入并在 merge 后完成状态闭环。

## v016.47-v016.48 / r137-r138

- [x] common admission directory 在 Worker 启动时预热，避免第一次输入学校时才启动目录加载链路。
- [x] 常见学校名称优先走轻量 admission directory；复杂/别名查询再回退较重的 v150 catalog resolver。
- [x] 精确学校确认优先使用已预热目录。
- [x] v016.48/r138 刷新最终 HEAD Preview attestation。

## v016.46 / r136 学校搜索生命周期优化

- [x] 学校候选搜索在 Worker 内增加 100ms debounce。
- [x] 同一志愿的旧 search sequence 在 Worker 内立即失效。
- [x] 清空学校输入立即取消等待中的 Worker search。
- [x] performance gate 覆盖 rapid school typing → candidate visible → clear。
- [x] performance gate 检查学校招生目录请求不得随每个字符重复加载。

## v016.45 / r135 紧凑 A4 PDF

- [x] PDF 先测量 A4 可用空间再分页，不再按固定像素切长画布。
- [x] 志愿改为连续工作表行，减少重复标题、边框和空白。
- [x] 两条短志愿空间足够时共用一页。
- [x] 续页重复学生姓名、总分、参考位次和考试类型。
- [x] 历史数据只作参考，不输出“有历史记录需要核对”或“· 需核验”。

## v016.44 / r134 历史仅作参考

- [x] 保留学校→专业明确候选确认和学校/专业事实核验。
- [x] 真实三年历史写回 `history.years`。
- [x] 历史缺失年份写 `no-strict-record`，不编造数据。
- [x] 历史数据不进入 needs-check 状态。

## v016.43 / r133 之前已完成

- [x] 专业确认基于 `/api/ai/major-history` 的学校实际专业记录生成历史。
- [x] 移除旧 v007 周期性/Observer 重绘对 v017 候选按钮的破坏。
- [x] 学校/专业候选使用直接 button click 与 stale worker 防护。
- [x] historical simulation-report workflows 改为手动 workflow_dispatch；canonical gate 集中到 v016。

## 合并前最终验证

- [x] PR #290 最终 HEAD：`4f683f576fb8efc41d10f4a83d9797d55016ca49`。
- [x] Cloudflare PR Preview 与最终 HEAD 精确对应且部署成功。
- [x] merge 前 canonical contract、browser actions、performance gate 均完成通过。
- [x] expected-head merge 到 main。

## 合并后最终验证

- [x] main 已指向 merge SHA `191fd1d17ffa47d7d7ceb4aa061f265fea1a31de`。
- [x] post-merge simulation workspace canonical contract PASS。
- [x] post-merge browser regression PASS（Desktop 1280 / Pad 768 / Android 390）。
- [x] post-merge performance PASS。
- [x] Cloudflare main deployment exact SHA verification PASS。
- [x] production resource graph / API baseline verification PASS。
- [x] architecture handoff ownership audit PASS。

## 特殊 CI 现象

`verify-major-bands-bounded-fanout-v3972_5.yml` 曾出现 `event=push`、`failure` 且 `jobs=0` 的运行记录；当前该 workflow 文件的事件定义为 PR/manual，未包含 push，因此作为独立 CI 触发层异常跟踪，不与 simulation runtime 混淆。

## 最终状态

PR #290 已完成合并，simulation-workspace-v016.49 / r139-resolver-recovery 已进入 `main`。当前验证链路已覆盖代码、浏览器、多端、性能、Cloudflare 部署、生产资源图、API 基线与架构 ownership。后续如继续开发，应从新的版本/修订号开始，不修改既有 r139 历史记录。
