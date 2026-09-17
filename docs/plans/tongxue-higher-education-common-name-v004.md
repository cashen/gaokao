# Tongxue 高校民间称谓统一接入计划 v004

> 当前执行版本。v003 为上一版方案，v004 修正学校解析边界。

## 1. 修正原因
验证发现 `shared/resources/schools/school-identity-center.js` 不是完整的 2952 所学校名录，而是学校实体/校区/分校等边界中心。强制所有高校民间称谓成员都必须直接命中该中心，会把真实存在于教育部学校目录中的普通高校错误判为未解析。

因此本版本采用现有系统真实的双层职责：

- `school-identity-center.js`：特殊招生实体、分校、校区、母子实体边界；
- `tongxue/data/school-search-index.20260617-v150.json`：教育部 2026 学校目录的完整高校名录；
- `school-resource-center.js`：已经存在的统一资源入口，先复用 identity entity，未命中时使用教育部学校目录兜底，不新增 resolver。

## 2. 正确数据链
`第三方公开称谓线索 → 高校民间称谓定义 → 现有 school-resource-center / school-identity-center → Tongxue`

源站第三方标签不是 production truth；源站拆分的校区/分校/医学实体不直接改变最终称谓成员口径。

## 3. 第一批 8 个称谓
- 华东五校
- 国防七子
- 两电一邮
- 两财一贸
- 建筑老八校
- 机械四小龙
- 机械五虎
- 电力部老六校

每个称谓必须满足：
- 成员口径有公开资料交叉支持；
- 所有成员均能通过现有 school-resource-center 解析；
- 解析类型明确区分 `identity-center` 与 `education-ministry-directory`；
- 不把目录兜底伪装成实体中心命中。

## 4. Tongxue 实现
保留现有 `tongxue-runtime-result-view-v159.js` 兼容入口；原结果业务实现集中在 `tongxue-runtime-result-view-core-v159.js`，新入口只负责高校民间称谓薄展示。

学校结果头部显示：
`高校民间称谓 · 大家常说：XXX`

展开后：
- 非官方分类说明；
- 经核验的成员学校；
- 明确说明不参与录取、排名、推荐和专业强弱判断。

不新增标签墙、大型模块、第三方运行时请求、SP、router 或 Student Voice owner。

## 5. 跨模块准备
高校民间称谓本身不作为主键。跨模块主键仍是学校 identity/catalog 结果。

handoff payload 当前提供：
`commonNameId/commonName/commonNameType/canonicalSchoolName/candidateSchoolNames/candidateSchoolIds/sourceSurface/sourceAction/handoffContractVersion`

其中 `candidateSchoolIds` 只填当前已有的实体 ID；教育部目录兜底成员没有假造 ID，保留 `candidateSchoolNames` 供后续 ln-rank 使用现有学校查询能力解析。

## 6. 专业边界
本版本仍不建立“高校民间称谓→专业”关系。2026 辽宁物理类招生专业继续从既有 admissions 数据取得；专业强项只能来自独立证据层。不能因为“机械五虎”“电气四虎”等称谓自动推导专业。

## 7. 验收
- 8 个称谓全部 resolved；
- 重点名单准确；
- 至少一个称谓触发 education-ministry-directory 兜底；
- 非成员学校不展示；
- 校区/分校/医学实体不被错误并入；
- Tongxue 原学校/专业/Student Voice 回归通过；
- PC/Pad/Android/Alook 无横溢出、遮挡或 details 展开异常；
- PR exact head CI 全绿；
- Ready 前 Preview exact SHA；Ready 后同 SHA 二轮；merge 后 main/Production 闭环。

## 8. 版本纪律
资源 schema 当前升级为 v002；执行计划当前为 v004。后续任何事实、成员名单、解析规则或 UI 契约变化必须递增版本号，不覆写当前历史版本。
