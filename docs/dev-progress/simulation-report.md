# 模拟志愿填报单页开发进度

当前主线：`feat/simulation-workspace-v016-human-complete`
PR：#290
基线 main：`7873c939e3cfebc4bf3e48a230de09dadd930d60`
当前候选 HEAD：`d92c1df301c1163732ef8b828ddd69a2437b8926`
产品版本：`simulation-workspace-v016.10`
产品修订：`r100-final-ci-gate`
阶段：merge-gate / runner blocked

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
- [x] HTML cache-buster、manifest、contract/browser regression 已统一到 v016.10/r100。
- [x] v016 workflow 增加专用 branch push 触发，并覆盖 input / PDF / guard 文件。

## 当前门禁

- [x] GitHub Actions 已能够创建 v016 `contract` check run，证明触发层已恢复。
- [ ] v016 contract 实际 PASS：当前 run `34945054467` / job `104302372926` 仍为 `queued`。
- [ ] browser regression：依赖 contract，尚未开始。
- [ ] Cloudflare Preview exact HEAD：当前 HEAD 已产生对应 Preview deployment，但最近一次查询仍显示 build in progress，不能标为 SUCCESS。
- [ ] Windows Chrome / Android Chrome / Android Alook / Pad 实机验证。
- [ ] PDF 多页/第二页头信息/待核实字段最终实测。
- [ ] Production/custom-domain/API/data-SHA parity。
- [ ] exact-head merge 到 main。

## Merge Gate

queued/pending/unknown 均不得视为 passed。必须以当前最终 HEAD 的 contract PASS → browser PASS → exact Preview SUCCESS → 多端/PDF核验 → merge → main SHA → Production parity 为顺序闭环。
