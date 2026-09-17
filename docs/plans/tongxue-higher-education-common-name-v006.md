# Tongxue 高校民间称谓统一接入计划 v006

> 当前执行版本。v005 的职责边界已落实；本版本固定最终验收与 CI 证据口径。

## 1. 目标
将已经有公开资料交叉支持的“高校民间称谓”作为 Tongxue 学校理解层的只读关联信息接入，不把它当作官方高校分类，也不从称谓推导专业强项。

## 2. 数据职责
`school-identity-center.js` 负责特殊招生实体、校区、分校和母子实体边界；`tongxue/data/school-search-index.20260617-v150.json` 是项目现有的教育部 2026 学校名录；`school-resource-center.js` 是现有统一资源入口。

高校民间称谓资源只复用这个入口。运行时不会伪造普通高校的 entity ID；普通高校若没有特殊实体 ID，只保留已通过当前项目教育部目录名称核验的学校名，并明确标记为 `education-ministry-directory`。

## 3. 第一批 8 个称谓
- 华东五校
- 国防七子
- 两电一邮
- 两财一贸
- 建筑老八校
- 机械四小龙
- 机械五虎
- 电力部老六校

每个成员同时满足：公开资料交叉支持、当前项目教育部 2026 学校名录可确认、运行时名称解析得到非空学校记录。

## 4. Tongxue 接入
现有 `tongxue-runtime-result-view-v159.js` 继续作为兼容入口；真实结果业务集中在 `tongxue-runtime-result-view-core-v159.js`，不复制 Student Voice owner。

入口只做同步装饰：在既有结果函数 `renderResult` / `renderActiveReviews` 返回后，向学校结果头部插入一条原生 `details/summary`：
`高校民间称谓 · 大家常说：XXX`

展开后显示非官方说明和已经核验的成员学校。成员点击回到正常 Tongxue 学校查询。

不使用 MutationObserver、定时器、runtime fetch、新 SP、新 router、标签墙或排行榜。

## 5. 跨模块边界
高校民间称谓不是跨模块主键。handoff 仍以 canonical school identity/catalog 为准；只有当前已有实体 ID 才进入 `candidateSchoolIds`，普通目录成员只提供 `candidateSchoolNames`，绝不现场制造 ID。

后续 ln-rank 直接复用现有学校查询/选择能力，不在本 PR 创建“标签查询 API”。

## 6. 专业边界
本版本不建立“高校民间称谓→专业”关系。学校与 2026 招生专业、专业强项分别使用原有 admissions 与独立专业证据 owner。不能因为“机械五虎”“电气四虎”等称谓自动推导专业。

## 7. 验收
1. 8 个称谓全部 resolved。
2. 每个称谓的成员都存在于当前项目教育部 2026 学校名录。
3. 至少一个成员走 `education-ministry-directory` 解析类型。
4. 非成员学校不展示称谓。
5. 校区/分校/医学实体不会因母校名称自动合并。
6. 现有 Tongxue 学校、专业和 Student Voice 回归通过。
7. 兼容入口无 `MutationObserver`、无定时器、无 runtime fetch、无新增事件 owner。
8. PC / Pad / Android / Alook 不出现横向溢出、遮挡或 `details` 展开异常。
9. focused verifier、Tongxue live verifier、UEC/release/resource 相关 CI 均针对同一 exact head 有结果。
10. Ready 前取得 Cloudflare Preview exact SHA；Ready 后在同一 SHA 二轮检查；merge 使用 expected head SHA；随后验证新的 main、Cloudflare Pages Production 与 Tongxue/UEC 线上行为。

## 8. 版本纪律
高校民间称谓资源为 v003；兼容入口为 v003；本计划为 v006；focused verifier/workflow 将继续递增。后续任何事实、成员、解析或 UI 契约修改必须递增版本号，不覆写历史版本。
