# 辽宁物理类高考志愿初选工具

当前版本：V2.9.5.3.fix1｜访问码入口统一修正版

## 本版重点

- 基于 V2.9.5.3 做访问码入口小修，不改变筛选、A/B/C、场景规则、数据口径。
- 页面只保留顶部访问码入口，删除中部旧的“开启工具 / gateBox”模块。
- 访问码逻辑统一放到 `assets/app.v2953fix1.js`，`filter-engine` 不再处理访问码。
- 顶部输入 `ln2025` 后，可点击“开启工具”，也可直接按 Enter 开启。
- 已开启状态显示更明确：`已开启：可以填写位次并筛选。`
- 生产入口切换到 `assets/app.v2953fix1.js` / `assets/app.v2953fix1.css`，避免旧缓存。

## 保留能力

- V2.9.5.3 的模块化结构继续保留：config / rules / data-engine / filter-engine / plan-engine / render / selection / export / app。
- 场景与目标路径统一规则继续保留。
- 家庭底线前置、A/B/C 主结果展示、高校专项默认保护、中外合作提档、主专业归一搜索、自选与导出继续保留。

## 维护建议

- 改场景、目标路径、A/B/C 权重、专业路径、复核提醒：优先改 `assets/rules.v2953.js`。
- 改数据路径、默认参数、首屏数量：优先改 `assets/config.v2953.js`。
- 改筛选算法：优先改 `assets/filter-engine.v2953.js`。
- 改 A/B/C 方案：优先改 `assets/plan-engine.v2953.js`。
- 改页面渲染：优先改 `assets/render.v2953.js`。
- 改自选池：优先改 `assets/selection.v2953.js`。
- 改导出：优先改 `assets/export.v2953.js`。
- 改应用入口、访问码、全局事件绑定：优先改 `assets/app.v2953fix1.js`。

## V2.9.5.3.fix2｜初始化与访问码启动修正版

修复 fix1 中三个初始化错误，确保顶部访问码 `ln2025` 可以正常解锁：

- data-engine 不再提前引用 autoRefresh。
- render 不再错误导出 selection 模块中的 renderStructure。
- app 不再重复声明 debouncedAutoRefresh。

