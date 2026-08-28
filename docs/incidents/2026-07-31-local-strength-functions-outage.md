# 2026-07-31 LocalStrength / Pages Functions P0

## 现象

- `/ln-rank/` 按分数查询返回 HTTP 503；
- `/ln-rank/` 按学校查询返回 HTTP 503；
- LocalStrength 翻页返回 HTTP 503；
- 故障影响多个 API 路由，按 Pages Functions 公共运行层事故处理。

## 临时处置

- 将 `main` 恢复到最后已知正常提交 `472b6121196c90aa3f97b831202b03b35e88cc3a`；
- 故障版本保存在 `incident/p0-v3971-functions-outage-20260731`；
- 关闭未合并的 LocalStrength UI PR，禁止重新引入故障运行时。

## 复盘结论

v3.9.71.0 将 LocalStrength 完整目录实现为生产请求中的全量投档数据扫描，并只在本地 Wrangler 环境验证。发布门禁没有在真实生产环境同时验证：

- `/api/ln-rank-runtime-health`；
- `/api/major-bands-health?probe=1`；
- `/api/major-bands` 分数查询；
- `/api/major-bands` 学校查询；
- `/api/local-strength` 连续分页。

因此，局部专项测试通过不能证明生产 Functions 公共运行层安全。

## 后续硬约束

1. LocalStrength 全量扫描改为构建期生成静态索引，不允许生产请求扫描全部投档分块；
2. 页面只读取静态派生数据或轻量分页数据；
3. 任何 Functions 路由变化必须验证全部关键 API 的真实生产响应；
4. 合并后必须确认 Pages 默认域名与自定义域名均返回 JSON 200，不能只验证静态 HTML 和资源版本；
5. 在生产验证通过前，不恢复 v3.9.71.x。
