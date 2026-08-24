# AIPLuS 自选、排序与诊断 v0.05
## Current main snapshot (2026-08-24 audit)

- Latest canonical `main`: `ffc080979341f7a4dfb593986bc791aef3bfb076`.
- Audit baseline had no open PR; the five existing Production status checks on that SHA were green.
- Whole-site public release identity is `v3.9.90.2 / v3990_2 / 3990_2`; capability-local identities below remain subordinate and are not separate site releases.
- The historical PR/SHA entries in this file remain evidence only. Any new change starts from the latest `main` and follows the unified Draft → exact Preview → Ready same-SHA → merge → Production protocol.


## 当前开发 / 发布状态

- v0.05 已通过 PR `#170` 发布到 `main`，不再处于 Draft 开发态。
- PR #170 frozen head：`f899e16cc6037261ead4ed61d9ddc766f1f8c45d`。
- PR #170 merge / main commit：`6c9c4d6df9109a8b713a519839f6bd23a33c5482`。
- PR #170 exact immutable Cloudflare Preview：`https://772011c3.gaokao-4y9.pages.dev`。
- Draft 与 Ready 均在同一个 frozen head 上完成 14/14 workflows success；merge 后 main / Cloudflare Production / PC / Pad / Android browser closure 已完成。
- 2026-08-17 Production Selection Workbench browser 第一次在部署刚切换后的挂载等待阶段出现 30 秒 timeout；同一个 main SHA、没有代码变化的原生 rerun 随后成功。这个证据不能证明产品 runtime 有可重复 bug，但暴露了 production readiness gate 只证明 HTML/API identity、没有同时证明当前 Selection Workbench JS/CSS 资产已经在 Pages 域稳定可读的窄竞态。
- 2026-08-18 PR `#171` 已把该风险收口到**现有 release verification owner**：浏览器 Production gate 启动前必须同时证明页面 + API + 当前 Selection Workbench JS/CSS 资产一致；merge commit 为 `e0c4bc2de36659df40187a210526d226ed331b12`。该维护没有新增产品 retry、bootstrap owner、缓存 owner、Selection Pool owner，也没有改变 AIPLuS 产品/runtime release identity。
- Selection Workbench Production verification 还必须把同一 source + browser 结果发布为 durable commit status：`production/aiplus-selection-workbench-v0.05`。这个 status 只是现有 verifier 的可观测输出，不重跑、不复制验证逻辑；只有 source-contract 与 browser-production 同时 success 才能发布 success。
- 后续继续工作必须重新查询最新 `main` / open PR / checks；本文件中的 SHA 只用于说明这条能力的历史发布证据，不是未来会话的实时 source of truth。

## 目标

AIPLuS 对话负责发现和解释，家庭工作台负责沉淀家庭条件，**唯一自选 truth** 继续由现有 `ln-rank` Selection Pool 持有。AIPLuS 不建立第二份收藏、自选、排序或志愿状态。

本能力只增加一个浏览器侧工作台，把已经存在的三个 owner 连起来：

1. `ln-rank/js/feature/selection-pool/store.v3967_0.js`：自选持久化、去重、顺序、增删；
2. `ln-rank/js/feature/selection-pool/analysis.v3967_0.js`：冲/稳/保结构、承接缺口、集中度、未知/拒绝项等确定性诊断；
3. `aiplus/history-store.v3992_4.js` + 现有 workspace：孩子分数、家庭明确偏好、当前回答中的真实学校×专业记录。

`aiplus/selection-workbench.v005.js` 是 UI/编排适配层，不拥有招生事实，也不拥有第二套自选数据。

## Workspace 读写合同

Selection Workbench 可以读取现有家庭 workspace，但**读操作不得变成 stale writer**。

- `loadCurrentWorkspace()` 只能读取 canonical `current`；不得把刚读到的快照再次写回 `current`。
- 兼容旧数据时允许补缺失的 `session:<id>`，但写入前必须重新读取 canonical `current`，确认 family workspace id 仍相同；只能补缺失 session，不能覆盖更新后的 current。
- 只有 `saveCurrentWorkspace()` 等明确写 owner 才能提交新的 current/session 状态。
- `saveCurrentWorkspace()` 必须等待 canonical `current` 与对应 `session:<id>` 在同一个 IndexedDB 写事务中完成；这是家庭档案的关键持久化路径。
- 最多 30 份历史的 pruning 仍由同一个 `history-store` owner 维护，但它是**事务后的维护工作**：使用单实例 / single-flight 调度去重，不阻塞“新建家庭档案”的核心保存和 UI 事务，也不允许每次保存形成无界清理 fan-out。
- `listWorkspaceHistory()` 继续最多向 UI 返回 30 份历史；后台 pruning 只是物理存储维护，不建立第二套历史状态。
- 这些边界共同保护家庭已确认条件、对话历史和 Decision Workspace：既避免只读消费者晚到的旧快照覆盖主应用刚保存的新事实，也避免历史维护拖慢用户的核心家庭档案事务。

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

