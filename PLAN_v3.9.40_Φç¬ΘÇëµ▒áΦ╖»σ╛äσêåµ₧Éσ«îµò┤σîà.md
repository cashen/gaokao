# v3.9.40 自选池路径分析完整包

## 定位

本包是基于 `ln-rank-span-tool-v3.9.36-major-bands-stability` 生成的完整可部署包，不是增量补丁。

- 页面主路径：`/ln-rank/`
- 数据来源：`/fenxi` 已接入的辽宁 2025 物理类院校专业数据
- 后端：Cloudflare Pages Functions
- 主接口仍保留：`/api/major-bands`
- 新增接口：`/api/path-analysis`

## 新增能力

1. PC 首页左侧悬浮自选池抽屉。
2. 小屏 PC / 平板使用左侧覆盖抽屉。
3. 手机端自动改为右下角按钮 + 底部抽屉。
4. 专业卡片新增“加入自选池”。
5. 自选池 localStorage 持久化，刷新不丢。
6. 新增 `/ln-rank/selection-pool.html` 完整排序工作台。
7. 支持上移、下移、删除、清空、下载 JSON。
8. 新增路径分析规则引擎，输出整体判断、风险、调整建议、报告文本。
9. 报告文本可复制到飞书文档。

## 数据口径

当前版本仍使用 `/fenxi` 的辽宁 2025 物理类专业数据。系统只形成专业池讨论与路径分析，不等同于录取预测。正式填报必须结合 2026 年当年一分一段、等位分/同位分、招生计划、选科要求、体检限制、学费、校区和特殊项目人工核验。

## 主要文件

```text
ln-rank/index.html
ln-rank/selection-pool.html
ln-rank/js/app.v3940.js
ln-rank/js/selection-pool.v3940.js
ln-rank/js/feature/major-pool/major-pool-render.v3940.js
ln-rank/js/feature/selection-pool/selection-pool-store.v3940.js
ln-rank/js/feature/selection-pool/selection-pool-controller.v3940.js
ln-rank/js/feature/selection-pool/selection-pool-analysis.v3940.js
ln-rank/js/feature/selection-pool/path-analysis-api.v3940.js
ln-rank/css/selection-pool.v3940.css
functions/api/path-analysis.js
```

## 部署检查

```text
/ln-rank/VERSION.txt
/ln-rank/
/ln-rank/selection-pool.html
/api/major-bands?candidateScore=520
/api/path-analysis
```

`/api/path-analysis` 是 POST 接口，前端调用失败时会自动使用本地规则兜底，避免影响基础查询。
