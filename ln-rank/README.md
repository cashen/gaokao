# 辽宁志愿梯度位次参考工具 v3.7

## 版本目标

v3.7 在 v3.6 的短屏 Dashboard 基础上，重点补齐三个专业口径：

- **目标附近人数**：以“想看的目标分”为统计标的，展示目标分所在固定 5 分段，以及低一档 / 高一档分段人数。
- **数据口径说明**：明确当前统计基于辽宁 2025 一分一段数据；正式报告以当年位次和等位分 / 同位分换算结果为准。
- **同分说明**：当前工具按一分一段累计人数计算，采用同分末位累计口径，未展开语数外等同分内部排序。

主界面继续坚持：

```text
家长看结论，高报师看依据，代码给后续维护。
```

## 入口

- 首页：`index.html`
- 部署自检：`diagnostics.html`

## 目录结构

```text
ln-rank-span-tool-v3.7/
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

## v3.7 主要新增

### 1. 目标附近人数

目标分 533 时，采用固定 5 分段：

```text
低一档分段：525-529
目标所在分段：530-534
高一档分段：535-539
```

主界面只显示：

```text
目标附近人数：530-534 分段约 X 人
```

抽屉里再展开低一档和高一档。

### 2. 本次区间密度

在“目标附近人数”抽屉里显示：

```text
从考生分数到目标分数，本次位次跨度/余量约 X 名，平均约 X 人 / 5 分。
```

它用于解释“这次从考生分到目标分中间有多密”，但不替代主判断。

### 3. 数据口径

页面底部小字和“数据口径”抽屉明确写出：

```text
当前基于辽宁 2025 一分一段数据进行参考。
正式报告以当年位次和等位分/同位分换算结果为准。
同分内部排序未展开，采用一分一段累计人数/同分末位累计口径。
```

## 计算口径

### 位次跨度 / 位次余量

```text
上看：考生分累计人数 - 目标分累计人数
下看：目标分累计人数 - 考生分累计人数
```

当未来接入 2026 数据时，内部逻辑保留为：

```text
2026 考生分数 → 2026 位次 → 2025 等位分/同位分 → 和 2025 目标分比较
```

普通用户界面不暴露年份选择。

### 目标附近人数

```text
targetBandStart = floor(targetScore / 5) * 5
targetBandEnd = targetBandStart + 4
lowBand = targetBandStart - 5 到 targetBandStart - 1
highBand = targetBandStart + 5 到 targetBandStart + 9
```

分段人数累加该分段内每 1 分的 `people` 字段；缺失分数按 0 人处理；超出统计范围时按边界裁剪。

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
/ln-rank/js/config/drawer-config.js
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
物理目标 533：525-529 / 530-534 / 535-539 = 2,296 / 2,343 / 2,334
历史目标 533：525-529 / 530-534 / 535-539 = 819 / 740 / 741
```

## 维护建议

- 改文案：优先改 `js/config/ui-text.js`。
- 改抽屉：优先改 `js/config/drawer-config.js` 和 `js/render/render-drawer.js`。
- 改计算：只改 `js/calc/rank-calc.js`。
- 改颜色：优先改 `css/tokens.css`。
- 改布局：优先改 `css/layout.css` 和 `css/responsive.css`。
- 改卡片/按钮细节：优先改 `css/components.css`。

## 后续路线

- v3.8：密集区 / 人群带提示。
- v3.9：梯度体检，支持输入一组目标分，检查过度冲、过度保和梯度断层。
- v4.0：接院校专业数据、往年录取位次、招生计划、专业冷热等。


---

# v3.8 方向（ln-rank × /fenxi 联动）

新增规划：

- 在 ln-rank 中直接查看目标分附近专业
- 不增加收费验证与密码模块
- 使用 /fenxi 作为历史院校专业数据来源
- 默认按：
  - 上探参考（+1~+10）
  - 主体参考（0~-10）
  - 稳妥参考（-11~-25）
  分组展示

当前阶段已完成目录结构与联动预留。

---

# v3.8-data-connected：ln-rank 入口读取 /fenxi 专业数据

本版已在 ln-rank 页面新增“目标分附近专业”模块。

## 功能口径

- 入口仍在 ln-rank。
- 数据读取 `/fenxi/data/manifest.json` 和 `/fenxi/data/chunks/*.json`。
- 不接密码验证。
- 不接收费模块。
- 不做录取概率。
- 按目标分默认分三组：
  - 上探参考：目标分上方 1-10 分
  - 主体参考：目标分附近 0 到 -10 分
  - 稳妥参考：目标分下方 11-25 分

## 当前数据边界

上传的 `/fenxi` 包中，院校专业 chunk 数据以 2025 辽宁物理类记录为主，因此：

- 物理类可读取目标分附近专业池。
- 历史类暂不展示专业池，只保留位次梯度判断。

## 部署要求

部署后请确认以下路径可以公开访问：

```text
/fenxi/data/manifest.json
/fenxi/data/chunks/rank_00000_10000.json
/fenxi/data/chunks/rank_10000_20000.json
...
```

如果这些 JSON 不能直接读取，ln-rank 的专业池模块会提示“没有读取到 /fenxi 数据”。

## 自检

部署后访问：

```text
/ln-rank/target-major-diagnostics.html
```

应能看到目标分 500 对应的上探参考、主体参考、稳妥参考均有记录。

---

# v3.8.1 cloudflare-api-connected

目标分附近专业改为通过 `/api/target-majors` 获取。

前端不再直接读取 `/fenxi/data/manifest.json` 和 chunks。

需要 Cloudflare Pages 根目录部署 `functions/api/target-majors.js`，并在 Cloudflare 后台设置：

```text
FENXI_DATA_BASE
FENXI_ACCESS_KEY
FENXI_ACCESS_MODE
```

部署后先访问：

```text
/ln-rank/target-major-diagnostics.html
```


---

# v3.8.2 数据读取口径

目标分附近专业模块通过 `/api/target-majors` 读取数据。  
前端不直接访问 `/fenxi/data`，也不包含密码或 secret。

Cloudflare Pages Function 会使用与 `/fenxi/_middleware.js` 相同的 `LN_SESSION_SECRET` 或 `ACCESS_COOKIE_SECRET` 生成临时 cookie，并在服务端读取 `/fenxi/data`。
