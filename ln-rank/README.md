# 辽宁 2025-2026 志愿梯度位次参考工具 v3.1

## 入口

- 首页：`index.html`
- 部署自检：`diagnostics.html`

## 目录结构

```text
ln-rank-span-tool-v3.1/
  index.html
  diagnostics.html
  css/
  js/
  data/
```

## 部署注意

如果部署到 `https://example.com/ln-rank/`，请上传本目录里面的所有内容到 `/ln-rank/`，而不是只上传 `index.html`。

必须能直接访问：

```text
/ln-rank/data/gaokao-rank-data.js
/ln-rank/js/calc.js
/ln-rank/js/render.js
/ln-rank/js/app.js
/ln-rank/css/base.css
```

部署后先访问：

```text
/ln-rank/diagnostics.html
```

默认自检案例应显示：

```text
物理 520 → 550
同位分差 +30
位次跨度 14,010
```

## v3.1 修正点

- 首屏不再静态显示 `0 名`，避免脚本未加载时误导。
- 增加运行时错误提示区，若 data/js 缺失会直接在页面显示原因。
- 脚本引用增加 `?v=3.1`，降低浏览器或 CDN 缓存造成的旧文件混用。
- 增加 `diagnostics.html` 部署自检页。

## 核心口径

正式填报时，不建议直接用今年分数对比去年分数。
应先用当年一分一段得到今年位次，再映射到对照年份同位分，最后判断冲、稳、保梯度。

当前包内 2026 数据为占位，2026 一分一段发布后，在 `data/gaokao-rank-data.js` 中补入 2026 `rows` 即可。
