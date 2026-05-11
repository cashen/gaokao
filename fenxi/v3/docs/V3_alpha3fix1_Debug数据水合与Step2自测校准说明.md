# V3.0.0.alpha3.fix1｜Debug数据水合与Step2自测校准版

版本戳：`v300alpha3fix1-20260512`

## 修复背景

alpha3 线上报告显示：

- Store 中 `rank.loadedRows=7934`，Step2 辽宁 hard 预览已经从 7934 条缩到 1597 条；
- 但 debug 顶部 `数据状态.loadedRows=0`，Step2 自测里 `records=0`。

原因是 V3 工具页完成 Step1 后，原始分块数据只存在当前页面内存的 `LN_V3_DATA_CACHE`。重新打开 `/fenxi/v3/debug.html` 时，Store 草稿仍有 `rank.loadedRows`，但 debug 页内存里的原始 records 尚未重新加载。

## 本版修复

1. `legacy-data-adapter.v3.js` 新增 `ensureFromStore()`。
2. debug 页面启动时，如果 Store 中已有位次 / 分数，会自动重新读取 `/fenxi/data/manifest.json` 与相关分块 JSON，完成原始数据缓存水合。
3. `status()` 新增 `storeLoadedRows`、`cacheHydrated`、`needsHydration` 等字段。
4. Step2 debug 自测新增“原始数据缓存已水合”检查。
5. 若 Store 有 loadedRows 但 records 仍为 0，自测不再误报 PASS，会指出需要数据水合。

## 未改变内容

- 不改旧 `/fenxi/index.html`；
- 不改 fix12 compute 主链路；
- 不改正式地域 hard 规则；
- 不触发旧 `applyFilters`；
- Step2 仍只是 V3 轻量预览。