- PC：自选工作台位于“我的决策”侧栏，可见当前顺序、诊断和排序建议。
- **左侧决策栏是窄容器，不等于 PC 宽布局。** Selection Workbench 的内部布局由自身约 260px 容器约束：诊断卡保持单列；学校×专业文本不与操作按钮争同一横向行；排序控件纵向堆叠。禁止仅因为 viewport 是桌面宽屏就把侧栏内部切回双列/横排，避免 1600×699 等低高度宽屏下出现卡片被压扁、文字比例失衡的“变形”视觉回归。
- Pad/Android：沿用同一个业务状态，只有响应式布局变化，没有设备专用业务分支。
- 回答中的候选卡只有在能从 workspace 找回真实记录时才增加“加入自选”。无法绑定事实时 fail-closed，不从文案猜一条新志愿。

## Production asset coherence 合同

Selection Workbench 的 live browser gate 不应承担“碰运气等 edge cutover 完成”的职责，也不应通过产品内 retry 掩盖部署传播。现有 `.github/workflows/verify-aiplus-selection-workbench-v005.yml` 是该能力的 Production verification owner，浏览器测试启动前必须在**同一个 bounded readiness loop** 中证明：

1. Pages Production `/aiplus/` 已返回当前 `data-ai-selection-workbench="aiplus-selection-workbench-v0.05"` marker；
2. 同一 HTML 明确引用当前 `selection-workbench.v005.js?v=005_0&fdw=003_0` 和 `selection-workbench.v005.css?v=005_0&fdw=003_0`；
3. `/api/ai/health` 的 `commitSha` 等于本次 `main` push SHA，release 仍为 `v3.9.90.2`；
4. HTML 引用的当前 Selection Workbench JS 可以从 Pages Production 读取，并包含 `AIPLUS_SELECTION_WORKBENCH_VERSION = 'aiplus-selection-workbench-v0.05'` 与 `mountSelectionWorkbench`；
5. HTML 引用的当前 Selection Workbench CSS 可以从 Pages Production 读取，并包含窄栏单列诊断布局合同。

只有这五项同时成立，才进入真实 PC / Pad / Android browser journey。这样 readiness owner 负责等待部署图一致，产品 runtime 不增加第二套 bootstrap/retry，浏览器失败则更接近真实产品问题，而不是可预先识别的 asset cutover 半完成状态。

### Durable Production status

Production 的“已验证”不能只存在某个隐式 Actions run 里。相同 workflow 在 main push 完成后发布唯一可观测状态：

`production/aiplus-selection-workbench-v0.05`

它的状态 owner 仍然是现有 `source-contract` + `browser-production`：publisher 不重新访问生产、不重新跑浏览器、不另建 verifier；只有两个既有 owner 都 success 才发布 success，否则发布 failure。status 的 target URL 必须指向产生该判断的 exact push workflow run，使 main SHA 自己携带可追溯的 Production closure 证据。

## 发布门禁

本能力作为 AIPLuS additive capability 发布，但必须继续遵守统一发布闭环：

`latest main → isolated branch → Draft → exact-head Preview → Ready same SHA → expected_head_sha merge → Production`。

正式检查至少覆盖：

- source ownership / no second storage；
- workspace read 不得 stale-write / 覆盖新家庭条件；
- current/session 原子写必须先完成，history pruning 不得重新进入家庭档案关键路径；
- 左侧窄容器不得恢复双列诊断、横排排序控件或按钮挤压学校×专业文本；
- 现有 AIPLuS workspace / parent-decision / AEK 回归；
- PC / Pad / Android 自选、排序、诊断和候选加入；
- 真实 2026 正例可以加入；历史通用分数、分数/位次不匹配、重复歧义记录均不得出现加入入口；
- exact-head Cloudflare Preview；
- main Production exact SHA；
- Production live browser 前必须证明**页面 + API + 当前 Selection Workbench JS/CSS 资产**处于同一个可执行图；
- main SHA 必须得到 `production/aiplus-selection-workbench-v0.05` durable status，且 success 只能来自同一 workflow 的 source + Production browser success；
- protected paths 不变。
