# 模拟志愿填报单页开发进度

当前主线：`feat/simulation-workspace-v016-human-complete`
PR：#290
基线 main：`7873c939e3cfebc4bf3e48a230de09dadd930d60`
最终候选 HEAD：`de36f8917507688b5e4c41e5e3faa4232945d664`
产品版本：`simulation-workspace-v016.10`
产品修订：`r100-final-ci-gate`
阶段：merge-gate / GitHub runner queued

## 已完成

- [x] #287 / #288 / #289 / #286 已关闭，旧 v014/v015 PR 不再作为主线。
- [x] `/ln-rank/simulation-report.html` 正式接入 Human Input runtime；v006 input bridge、v014 输入控制器退出主输入链路。
- [x] 学校输入/删除非阻塞；异步解析 debounce + AbortController + token。
- [x] 宽泛专业有相关反馈但不自动替用户拍板；学校确认后候选严格以实际学校记录为边界。
- [x] 最终学校×专业确认同时校验名称与代码。
- [x] 专业代码中间态和连续 Backspace；IME、paste、rapid typing 场景纳入回归。
- [x] 学校/专业变化使旧确认失效；网络故障与数据未命中分离。
- [x] 同校+专业事实缓存和请求预算控制。
- [x] Legacy 500ms render 移除；异步 Legacy 更新不会覆盖可见 Human Input 工作台。
- [x] URL inbound majorCode/majorName 冲突拦截与 duplicate 防重。
- [x] v016 PDF 独立输出层：`报考信息（待核实）`、后续页重复顶部考生信息、当前输出不使用旧家庭判断术语。
- [x] HTML cache-buster、manifest、contract、browser regression 对齐 v016.10/r100。
- [x] v016 专用 workflow 的 branch push 触发和 PDF/guard/progress 路径覆盖已补齐。

## 当前真实门禁

GitHub Actions 已成功创建 v016 `contract` check run，但当前状态仍为 `queued`；browser job 等待 contract 完成。Cloudflare Pages 对当前 HEAD 也已创建对应 deployment，目前仍在 `in_progress`。

本地环境不能访问 GitHub 网络，因此不能用本地 clone 冒充 GitHub Actions 结果。

## Merge Gate

必须取得当前最终 HEAD 的：contract PASS → browser PASS → Cloudflare Preview SUCCESS → 必要多端/PDF核验 → exact-head merge → main SHA → Production/custom-domain/API/data-SHA parity。

queued/pending/unknown 不视为通过。旧 HEAD 的测试或 Preview 不可替代最终 HEAD。

## 分支清理

旧 PR 已关闭。当前工具没有 branch-delete ref 操作，因此不能声称旧 branch refs 已删除；合并后仍需明确记录这一点。
