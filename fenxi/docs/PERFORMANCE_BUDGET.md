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
