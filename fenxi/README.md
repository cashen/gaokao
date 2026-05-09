# 辽宁物理类高考志愿初选工具

当前版本：V2.9.5.3｜模块化解耦与加载瘦身版

## 本版重点

- 基于 V2.9.5.2 拆分为 config / rules / data-engine / filter-engine / plan-engine / render / selection / export / app。
- index.html 不再直接写 onclick，改用 data-action / data-scroll-target 事件委托。
- 生产包继续瘦身，只保留当前运行链路文件。
- 保留 V2.9.5.2 的场景与目标路径统一规则、家庭底线前置、A/B/C 主结果展示、高校专项默认保护、中外合作提档、主专业归一搜索、自选与导出。

## 维护建议

- 改场景、目标路径、A/B/C 权重、专业路径、复核提醒：优先改 `assets/rules.v2953.js`。
- 改数据路径、默认参数、首屏数量：优先改 `assets/config.v2953.js`。
- 改筛选算法：优先改 `assets/filter-engine.v2953.js`。
- 改 A/B/C 方案：优先改 `assets/plan-engine.v2953.js`。
- 改页面渲染：优先改 `assets/render.v2953.js`。
- 改自选池：优先改 `assets/selection.v2953.js`。
- 改导出：优先改 `assets/export.v2953.js`。
