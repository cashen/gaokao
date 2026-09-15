# 模拟志愿填报单页开发进度

当前主线：`feat/simulation-workspace-v016-human-complete`
PR：#290
基线 main：`7873c939e3cfebc4bf3e48a230de09dadd930d60`
当前最终候选 HEAD：`410bfc0c14a4baaff9e27b3dc80d9566a0c636ca`
产品版本：`simulation-workspace-v016.9`
产品修订：`r099-final-regression`
阶段：merge-gate / CI runner blocked

## 已完成

- [x] #287 / #288 / #289 / #286 已关闭，不再作为功能主线。
- [x] v015 Human Input 正式接入模拟志愿页面。
- [x] v006 input bridge / v014 输入控制器不再参与主输入链路。
- [x] 学校输入/删除非阻塞；异步解析具备 debounce、AbortController、token。
- [x] 宽泛专业输入有相关反馈但不自动拍板。
- [x] 学校确认后，专业候选严格来自该校实际 `/api/ai/major-history` 记录。
- [x] 专业名称+代码最终确认双键一致。
- [x] 专业代码中间态和连续 Backspace。
- [x] IME / paste / rapid typing / refresh / school-change / network-error / request-budget 回归脚本。
- [x] Legacy 500ms render 已移除；异步 Legacy 更新被 render guard 隔离。
- [x] URL inbound code/name 冲突与 duplicate 防护。
- [x] 当前 PDF 独立层：`报考信息（待核实）`、后续页重复顶部考生信息、当前输出不使用旧家庭判断术语。
- [x] HTML cache-buster、manifest、contract/browser regression 统一到 v016.9/r099。
- [x] v016 workflow 已增加专用 branch push 触发，并覆盖 input / PDF / guard 文件。
- [x] Cloudflare Preview 已证明可对该 branch HEAD 建立 exact deployment；最近同一 HEAD 的 Preview 构建证据正在更新。

## 当前唯一阻塞

GitHub Actions 专用 v016 `contract` run：`34944775988`，job `104301470524`，当前仍为 `queued`，没有 conclusion；browser job 尚未开始。此次不是产品失败，而是 GitHub runner 尚未执行该 job。

Cloudflare Pages 对同一最终 HEAD `410bfc0...` 也正在构建/更新，尚未产生最终 SUCCESS 证据。

本地环境无法访问 GitHub 网络，因此不能用本地 clone 代替 GitHub Actions 运行结果。

## Merge Gate

在 `contract=queued`、Cloudflare 未对同一最终 HEAD 给出 SUCCESS 时禁止 merge。需要的顺序仍是：contract PASS → browser PASS → exact Preview SUCCESS → 必要多端/PDF核验 → exact-head merge → main SHA → Production/custom-domain/API/data-SHA parity。

旧 SHA 的 PASS、Cloudflare 旧部署、queued/pending 均不能替代最终 HEAD 证据。
