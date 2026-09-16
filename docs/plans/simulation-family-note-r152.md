# 模拟志愿家庭备注统一管理 r152

## 目标

把“备注”从志愿卡片底部的孤立单行字段，收敛为现有“家庭处理”上下文中的一等记录。备注继续属于同一个 volunteer row，由 `simulation-runtime.js` 的 Unified Store 持久化，不新增独立运行时、独立 store、独立事件桥或独立 UI 管理器。

## 已执行

- `simulation-runtime.js` 版本提升为 `v016.62-r152`。
- 家庭处理区统一渲染：处理结论 + 备注编辑器处在同一语义区。
- 备注由 `<input>` 改为支持多句文本的 `<textarea>`，最大 1000 字符。
- 输入时自动增高，限制最大编辑高度；超出后在输入框内部滚动，避免把整张志愿卡撑成巨大区域。
- 备注输入不触发整张志愿清单重新渲染，继续遵守 r151 的统一 runtime 性能约束。
- 备注每次输入直接写入 Unified Store，刷新、调整家庭处理状态、排序后均保留。
- 保留旧 `familyNote` 数据字段，兼容既有本地数据，不建立新 note storage key。
- CI 增加 Android 390 / Pad 768 / Desktop 1280 三视口回归脚本，覆盖长文本、自动增高、持久化、家庭处理切换和刷新恢复。
- release contract 提升至 `simulation-workspace-v016.62 / r152-family-note-unified-editor`。

## 人类交互规则

备注不是“额外功能”，而是家长处理一条志愿时自然留下的记录。默认应该能看到，但视觉权重低于学校、专业、历史参考和家庭处理结论；长文本通过输入框自身展开，不使用弹窗、`prompt()` 或额外悬浮面板。

典型使用方式：先选择“继续考虑 / 候选 / 还没决定 / 排除”，再在同一位置记录原因，例如学费、校区、专业方向、家里意见或待核实事项。

## 不做

- 不新增 `simulation-report-v0xx-*.js` 页面运行时。
- 不新增 `family-note-manager.js`、独立 localStorage key 或独立状态对象。
- 不用一个更大的永久 textarea 换取“长文本支持”。
- 不因为备注输入增加整卡 render、列表重排或网络请求。
