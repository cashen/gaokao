# 模拟志愿填报单页开发进度

当前主线：`feat/simulation-workspace-v016-human-complete`
PR：#290
基线 main：`7873c939e3cfebc4bf3e48a230de09dadd930d60`
当前最终 HEAD：以 GitHub PR #290 实时 HEAD 为准
产品版本：`simulation-workspace-v016.9`
产品修订：`r099-final-regression`
阶段：merge-gate / CI runner blocked

## 已完成

- [x] #287 / #288 / #289 / #286 已关闭，不再作为功能主线。
- [x] Human Input 正式接入 `/ln-rank/simulation-report.html`。
- [x] v006 input bridge / v014 输入控制器不再参与主输入链路。
- [x] 学校输入/删除非阻塞；异步解析 debounce + AbortController + token。
- [x] 宽泛专业输入有相关反馈但不自动拍板；学校确认后候选严格来自学校实际 `/api/ai/major-history` 记录。
- [x] 专业名称+代码最终确认双键一致。
- [x] 专业代码中间态和连续 Backspace。
- [x] IME / paste / rapid typing / refresh / school-change / network-error / request-budget 回归脚本。
- [x] Legacy 500ms render 已移除；异步 Legacy 更新被 render guard 隔离。
- [x] URL inbound code/name 冲突拦截与 duplicate 防重。
- [x] 当前 PDF 独立层：`报考信息（待核实）`、后续页重复顶部考生信息、当前输出不使用旧家庭判断术语。
- [x] HTML cache-buster、manifest、contract/browser regression 统一到 v016.9/r099。
- [x] v016 workflow 增加专用 branch push 触发，并覆盖 input / PDF / guard 文件。

## 当前门禁

最终功能 HEAD 在当前 PR #290 上；GitHub Actions 已成功产生专用 v016 `contract` job，但 runner 当前仍为 `queued`，因此 contract/browser 尚无 conclusion。Cloudflare Preview 对同一分支 HEAD 可建立 deployment，但每次 HEAD 改动后必须重新确认 exact SHA 的 Preview success。

## Merge Gate

只有最终 HEAD 的 contract PASS → browser PASS → exact Preview SUCCESS → 必要多端/PDF核验 → exact-head merge → main SHA → Production/custom-domain/API/data-SHA parity 全部成立后，才允许 merge。

旧 SHA 的通过证据、queued/pending、旧 Preview 均不能替代最终 HEAD。

## 分支清理

旧 PR 已关闭；当前工具没有 branch-delete ref 能力，因此不能伪称已删除 branch。合并后会保留这一限制并如实记录。
