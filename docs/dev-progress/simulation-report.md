# 模拟志愿填报单页开发进度

当前主线：`feat/simulation-workspace-v016-human-complete`
PR：#290
基线 main：`6df5410461f314bd22d30b65ec98a2ac34d631b3`
当前产品版本：`simulation-workspace-v016.42`
当前产品修订：`r132-candidate-lifecycle-and-history-hydration`
运行时修订：`v016.39-r129`
阶段：canonical exact-head gate → browser actions → performance → Preview → merge

## v016.42 / r132 本轮修复

- [x] 移除旧 v007 workbench 的周期性/Observer 整卡重绘路径，避免 v017 已生成候选被旧运行时重新 `innerHTML` 销毁。
- [x] 保留当前 v017 学校/专业候选的直接 button click 路径，不再增加第二套全局 click 委托。
- [x] 专业确认后继续以学校名称、专业名称、代码做严格事实核验。
- [x] 历史成绩状态继续落在当前志愿的 `history.years`，供三年历史展示直接消费；缺失历史记录显式标记为 `no-strict-record`。
- [x] stale worker / network 结果不能覆盖更新后的输入。
- [x] 页面 cache-buster、release manifest、canonical contract、browser regression 与 progress revision 提升到 v016.42 / r132。

## v016.41 之前已完成

- [x] 定位并移除 v017 自身 window capture click + `stopImmediatePropagation` 的候选点击阻断。
- [x] 学校候选使用独立 Worker，复用 v150 学校目录 resolver 与 v3969 学校查询引擎。
- [x] 候选保留学校官方名称、省、市、层次、精确/相似匹配信息。
- [x] 学校与专业确认按钮均为真实 button；PC / Pad / Android 目标视口统一进入回归。
- [x] 将“沈阳工业大学”具体学校→专业流程纳入 canonical browser regression。
- [x] 历史 simulation-report v001/v003/v005/v006/v007/v008/v009/v010/v011/v012/v013/v014 workflow 改为手动 workflow_dispatch。
- [x] canonical simulation gate 使用 v017 contract + direct-action browser + performance，不调用过期 browser 脚本。

## CI 收敛原则

当前 simulation workspace 的 PR 验证只以 `.github/workflows/verify-simulation-workspace-v016.yml` 作为功能性 canonical gate；历史 simulation workflow 仅手动取证。其他重型跨站/生产验证不应因为 `simulation-report.html` 的局部修改重复占用 runner；涉及主干发布的完整生产验证放在 main push 阶段完成。

## 当前 canonical gate

`.github/workflows/verify-simulation-workspace-v016.yml` 负责当前 simulation workspace；contract 使用 `tools/verify-simulation-workspace-v017.mjs`，browser 使用 `tools/browser-simulation-workspace-v017-actions.mjs`，随后执行 `tools/browser-simulation-workspace-v016-performance.mjs`。

## Merge Gate

必须以最终实时 HEAD 的 canonical contract PASS、PC/Pad/Android direct-action browser PASS、performance PASS、Cloudflare Preview exact SHA SUCCESS 为准；随后再做必要 PDF/多端核验和最终 HEAD 未移动检查。全部通过才允许 expected-head merge 到 main。合并后重新读取 main SHA，核验 Cloudflare Production/custom domain/API/data-SHA parity。

旧 Preview、旧 SHA、旧 WF 结果不得替代最终 HEAD 证据。
