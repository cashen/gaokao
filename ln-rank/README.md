# 辽宁 2025 位次跨度参考工具

这是一个可维护的静态网页工程，用于根据辽宁 2025 一分一段数据，计算当前分数向上参考某个分数时的累计位次变化。

## 文件结构

```text
ln-rank-span-tool/
  index.html
  css/
    base.css
    layout.css
    components.css
    responsive.css
  js/
    calc.js      # 计算：稠密分数表、位次跨度、参考层级、说明文案
    render.js    # 渲染：DOM 更新、按钮状态、表格输出
    app.js       # 入口：事件绑定和状态管理
  data/
    ln2025-score-rank.js    # 本地直接打开优先使用，兼容 PC / Pad / Android
    ln2025-score-rank.json  # 同结构 JSON，便于后续数据管道替换
```

## 为什么数据用 JS 包一层

如果页面直接 `fetch('./data/xxx.json')`，在部分本地文件场景、Android WebView、微信浏览器里可能失败。当前版本通过：

```html
<script src="./data/ln2025-score-rank.js"></script>
```

把数据挂到 `window.LN2025_SCORE_RANK`，本地双击也能运行。

## 数据维护方式

数据主体在：

```text
data/ln2025-score-rank.js
```

结构示例：

```js
subjects: {
  physics: {
    label: '物理类',
    rows: [
      [707, 11, 11],
      [706, 2, 13]
    ]
  }
}
```

每一行含义：

```text
[分数, 本分人数, 累计人数]
```

运行时会自动生成 `scoreMap`。如果官方表里某个分数没有出现，系统会按 0 人补齐，累计人数沿用上一高分。

## 产品口径

页面刻意不使用“危险、暴雷、冲不上”等焦虑表达。统一使用：

- 位次跨度
- 上探分数
- 参考层级
- 志愿梯度
- 前部探索
- 稳妥和保底

本工具不输出录取概率，只做志愿梯度沟通辅助。

## 运行方式

直接打开 `index.html` 即可。也可以部署到任意静态服务器。

## 后续扩展建议

- 增加 2026 数据，只需新增一个数据文件并在 HTML 中替换引用。
- 支持多省份：把 `province/year/subjects` 抽象成数据选择器。
- 接入真实院校专业录取数据后，再做“院校专业匹配”，不要在当前工具里直接输出概率。
