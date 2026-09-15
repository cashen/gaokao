# 模拟志愿填报单页开发进度

当前主线：`feat/simulation-workspace-v016-human-complete`
PR：#290
基线 main：`a96a7d15190b1f8737501985a92b4c5ab09e4978`
当前产品版本：`simulation-workspace-v016.38`
当前产品修订：`r128-single-action-runtime`
阶段：canonical exact-head gate → browser actions → Preview → merge

## 本轮架构收敛

- [x] 定位 v016.37 点击无效的真实原因：v017 自身仍注册 window capture click，并在事件到达候选按钮前调用 stopImmediatePropagation。
- [x] 移除候选 click 的全局捕获处理。
- [x] 候选按钮生成后立即绑定自身 click handler；学校和专业各只有一条当前确认路径。
- [x] 浏览器回归改为真实点击“选这所”和“选这个”文本命中区域，而不只是点击整个候选元素。
- [x] PC / Pad / Android 统一验证，并检查 localStorage 中 confirmedSchool、majorCode、majorName 最终状态。
- [x] 历史 simulation-report v006/v008/v009/v010/v011/v012/v013/v014 自动 WF 从当前路径退出，保留 workflow_dispatch 做历史取证。
- [x] canonical simulation gate 不再对 feature branch 的 push 重复触发，只对 PR 与 main push 运行。
- [x] 下一次发布继续遵守每次修订必须升级版本/修订号。

## 当前唯一自动门禁

`.github/workflows/verify-simulation-workspace-v016.yml` 仅负责当前 simulation workspace；其 contract 使用 `tools/verify-simulation-workspace-v017.mjs`，browser 使用 `tools/browser-simulation-workspace-v017-actions.mjs`。

## Merge Gate

必须以最终实时 HEAD 的 canonical contract PASS、PC/Pad/Android direct-action browser PASS、performance PASS、Cloudflare Preview exact SHA SUCCESS 为准；随后再做必要 PDF/多端核验和最终 HEAD 未移动检查。全部通过才允许 expected-head merge 到 main。合并后重新读取 main SHA，核验 Cloudflare Production/custom domain/API/data-SHA parity。

旧 Preview、旧 SHA、旧 WF 结果均不得替代最终 HEAD 证据。
