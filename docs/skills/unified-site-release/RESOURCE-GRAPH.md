# 全站统一资源图与安全清理规范

当前发布身份保持唯一：

- 公开版本：`v3.9.72.5`
- 运行时代际：`v3972_5`
- 查询版本：`3972_5`
- 全站资源图：`site-resource-graph-v3972_5`
- UI 注册表：`ui-resource-registry-v3972_5`
- CSS 资源图：`css-resource-graph-v3972_5`
- 数据资源图：`data-resource-graph-v3972_5`
- 清理策略：`resource-decommission-v3972_5`
- 生产资源验证：`production-resource-graph-verification-v3972_5`

## 唯一治理入口

- 发布身份：`shared/resources/release/current-release.js`
- 全站资源注册表：`shared/resources/resource-registry.js`
- UI、CSS 与组件注册表：`shared/ui/ui-resource-registry.v3972_5.js`
- 活动运行图：`ln-rank/site-active-generation.v3972_5.json`
- 执行所有权：`shared/governance/resource-execution-contract.v3972_5.js`
- 缓存所有权：`shared/resources/release/runtime-cache-contract.v3972_5.js`
- 算法所有权：`shared/algorithms/algorithm-registry.js`
- 生产验证合同：`shared/governance/production-resource-verification-contract.v3972_5.js`

任何新资源必须先进入对应注册表，再被页面、Worker、报告或测试消费。页面或功能文件不得自行建立第二份当前资源清单。

## 资源分类

每个资源只能属于以下一类：

1. `active-generation`：当前运行时代际的入口、UI 事务、导航、缓存或编排所有者。
2. `stable-business-resource`：经过验证、继续复用的学校、专业、算法、历史证据或业务组件。
3. `stable-page-resource`：LocalStrength、211、Tongxue 等明确保留的成熟页面资源。
4. `stable-foundation`：设计 token、基础合同等低频稳定资源。
5. `retired`：不再被当前入口、稳定依赖、回退合同或门禁消费的资源。

旧版本号不自动等于 `retired`。稳定资源可以保留旧编号，但必须在当前资源图中明确登记用途和所有者。

## CSS 与 UI 规则

- 每个组件必须声明唯一 DOM 所有者和 CSS 所有者。
- 页面级 CSS 只能负责页面布局，不得重新拥有组件内部结构。
- 当前壳层、家庭方案入口和交互事务必须属于 `active-generation`。
- 旧 UI 注册表只能作为明确命名的稳定适配器，例如页面路由目录；不得继续宣称当前 UI、CSS 或组件所有权。
- 禁止通过设备型号建立第二套业务 CSS 或交互规则。

## 数据与算法规则

- 学校、地域、专业、位次、报告和背景证据必须使用注册表声明的唯一所有者。
- 数据生成器只能生成对应注册表声明的产物，不得同时维护第二份“活动清单”。
- 算法旧编号可以作为稳定算法继续使用，但必须由 `algorithm-registry.js` 唯一登记。
- AI 只解释已登记算法和事实，不得建立独立排序或录取概率规则。

## 安全删除合同

删除资源前必须同时满足：

1. 当前 HTML、JS、CSS、Worker、报告、注册表和生产门禁没有引用；
2. 不属于活动入口或明确保留的稳定依赖；
3. 不承担回退合同、缓存恢复、数据构建或生产验收职责；
4. 替代资源已经进入统一资源图；
5. 删除后源码审计、HTTP 404 断言、浏览器旅程和生产验证全部通过。

禁止按文件名版本大小批量删除。禁止为了目录整洁删除运行时需要的文件。

本次安全移除：

- `ln-rank/active-assets.json`
- `ln-rank/release-meta.json`
- `.github/workflows/write-v3969-active-metadata.yml`

原因：两份元数据均停留在 `v3.9.70.0 / v3970_0`，却使用“active/release”命名；旧工作流还可重新生成并提交它们。当前资源图、自测页和门禁已经替代其职责。

## 永久门禁

`tools/audit-unified-resource-graph-v3972_5.mjs` 和 `.github/workflows/verify-unified-resource-graph-v3972_5.yml` 必须验证：

- 发布身份与资源图版本同步；
- 当前 UI、CSS、数据和算法所有者存在且唯一；
- 活动资源与稳定资源分类明确；
- 组件 DOM/CSS 所有者完整；
- 已清理的旧活动元数据不能重新出现；
- 自修改元数据工作流不能恢复；
- 删除资源在本地 HTTP 图中返回 404；
- 保护目录未被修改。

`tools/verify-production-resource-graph-v3972_5.mjs` 和 `.github/workflows/verify-production-resource-graph-v3972_5.yml` 必须在 `main` push 后进一步验证：

- Pages 正式生产域名返回当前发布中心、统一资源注册表、UI 注册表、活动清单和自测资源；
- 正式自定义域名的版本化静态资源与 Pages 保持一致；
- `active-assets.json` 和 `release-meta.json` 在 Pages 正式生产环境返回 HTTP 404；
- 动态运行时健康接口继续匹配 `v3.9.72.5 / v3972_5`；
- 验证结果写入 commit status `production/resource-graph-v3972.5`，使生产结论可被连接器和后续治理读取；
- 正式域名 HTML 的 Cloudflare Managed Challenge 边界仍与静态资源发布合同分开处理。

任何资源治理变更必须在 Draft 和 Ready 状态下对同一 SHA 完成完整检查，全部成功后才允许合并到 `main`。合并后必须等到生产资源 commit status 成功后，才能宣告发布闭环完成。
