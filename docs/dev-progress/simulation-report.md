# 模拟志愿填报单页开发进度

当前主线：`feat/simulation-workspace-v016-human-complete`
PR：#290
基线 main：`a96a7d15190b1f8737501985a92b4c5ab09e4978`
当前产品版本：`simulation-workspace-v016.33`
当前产品修订：`r123-real-backspace-gate`
阶段：contract fix → exact-head browser/performance verification

## 本轮已完成

- [x] 活跃 HTML 输入运行时继续使用 `simulation-report-v017-responsive-input.js`；v015 仅保留兼容文件，不由页面主路径加载。
- [x] 学校搜索 resolver 在 Web Worker 中预热，避免首个学校输入触发主线程重型目录初始化。
- [x] 学校候选搜索与严格学校确认分离；候选先出，确认后建立 `confirmedSchool`。
- [x] `confirmedSchool` 持久化并作为专业事实核验的行级依赖，避免重复解析学校实体。
- [x] 专业目录候选本地立即反馈；事实核验采用单次有界多 `major` 查询和内存过滤，移除串行补查。
- [x] 新专业输入会立即取消旧事实请求，减少快速输入时的网络竞争。
- [x] 学校切换会清理旧上下文和旧事实，避免旧学校结果回流。
- [x] 390px Android、768px Pad、1280px Desktop 核心输入回归已包含。
- [x] contract 中的 Backspace 门禁改为要求浏览器回归真实执行 Backspace，而不是仅检查 marker。
- [x] v016.33/r123 版本、manifest、active runtime cache-buster、contract assertions 已同步。

## 已定位的问题

1. v016.32 exact HEAD 的 contract 实际失败原因是 `browser regression missing Backspace`；GitHub Actions 日志已确认失败发生在 `tools/verify-simulation-workspace-v016.mjs` 的浏览器门禁 marker 检查，而非输入 runtime 执行超时。
2. bounded-fanout workflow `verify-major-bands-bounded-fanout-v3972_5.yml` 在同一 SHA 上仍出现 `failure` 且 `jobs=[]`；该 workflow 与 simulation v016 专用门禁分开记录，不作为本任务功能通过依据。
3. progress 文件此前滞后于 manifest/runtime（v016.30/r120 vs v016.32/r122），本修订已同步到 v016.33/r123。

## 当前 exact-head 门禁

- [ ] v016.33 exact HEAD contract PASS
- [ ] v016.33 exact HEAD browser PASS（Android 390 / Pad 768 / Desktop 1280）
- [ ] v016.33 exact HEAD performance PASS
- [ ] Cloudflare Preview 与 exact HEAD SHA 一致并 SUCCESS
- [ ] 多端/PDF必要核验
- [ ] 再次确认 PR head 未移动

## Merge Gate

必须满足以上全部 exact-head 门禁后，才允许以当前实时 PR HEAD 作为 `expected_head_sha` 执行 merge。合并后重新读取 main SHA，并核验 Cloudflare Production、custom domain、`/api/ai/*` 与相关数据版本/SHA parity。

禁止使用旧 HEAD 的 CI、Preview、部署或聊天记录作为最终通过依据。
