# 辽宁 2025-2026 志愿梯度位次参考工具 V3

## 入口

直接打开：

```text
index.html
```

本项目不需要 Node、不需要后端、不需要打包。PC、Pad、Android 浏览器都可直接运行。

## V3 相比 V2 的核心变化

V2 是：

```text
当前分数 vs 参考分数
```

V3 是：

```text
今年分数 → 今年位次 → 对照年份同位分 → 冲稳保判断
```

也就是说，2026 一分一段发布后，不应该直接拿 2026 分数和 2025 分数相减，而应该先通过今年位次折算到 2025 同位分，再和 2025 参考分比较。

## 当前数据状态

当前内置：

- 辽宁 2025 物理类
- 辽宁 2025 历史类

数据文件中已经保留 2026 的结构占位，但默认禁用。2026 一分一段发布后，把数据导入：

```text
data/gaokao-rank-data.js
```

对应位置：

```js
subjects.physics.years["2026"].rows
subjects.history.years["2026"].rows
```

每行格式：

```js
[分数, 本分人数, 累计人数]
```

导入后删除：

```js
unavailable: true
```

并把：

```js
dataStatus: "pending"
```

改为：

```js
dataStatus: "available"
```

## 文件结构

```text
ln-rank-span-tool-v3/
  index.html
  css/
    base.css
    layout.css
    components.css
    responsive.css
  js/
    calc.js
    render.js
    app.js
  data/
    gaokao-rank-data.js
    gaokao-rank-data.json
  README.md
```

## 主要功能

- 物理类 / 历史类切换
- 当前年份 / 对照年份结构
- 当前分数手动输入 + 滑轨
- 参考分数手动输入 + 滑轨
- 快捷参考分差：+50、+30、0、-30、-70 等
- 输出同位分差
- 输出位次跨度或位次余量
- 输出匹配 / 小冲 / 中冲 / 大冲 / 超冲 / 稳 / 超稳 / 保 / 偏低参考
- 自动生成给家长看的说明
- PC / Pad / Android 自适应

## 重要口径

本工具不输出录取概率。

它只用于解释：

- 当前分对应的位次
- 今年位次对应的对照年同位分
- 同位分和参考分之间的分差
- 对应的位次跨度或位次余量
- 志愿梯度参考

正式填报还需要结合院校专业、往年录取位次、招生计划、选科要求、体检限制和专业热度变化。
