# V2.9.5.3.fix5｜PLAN_MODES 兼容别名与方案盘运行修正版

- 修复 `PLAN_MODES_V2950 is not defined` 导致 A/B/C 方案盘计算失败的问题。
- 所有主模块继续使用 fix5 文件名，避免浏览器缓存旧 fix4 模块。
- 新增校验：如果 `PLAN_MODES_V2950` 被引用，必须存在兼容别名定义。
- 不改筛选规则、不改 A/B/C 业务口径，只修运行时模块兼容问题。

# 辽宁物理类高考志愿初选工具

## 当前版本
V2.9.5.3.fix4｜模块缓存隔离与运行时校验版

## 本版修复重点

1. 所有业务模块统一改为 `*.v2953fix4.js`，避免浏览器或 Cloudflare 继续缓存旧 `data-engine.v2953.js` / `render.v2953.js` / `app.v2953fix2.js`。
2. 顶部访问码仍为 `ln2025`，支持点击按钮和 Enter。
3. `app` 不再使用 `const debouncedAutoRefresh`，改为 `window.debouncedAutoRefreshV2953Fix3`，避免重复声明导致整页中断。
4. 保留模块化结构：config / rules / data-engine / filter-engine / plan-engine / render / selection / export / app。
5. 新增 `diagnostics.html`，上线后可打开该页面检查模块是否加载成功。

## 当前运行链路

```text
index.html
assets/config.v2953fix4.js
assets/rules.v2953fix4.js
assets/major-name-model.v2946.js
assets/confusable-major-model.v29462.js
assets/data-engine.v2953fix4.js
assets/filter-engine.v2953fix4.js
assets/plan-engine.v2953fix4.js
assets/render.v2953fix4.js
assets/selection.v2953fix4.js
assets/export.v2953fix4.js
assets/app.v2953fix4.js
assets/app.v2953fix4.css
```

## 上线后建议检查

1. 清浏览器缓存或使用无痕窗口。
2. 打开 `diagnostics.html`，确认所有模块为通过。
3. 打开 `index.html`，输入 `ln2025`，点击开启工具或按 Enter。
4. 输入分数或位次，查看 A/B/C 是否生成。
