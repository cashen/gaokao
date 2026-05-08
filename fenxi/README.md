# 辽宁物理类高考志愿初选工具

## V2.9.5.1｜独立规则集与场景策略集中化版

本版基于 V2.9.5.0 继续迭代，重点不是新增筛选项，而是把场景卡、策略、A/B/C 偏置、专业路径和复核提醒抽到独立规则集。

### 核心改动

1. 新增 `assets/rules.v2951.js`，作为独立规则集。
2. 场景卡由 `SCENARIO_PRESETS / strategyRules` 自动渲染，不再在 HTML 中写死。
3. `applyStrategy()` 改为读取规则集，不再靠散落 if/else 控制策略。
4. 场景卡只作为建议策略，不会偷偷覆盖用户已手动设置的家庭底线。
5. 新增 12 个核心场景：高分平台冲刺、高分平台稳妥、高分性价比、普通家庭稳就业、省内公办稳妥、民办可比较、本科机会边缘、预算较宽、电网能源、医学方向、考公体制、先不设限。
6. `PlanBias` 接入 A/B/C 方案评分，用于影响 A 守底线、B 看专业、C 争上限的倾向。
7. 高级筛选增加明确“展开”和“高报师完整模式”入口。
8. 保留 V2.9.5.0 的家庭底线前置、A/B/C 主结果化、家长简洁模式、高校专项默认隐藏、中外合作提档、主专业归一搜索等能力。

### 文件入口

```html
<link href="./assets/app.v2951.css" rel="stylesheet"/>
<script src="./assets/rules.v2951.js"></script>
<script src="./assets/app.v2951.js"></script>
```

### 后续维护原则

- 修改场景卡：优先改 `rules.v2951.js` 的 `scenarioPresets`。
- 修改 A/B/C 文案和复核项：优先改 `planRules / reviewRules`。
- 修改专业路径：优先改 `pathRules`。
- 修改执行和渲染：再改 `app.v2951.js`。
