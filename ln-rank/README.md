# 辽宁志愿梯度位次参考工具 v3.6

## 版本目标

v3.6 是基于 v3.4 的“成熟工具界面 + 多终端布局重构”版本。

这版不是继续放大字体，而是把页面调整成更克制、专业、短屏的咨询辅助工具：

- PC：三栏 Dashboard，按 1366×768 桌面约束继续压缩高度，主操作尽量首屏完成。
- Pad：双栏主体 + 横向参考卡片。
- Android：结果优先，输入和参考卡片更紧凑。
- 字号整体收回，保留关键结论突出，不做“大字报”。
- 色系延续 v3.4 的温和米白、蓝绿、暖橙，并给“小冲 / 稳妥 / 超冲 / 过低参考”等判断加低饱和颜色提醒。
- 代码继续保持数据、计算、渲染、文案、样式分层。

## 入口

- 首页：`index.html`
- 部署自检：`diagnostics.html`

## 目录结构

```text
ln-rank-span-tool-v3.6/
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

## v3.6 主要调整

### 1. PC 短屏化

PC 下改为三栏：

```text
左：填写信息
中：核心结果
右：更多参考入口
```

目标是让 1366×768 这类常见桌面尺寸完成主操作时不再因为一点点高度溢出而必须下滑。

### 2. 字号回归成熟比例

用户不是“老人机模式”，所以本版降低了整体字号和卡片厚度：

- 标题更克制。
- 输入框保持清楚但不过大。
- 主判断和位次数字仍然突出。
- 说明文字降低存在感。

### 3. 多终端布局差异化

不是简单缩放 PC：

- PC：三栏 Dashboard。
- Pad：主体双栏，更多参考变横向卡片。
- Android：结果卡片提前，更多参考横滑，抽屉为底部弹层。

### 4. 继续保留人话口径

主页面只展示：

```text
科类
考生分数
想看的目标分
这个目标属于：小冲 / 中冲 / 大冲 / 超冲 / 匹配 / 稳妥 / 超稳 / 保底 / 过低参考
适合位置
位次跨度 / 位次余量
```

内部保留多年份、同位分、位次映射逻辑，但不在家长端强行解释。

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

## 维护建议

- 改文案：优先改 `js/config/ui-text.js`。
- 改抽屉：优先改 `js/config/drawer-config.js` 和 `js/render/render-drawer.js`。
- 改计算：只改 `js/calc/rank-calc.js`。
- 改颜色：优先改 `css/tokens.css`。
- 改布局：优先改 `css/layout.css` 和 `css/responsive.css`。
- 改卡片/按钮细节：优先改 `css/components.css`。
