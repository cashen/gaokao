# V2.91RC0 性能预算

## 页面加载

- FCP：建议 ≤ 1.5s
- domInteractive：建议 ≤ 1.5s
- loadEventEnd：作为资源拖尾观察项，不单独作为功能失败条件

## 交互运行时

- 辽宁 hard + manualOnly=true：applyFilters 建议 ≤ 100ms
- 辽宁 hard + manualOnly=false：applyFilters 建议 ≤ 800ms
- soft/none + manualOnly=false：可能进入大候选池，不作为本阶段失败条件

## 重复刷新

- 抽屉关闭无变化：不得触发 applyFilters
- 同一控件 change：不得连续触发两次等价 applyFilters

## 后续专项

- JS 请求收口：rules-core / ui-core
- 大候选池性能：全国 / 东北 / manualOnly=false
- engine-facade：统一调用入口和 debug 归因


---

## V2.91RC0.rules-core1 补充说明

- 基线：V2.91RC0。
- 本版只做规则类脚本按真实加载顺序的安全分段合并。
- 新增回退开关：`LN_RULES_BUNDLE_OPT`。
- 不改 `compute-pipeline`、`filter-engine`、`plan-engine`、`render`、`app`、`safeperf`、`interact1/interact2`。
- debug deep 自测新增“rules-core1 分段规则包加载与导出检查”。
