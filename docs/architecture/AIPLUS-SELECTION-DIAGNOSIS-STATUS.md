# AIPLuS 自选、排序与诊断 v0.05

## 当前开发 / 发布状态

- 开发分支：`agent/aiplus-selection-diagnosis-v005`
- Draft PR：`#170` — `AIPLuS：打通自选、排序与诊断工作台 v0.05`
- base：开始本线时的 `main` 为 `44a2426ec0244811cf7e41f045a0a624910988d0`；继续工作时必须重新查询最新 `main`，不能假定仍未变化。
- Cloudflare Pages Git integration 能为本分支 exact head 正常构建 immutable Preview。
- 2026-08-17 本线曾遇到 GitHub-hosted Actions 账户付款 / spending-limit 阻塞，job 在 checkout 前未启动；随后 runner 已恢复并重新开始实际执行 Draft gates。这个历史外部阻塞既不能解释成代码失败，也不能作为绕过验证的理由。
- **PR #170 只有在恢复后的完整 Draft gates、exact-head Preview PC/Pad/Android、同 SHA Ready 第二轮全部真实通过后才允许 merge。**
- 闭环固定为：完整 Draft → exact-head Preview PC/Pad/Android → freeze SHA → Ready 同 SHA 第二轮 → `expected_head_sha` merge → main/Production closure。

## 目标

AIPLuS 对话负责发现和解释，家庭工作台负责沉淀家庭条件，**唯一自选 truth** 继续由现有 `ln-rank` Selection Pool 持有。AIPLuS 不建立第二份收藏、自选、排序或志愿状态。

本能力只增加一个浏览器侧工作台，把已经存在的三个 owner 连起来：

1. `ln-rank/js/feature/selection-pool/store.v3967_0.js`：自选持久化、去重、顺序、增删；
2. `ln-rank/js/feature/selection-pool/analysis.v3967_0.js`：冲/稳/保结构、承接缺口、集中度、未知/拒绝项等确定性诊断；
3. `aiplus/history-store.v3992_4.js` + 现有 workspace：孩子分数、家庭明确偏好、当前回答中的真实学校×专业记录。

`aiplus/selection-workbench.v005.js` 是 UI/编排适配层，不拥有招生事实，也不拥有第二套自选数据。

## 加入自选合同

- 只有能绑定到当前 AIPLuS workspace 已保存 `candidates.records` 中的真实 2026 学校×专业记录，才显示“加入自选”。
- 记录必须显式携带 `score2026`；历史查询中的通用 `score` 不得被提升成 2026 自选事实。
- 候选卡必须带分数/位次锚点，并且对学校、专业、分数/位次只能精确匹配到**唯一一条**当前候选记录；错分、错位次、重复歧义记录全部 fail-closed，不使用 first-match fallback。
- 单独学校名或单独专业方向不是正式自选条目；它们仍然是讨论焦点。
- 写入必须调用现有 `addPoolItem()`；去重、上限、ID、归一化继续由 Selection Pool owner 决定。
- AIPLuS 不新增 localStorage key，不复制 Selection Pool。
- 已在自选的项目显示只读“已自选”，删除和移动仍通过现有 pool owner。

## 排序合同

现有 `userOrder` 仍是用户顺序真相。v0.05 只提供**建议讨论顺序**，不会静默改动，也不宣称等于最终正式志愿顺序。

建议始终先保持现有层级：稍高目标 → 主要参考 → 低分侧补充，再在同层内提供四个视角：

- 录取位置：同层按 2026 分数/位次由高到低讨论；
- 就业路径证据：同层把已有专业轨迹、本地强链、专业理解、历史证据更完整的项目提前；**这不是就业率排名**；
- 家庭成本：同层把已知公办/常规成本项提前，把中外、高收费、民办或高成本风险项后置；
- 学校平台：同层按已有 985/211/本地强链等已存标签组织讨论。

被用户锁定的项目保持原位置。只有用户点击“采用这个讨论顺序”并再次确认后，才通过 `savePoolItems()` 写回唯一自选池。

## 诊断范围

v0.05 能提供的确定性诊断包括：

1. **录取结构**：主要参考/低分侧是否缺失，稍高目标是否过多，是否存在无效承接；
2. **顺序诊断**：当前顺序是否出现明显层级倒置；
3. **学校集中度**：是否过度集中在单一学校；
4. **专业集中度**：是否在没有明确家庭偏好时过度集中在一个专业族；
5. **家庭成本**：中外、高收费、民办或高成本风险与家庭成本敏感度是否冲突；
6. **证据完整度**：办学性质、费用、历史对应、位置等是否仍待确认；
7. **就业/升学路径证据覆盖**：已有多少项目具备可继续判断的专业链、本地强链、专业理解或历史证据。

最后一项只检查**证据是否够用**，不是就业率排名，也不允许用模型记忆、网红观点或名人判断替代事实。

## 关于“张雪峰 skill”

当前仓库没有名为“张雪峰”的 skill。v0.05 不创建以个人名字为 owner 的第二套价值体系。

可复用的产品思想被抽象成透明、可审计的家庭决策维度：就业路径、升学周期、地域机会、家庭成本、专业接受度、学校平台和录取现实性。事实继续由现有确定性 admissions owner、AEK/official evidence owner 和 Selection Pool owner 提供。

## 深度诊断

“让家庭顾问继续解释这份自选”按钮先调用现有 `importSelection`，把同一 Selection Pool 以只读 snapshot 导入 workspace，再通过现有 AIPLuS 对话/决策 owner 解释家庭取舍。它不直接修改自选，也不增加新的 agent/task runtime。

## UI / 多端

- PC：自选工作台位于“我的决策”侧栏，可见当前顺序、诊断和排序建议；
- Pad/Android：沿用同一个业务状态，只有响应式布局变化，没有设备专用业务分支；
- 回答中的候选卡只有在能从 workspace 找回真实记录时才增加“加入自选”。无法绑定事实时 fail-closed，不从文案猜一条新志愿。

## 发布门禁

本能力作为 AIPLuS additive capability 发布，但必须继续遵守统一发布闭环：

`latest main → isolated branch → Draft → exact-head Preview → Ready same SHA → expected_head_sha merge → Production`。

正式检查至少覆盖：

- source ownership / no second storage；
- 现有 AIPLuS workspace / parent-decision / AEK 回归；
- PC / Pad / Android 自选、排序、诊断和候选加入；
- 真实 2026 正例可以加入；历史通用分数、分数/位次不匹配、重复歧义记录均不得出现加入入口；
- exact-head Cloudflare Preview；
- main Production exact SHA；
- protected paths 不变。
