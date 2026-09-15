# 模拟志愿填报单页开发进度

当前主线：`feat/simulation-workspace-v016-human-complete`
PR：#290
基线 main：`a96a7d15190b1f8737501985a92b4c5ab09e4978`
当前产品版本：`simulation-workspace-v016.40`
当前产品修订：`r130-shenyang-direct-action-gate`
运行时修订：`v016.39-r129`
阶段：canonical exact-head gate → browser actions → Preview → merge

## 本轮架构收敛

- [x] 定位 v016.37 点击无效的真实原因：v017 自身曾注册 window capture click，并在候选按钮事件到达前调用 stopImmediatePropagation。
- [x] 移除候选 click 的全局捕获处理。
- [x] 候选按钮生成后直接绑定自身 click handler；学校和专业各只有一条当前确认路径。
- [x] 候选浏览器回归直接点击“选这所”和“选这个”的文本命中区域，而不只是点击候选容器。
- [x] Android 390 / Pad 768 / Desktop 1280 三个视口统一验证目标，并检查 confirmedSchool、majorCode、majorName 最终落盘。
- [x] 将实际反馈中的“沈阳工业大学”纳入 canonical direct-action 回归：候选显示辽宁省 / 沈阳市 / 本科 / 名称完全一致，并验证“选这所”→“选这个”完整链路。
- [x] 历史 simulation-report v001/v003/v005/v006/v007/v008/v009/v010/v011/v012/v013/v014 自动 WF 从当前路径退出，保留 workflow_dispatch 做历史取证。
- [x] canonical simulation gate 不再对 feature branch push 重复触发，只对 PR 与 main push 运行。
- [x] canonical contract 与 browser test 对齐到当前 v017 direct-action 测试，不再执行过期 v016 browser script。
- [x] v016.40 专门增加“沈阳工业大学”PC direct-action 场景，防止本次真实回归问题再次进入发布。

## 当前唯一自动门禁

`.github/workflows/verify-simulation-workspace-v016.yml` 仅负责当前 simulation workspace；contract 使用 `tools/verify-simulation-workspace-v017.mjs`，browser 使用 `tools/browser-simulation-workspace-v017-actions.mjs`，随后执行 performance 回归。

## Merge Gate

必须以最终实时 HEAD 的 canonical contract PASS、PC/Pad/Android direct-action browser PASS、performance PASS、Cloudflare Preview exact SHA SUCCESS 为准；随后再做必要 PDF/多端核验和最终 HEAD 未移动检查。全部通过才允许 expected-head merge 到 main。合并后重新读取 main SHA，核验 Cloudflare Production/custom domain/API/data-SHA parity。

旧 Preview、旧 SHA、旧 WF 结果均不得替代最终 HEAD 证据。
