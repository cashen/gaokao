# 模拟志愿填报单页开发进度

当前主线：`feat/simulation-workspace-v016-human-complete`
PR：#290
基线 main：`a96a7d15190b1f8737501985a92b4c5ab09e4978`
当前产品版本：`simulation-workspace-v016.35`
当前产品修订：`r125-cached-facts-exact-head`
阶段：exact-head CI verification → browser/performance → Preview

## 本轮完成

- [x] v016.32 contract 失败根因定位为真实 `Backspace` 回归缺失；不是 timeout。
- [x] Playwright 现在真实执行 Backspace，并立即校验 active major input 的值同步变化。
- [x] 专用 simulation workflow 改为对 `pull_request.head.sha` 显式 checkout，避免 PR job 使用 merge ref 偏离 exact HEAD。
- [x] 发现并修复版本/cache-buster 不一致：HTML 与 responsive runtime 的 active worker cache key 同步。
- [x] 专业宽泛输入后的具体专业选择复用已有学校事实缓存，避免“机械 → 机械工程”再次发送重复网络请求。
- [x] browser regression 增加“已被此前学校事实查询覆盖的具体专业不得产生第二次请求”真实请求计数门禁。
- [x] v016.35/r125 manifest、HTML cache-buster、contract、browser regression、progress 已同步。

## 已确认的输入架构

- [x] 学校输入不等待 resolver/network；候选搜索走 Worker `search()`。
- [x] 用户选择候选后才执行严格 `resolve()` 并建立 `confirmedSchool`。
- [x] 专业输入先走本地目录；学校事实核验使用 `/api/ai/major-history` 多 `major` 单次查询并内存过滤。
- [x] 快速专业输入取消旧请求；学校切换取消旧事实并清除旧 `confirmedSchool`/context。
- [x] 已缓存且被前一轮有界事实查询覆盖的具体专业，点击确认时直接复用缓存。
- [x] IME、Paste、Backspace、删除、refresh、duplicate、URL inbound 已纳入回归范围。

## 当前 exact-head 门禁

- [ ] v016.35 exact HEAD contract PASS
- [ ] v016.35 exact HEAD browser PASS（390 / 768 / 1280）
- [ ] v016.35 exact HEAD performance PASS
- [ ] Cloudflare Preview 与 exact HEAD SHA 一致并 SUCCESS
- [ ] 多端/PDF必要核验
- [ ] 再次确认 PR head 未移动

## 独立 workflow

`verify-major-bands-bounded-fanout-v3972_5.yml` 在旧 exact SHA 上曾出现 `failure` 且 `jobs=[]`。它不是 simulation v016 专用功能门禁；后续仍需独立记录，不得用其状态替代本任务 contract/browser/performance 结果。

## Merge Gate

必须满足全部 exact-head 门禁后，才允许以最终实时 PR HEAD 作为 `expected_head_sha` merge。合并后重新读取 main SHA，并核验 Cloudflare Production、custom domain、`/api/ai/*` 与相关数据版本/SHA parity。

禁止使用旧 HEAD 的 CI、Preview、部署或聊天记录作为最终通过依据。
