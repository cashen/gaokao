# 辽宁物理类高考志愿初选工具 V2.9.5.2｜场景与目标路径统一规则版

本版基于 V2.9.5.1 继续迭代，核心目标是把“场景卡”和“填报目标”统一到独立规则体系中，同时清理生产部署包中的历史入口文件。

## 主要变化

1. 第一部分只保留“定位孩子分数 / 位次”，不再在第一步放“填报目标”。
2. 第三部分统一为“场景 + 当前目标路径”：先选家庭场景，再用目标路径微调。
3. 新增 `assets/rules.v2952.js`，包含 `scenarioPresets` 与 `preferenceRules`。
4. `填报目标` 下拉框不再写死在 HTML 中，而是由 `preferenceRules` 自动生成。
5. A/B/C PlanBias 同时读取：场景倾向 × 目标路径倾向。
6. 用户手动修改目标路径后，页面会显示“已手动微调”。
7. 场景卡不会偷偷覆盖用户已经设置的家庭底线。
8. 生产包瘦身：不再携带历史 `app.v294xx / app.v2950 / app.v2951` 入口文件。

## 当前运行入口

```html
<link href="./assets/app.v2952.css" rel="stylesheet"/>
<script src="./assets/major-name-model.v2946.js"></script>
<script src="./assets/confusable-major-model.v29462.js"></script>
<script src="./assets/rules.v2952.js"></script>
<script src="./assets/app.v2952.js"></script>
```

## 后续维护原则

- 修改场景卡：优先改 `rules.v2952.js -> scenarioPresets`
- 修改填报目标：优先改 `rules.v2952.js -> preferenceRules`
- 修改 A/B/C 方案权重：优先改 `planBias`
- 修改专业路径：优先改 `pathRules`
- 修改复核提醒：优先改 `reviewRules`
