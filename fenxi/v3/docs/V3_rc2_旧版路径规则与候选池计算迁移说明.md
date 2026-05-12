# V3.0.0.rc2｜旧版路径规则与候选池计算迁移版

## 范围

本包只更新 `fenxi/v3/` 和 `tools/`，不覆盖旧版 `/fenxi/index.html`。

## 本版核心

- 新增 `legacy-rulebook-adapter.v3.js`：迁入旧版 12 个场景路径、9 个目标路径、8 个专业路径、A/B/C 规则和复核规则。
- 新增 `professional-path-engine.v3.js`：恢复“正主 / 相近 / 泛相关 / 需复核”的专业路径判断。
- 新增 `profile-score-engine.v3.js`：把旧版普通家庭推荐分、风险扣减、目标路径加权迁入 V3。
- 新增 `compute-core.v3.js`：形成 V3 RC2 的完整候选池计算链。
- 新增 `advanced-filter-adapter.v3.js`：为高报师完整模式恢复旧版高级筛选能力。
- 新增 `state-invalidation-adapter.v3.js`：为纯前端 localStorage 和条件变化增加失效护栏。
- 新增 `device-adapter.v3.js` 与 `rc2-core.v3.css`：补充移动端/平板/PC 多设备兼容。
- 新增 `path-matrix-debug.v3.js`：提供 RC2 一键总检、路径规则矩阵、目标路径矩阵、专业路径矩阵、分数段矩阵、设备和状态失效检查。

## 关键原则

1. 规则层只定义规则，不读 DOM。
2. 计算层只算候选，不渲染页面。
3. Step 页面只负责显示和事件。
4. A/B/C 和详细卡片统一读取 compute-core 结果。
5. 家长默认模式保持简洁，高报师完整模式恢复旧版筛选力。
6. 性别和学生画像只影响提醒与排序，不做专业硬排除。

## 部署后检查

1. 打开 `/fenxi/v3/`，确认版本为 `V3.0.0.rc2`。
2. 打开 `/fenxi/v3/debug.html`，点 `RC2一键总检`。
3. 确认 12 场景、9 目标路径、8 专业路径全部 PASS。
4. 用手机端检查 Step4、Step5、Step6 是否不横向撑破。
5. 测试改变分数、家庭底线、孩子兴趣、路径后，A/B/C 和详细候选是否重新计算。
