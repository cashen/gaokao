# 模拟志愿填报单页开发进度

当前主线：`feat/simulation-workspace-v016-human-complete`
PR：#290
基线 main：`a96a7d15190b1f8737501985a92b4c5ab09e4978`
当前产品版本：`simulation-workspace-v016.38`
当前产品修订：`r128-single-action-runtime`
阶段：canonical exact-head gate → browser actions → Preview → merge

## 当前原则

本页只允许一套“学校候选 → 明确确认 → 专业候选 → 明确确认”的当前运行时；历史版本代码只作为兼容资产，不再拥有当前候选点击事件。

## v016.38 本轮架构修正

- 定位到 v016.37 点击无效的真实根因：v017 自身仍注册 `window` capture click，并在按钮事件到达前调用 `stopImmediatePropagation()`。
- 移除候选 click 的全局捕获事件。
- 候选 DOM 生成后立即给候选按钮自身绑定 click handler；“选这所”和“选这个”各只有一条当前确认路径。
- 新增真实浏览器回归，直接点击按钮内部的“选这所”与“选这个”文本命中区域，而不是只点击整个候选容器。
- PC 1280 / Pad 768 / Android 390 三个视口统一验证，并检查 `confirmedSchool`、`majorCode`、`majorName` 实际落盘。
- 页面资源统一升级为 `v016.38-r128`。

## Workflow 收敛

仓库里历史 simulation-report v001/v003/v005/v006/v007/v008/v009/v010/v011/v012/v013/v014 自动 WF 已改为 `workflow_dispatch` 手动模式；当前 PR 只由 `.github/workflows/verify-simulation-workspace-v016.yml` 作为 simulation workspace canonical gate。

canonical gate 不再对 feature branch 的 `push` 重复触发，只处理 PR 与 main push，从源头减少同一提交重复排队。

## Merge Gate

必须以最终实时 HEAD 的 canonical contract PASS、PC/Pad/Android direct-action browser PASS、performance PASS、Cloudflare Preview 精确对应最终 HEAD 且 SUCCESS 为准；随后进行必要 PDF/多端核验，再次确认 PR HEAD 未移动。全部通过才允许 expected-head merge 到 `main`。

合并后重新读取 main SHA，并核验 Cloudflare Production、custom domain、`/api/ai/*` 与相关数据 SHA parity。旧 Preview、旧 SHA、旧 WF 结果均不得替代最终 HEAD 证据。
