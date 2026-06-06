# v3.9.7.6-ln-rank-report-api-and-copy-cleanup

本版只围绕 ln-rank 做统一收口，不包含 /fenxi。

## 本版重点

1. 飞书报告接口错误可诊断化
   - 普通区间报告：`/api/feishu-create-report`
   - 自选池报告：`/api/feishu-create-selection-pool-report`
   - 前端遇到 HTML 非 JSON 时，会显示请求路径、HTTP 状态、返回片段，方便判断是否 Functions 未部署或路径未命中。

2. 新增飞书报告健康检查接口
   - `/api/feishu-report-health`
   - 用于确认 Functions 路由可用、飞书必要变量是否存在。

3. 筛选条件下飞书报告收口
   - 当前区间报告 payload 带上 `region`、`schoolKeyword`、`majorKeyword`、`bottomLineMode`、`keywordQuery`。
   - 后端报告生成使用与查询页一致的多关键词、项目属性、行业路径、公办底线和专业代码映射逻辑。

4. 家长友好文案统一
   - `上探参考` → `稍高目标`
   - `主体参考` → `重点匹配`
   - `稳妥参考` → `稳妥补充`
   - `标准` → `正常查看`
   - `放宽` → `多看一些`
   - `保守` → `稳妥一点`

5. 报告文案同步
   - 飞书区间报告中同步使用 `稍高目标 / 重点匹配 / 稳妥补充`。
   - 报告保留筛选条件、查看范围、关键词识别、匹配统计和专业代码。

## 不改内容

- 不动 `/fenxi`
- 不包含 `functions/fenxi`
- 不包含 `functions/_middleware.js`
- 不改公办底线显示边界
- 不改自选池主流程
- 不改专业代码映射主逻辑
