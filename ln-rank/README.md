# 辽宁志愿梯度位次参考工具 v3.4

## 版本目标

v3.4 是基于 v3.3 的“短屏 + 抽屉卡片 + 家长友好文案”版本。

核心原则：

- 主屏只给结论，细节放进抽屉。
- 家长端只保留：科类、考生分数、想看的目标分。
- 年份、同位分、对照逻辑保留在程序内部，不暴露给普通用户。
- 文案避免焦虑表达，不使用“危险、暴雷、录不上、失败”等词。
- 代码继续保持数据、计算、渲染、文案配置分层。

## 入口

- 首页：`index.html`
- 部署自检：`diagnostics.html`

## 目录结构

```text
ln-rank-span-tool-v3.4/
  index.html
  diagnostics.html
  README.md
  css/
    tokens.css
    base.css
    layout.css
    components.css
    drawer.css
    responsive.css
  js/
    app.js
    config/
      ui-text.js
      drawer-config.js
    calc/
      rank-calc.js
    render/
      render-main.js
      render-drawer.js
  data/
    gaokao-rank-data.js
    gaokao-rank-data.json
```

## 部署注意

如果部署到：

```text
https://example.com/ln-rank/
```

请把本目录里面的所有内容上传到 `/ln-rank/`，不要只上传 `index.html`。

必须能直接访问：

```text
/ln-rank/data/gaokao-rank-data.js
/ln-rank/js/config/ui-text.js
/ln-rank/js/calc/rank-calc.js
/ln-rank/js/render/render-main.js
/ln-rank/js/render/render-drawer.js
/ln-rank/js/app.js
```

部署后先访问：

```text
/ln-rank/diagnostics.html
```

关键自检案例：

```text
物理 520 → 550：位次跨度 14,010
物理 500 → 430：位次余量 34,990
物理 365 → 395：位次跨度 11,602
物理 365 → 375：位次跨度 3,574
```

## 用户界面口径

主页面只展示：

```text
科类
考生分数
想看的目标分
这个目标属于：小冲 / 中冲 / 大冲 / 超冲 / 匹配 / 稳 / 超稳 / 保 / 偏低参考
适合位置
位次跨度 / 位次余量
```

## 程序内部口径

代码仍保留多年份架构：

```text
当前年份分数 → 当前年份位次 → 对照年份同位分 → 目标分比较
```

当前包内 2026 数据为占位。2026 一分一段发布后，在 `data/gaokao-rank-data.js` 或 `data/gaokao-rank-data.json` 中补入 2026 `rows` 即可。

## 维护建议

- 改文案：优先改 `js/config/ui-text.js`。
- 改抽屉：优先改 `js/config/drawer-config.js` 和 `js/render/render-drawer.js`。
- 改计算：只改 `js/calc/rank-calc.js`。
- 改颜色：优先改 `css/tokens.css`。
- 改响应式：优先改 `css/responsive.css`。
