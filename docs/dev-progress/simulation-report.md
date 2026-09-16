# 模拟志愿填报单页开发进度

当前主线：`feat/simulation-workspace-v016-human-complete`
PR：#290
当前 HEAD：`67b25632400002832ca5c9014873ad46ce37ed07`
当前 main：`5ee9c9c30acc4eb686c6a0e25c4ff6312d2112f6`
基线 main：`6df5410461f314bd22d30b65ec98a2ac34d631b3`
当前产品版本：`simulation-workspace-v016.49`
当前产品修订：`r139-resolver-recovery`
运行时修订：`v016.46-r136`
阶段：canonical exact-head gate → browser actions → performance → Preview → merge

## v016.49 / r139 本轮修订：Worker 异常恢复

- [x] Worker 学校招生目录预热失败时清空 rejected Promise 缓存，后续输入可以重新加载。
- [x] Worker 学校目录 resolver 加载失败时清空 rejected Promise 缓存，避免瞬态失败永久阻断后续搜索/确认。
- [x] 保留 100ms debounce、sequence supersession 与 stale-response guard。
- [x] 发布版本递增到 `simulation-workspace-v016.49 / r139-resolver-recovery`。
- [x] durable checkpoint 写入 `.codex/progress/simulation-workspace-v016.49-r139.json`。

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

## 当前 canonical gate

`.github/workflows/verify-simulation-workspace-v016.yml` 负责当前 simulation workspace；contract 使用 `tools/verify-simulation-workspace-v017.mjs`，browser 使用 `tools/browser-simulation-workspace-v017-actions.mjs`，随后执行 `tools/browser-simulation-workspace-v016-performance.mjs`。

当前最新 HEAD `67b2563` 已重新触发完整 PR checks。旧 HEAD `a51d564` 的 canonical contract/browser/performance 已全部 PASS，Cloudflare Preview 也成功；新 HEAD 必须重新获得自己的完整证据。

## 当前 gate 状态

- [x] PR #290 非 Draft，GitHub 当前报告 mergeable=true。
- [x] 最新 HEAD 已触发 simulation canonical gate。
- [ ] 最新 HEAD contract PASS。
- [ ] 最新 HEAD browser PASS（PC 1280 / Pad 768 / Android 390）。
- [ ] 最新 HEAD performance PASS。
- [ ] 最新 HEAD Cloudflare Preview 精确 SHA SUCCESS。
- [ ] 最新 HEAD PDF/多端最终核验。
- [ ] 最终 HEAD 未移动检查。
- [ ] expected-head merge 到 main。
- [ ] merge 后 main/Cloudflare/custom-domain/API/data-SHA parity。

## 特殊 CI 现象

`verify-major-bands-bounded-fanout-v3972_5.yml` 在最新 HEAD 上出现一次 `event=push`、`failure` 且 `jobs=0` 的运行记录。当前该 workflow YAML 的事件定义为 PR/manual，未包含 push；因此暂按 CI 触发层异常单独跟踪，不把它误判为 simulation runtime 失败，也不通过修改业务代码绕过。

## Merge Gate

必须以最终实时 HEAD 的 canonical contract PASS、PC/Pad/Android direct-action browser PASS、performance PASS、Cloudflare Preview exact SHA SUCCESS 为准；随后再做必要 PDF/多端核验和最终 HEAD 未移动检查。全部通过才允许 expected-head merge 到 main。合并后重新读取 main SHA，核验 Cloudflare Production/custom domain/API/data-SHA parity。

旧 Preview、旧 SHA、旧 WF 结果不得替代最终 HEAD 证据。
