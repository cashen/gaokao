# 模拟志愿 r157：统一 SimulationChoice 志愿记录契约

## 真实基线

- main：`b50e901e4a5b58bd9403cb7c6461e60f4453f646`
- 基线提交：`Merge PR #306: fix simulation school-major flow and Android overflow`
- 本轮分支：`refactor/simulation-choice-contract-r157`
- 现有 Open PR：#304，内容为 srgaoxiao 标签采集，不与本次 simulation 代码重叠。

## 本轮目标

把一条“模拟志愿”收敛成仓库唯一 `SimulationChoice` 契约：

`学校 → 真实招生专业记录 → 三年历史 → 家庭处理 → 来源/时间/状态`

身份优先级：

1. `majorRecordId`
2. 仓库没有 record id 时，显式使用 `schoolCode2026 + majorCode2026`

`standardMajorName / standardMajorCode` 只承担标准专业参考身份，不承担招生项目唯一身份。

## 已实施架构

- 唯一契约 owner：`shared/resources/simulation/simulation-choice-contract.v001.js`
- 唯一 simulation runtime owner：`ln-rank/js/simulation-runtime.js`
- 唯一 CSS owner：`ln-rank/css/simulation-report.css`
- PDF service：`ln-rank/js/simulation-report-pdf-service.js`，只消费 SimulationChoice，不再做 admission rematch
- 页面 URL 使用 `majorRecordId`，并同时带 `schoolCode / majorCode2026 / majorName / source / entry`
- deep-link 恢复使用 record id 精确核验；找不到时不降级成模糊专业
- 历史状态拆分：`loading / error / missing / history`
- 请求失败不会转换成空数组语义
- 专业搜索只在当前确认学校的真实招生记录中排序：完全匹配 → 前缀 → 包含，招生代码参与同级排序
- 显式学校候选点击立即持久化 `school + confirmedSchool`
- 家庭备注、来源、创建/更新时间与记录一起保存

## 跨模块边界

首页已经有 simulation 主入口；当前 `major-path / Tongxue / AIPLuS` 使用各自已有的上下文/声音/家庭决策导航体系，并没有另一套 simulation store。r157 不再给这些模块增加 SP；它们若持有真实招生记录，只需要调用统一 `buildSimulationChoiceHref()`，进入同一个 `/ln-rank/simulation-report.html` owner。

对于 Tongxue/AIPLuS 没有具体 admission record 的场景，不伪造 record id，也不把标准专业名冒充为招生项目身份。

## 测试入口

正式 simulation browser workflow 统一为：`tools/browser-simulation-workspace-r157.mjs`。

正式 contract verifier 统一为：`tests/verify-simulation-choice-contract-r157.mjs`。

旧的 r149/r152/r156 simulation browser 脚本不再作为 workflow 正式测试入口。

## 版本

- workspace：`simulation-workspace-v016.67`
- revision：`r157-simulation-choice-contract`
- page：`v1.3`
- runtime：`v016.67-r157`
- PDF：`v016.67-r157`

## 回归矩阵

- 390px Android Chromium
- 768px Pad
- 1280px Desktop
- 普通招生项目 / 中外合作项目 / 同名不同项目
- 三年历史与单年度缺失
- API error 与 loading
- refresh
- back/forward
- deep-link exact record
- 2 条以上志愿互不污染
- 删除/编辑隔离
- familyNote persistence
- PDF exact record ids

## Alook

当前执行环境没有 Alook 实机证据，因此只能记录为“尚缺 Alook 实机回归”，不能宣称 Alook 全通过。
