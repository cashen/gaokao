# v3.9.38 Compact Guide UI Contract

本合同用于避免把家长向导做成大字说明。

## 组件角色

- 查询页：`ln-parent-compact-stepper`，只做认路，不能抢主查询。
- 自选池：`ln-plan-status-strip`，表示方案整理状态，不再重复四步大卡片。
- 211 / 省内 / 趋势：`ln-aux-guidance-note`，低权重说明辅助复核边界。
- self-check：工程自查页，不挂家长向导组件。

## 不改功能

本版只调整视觉呈现、HTML 引导组件和 CSS；不改查询、筛选、AI、飞书、背景、趋势数据逻辑。
