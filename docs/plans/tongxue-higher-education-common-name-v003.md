# Tongxue 高校民间称谓统一接入计划 v003

> 当前执行版本。v002 已被本版本替代；后续修订必须继续递增版本号。

## 一、目标
将经过公开资料交叉核验的“高校民间称谓”作为 Tongxue 学校理解层的只读关联信息接入，不把它当作官方高校分类，也不从称谓推导专业强项。

## 二、唯一数据链
`第三方公开称谓线索 → 高校民间称谓标准定义 → school-identity-center canonical school entity → Tongxue 展示`

第三方源站 PR304 只保留为 provenance。其原始标签关系不是 production truth；特别是源站可能把校区、分校、医学院作为独立实体，本资源必须经过现有学校身份中心解析后才允许展示。

## 三、已核验首批称谓
- 华东五校
- 国防七子
- 两电一邮
- 两财一贸
- 建筑老八校
- 机械四小龙
- 机械五虎
- 电力部老六校

只有成员名单和公共来源均能交叉核验、并且所有成员都能解析到 canonical school entity 的称谓才进入 Tongxue。

## 四、Tongxue 实现
现有 `tongxue/app/tongxue-runtime-result-view-v159.js` 保持为兼容入口；原 393 行实现移动为 `tongxue-runtime-result-view-core-v159.js`，保证整个结果渲染只有一个业务 owner。

兼容入口增加薄层：
- 读取共享高校民间称谓资源；
- 在已确认的学校结果中显示 `高校民间称谓 · 大家常说：XXX`；
- 采用原生 `details/summary` 展开，不新增大卡片；
- 展开时显示非官方说明和标准成员学校；
- 成员点击回到 Tongxue 的具体学校查询；
- 不访问神人高校源站，不新增 runtime SP/API，不复制 Student Voice owner。

UI 禁止：标签墙、排行榜、把称谓当官方等级、把称谓推导为专业强项。

## 五、跨模块原则
高校民间称谓不是跨模块主键。跨模块仍使用 canonical school identity。

共享资源提供 handoff payload：
- `commonNameId`
- `commonName`
- `commonNameType`
- `canonicalSchoolId`
- `canonicalSchoolName`
- `candidateSchoolIds`
- `candidateSchoolNames`
- `sourceSurface=tongxue`
- `sourceAction=view_common_name_schools`
- `handoffContractVersion=higher-education-common-name-handoff-v001`

本阶段只固定数据边界；正式的 ln-rank 集合查询行为放在后续计划，不在这里制造假的 URL/API。

## 六、专业边界
“高校民间称谓 → 学校”与“学校 → 2026招生专业”是两条不同证据链。

不得出现：
- “机械五虎 → 机械专业”这种标签反推；
- “电气四虎 → 电气工程及其自动化”这种标签反推；
- Student Voice 作为官方专业事实；
- 称谓参与招生排序、录取概率、推荐分数或专业强弱评分。

## 七、版本与发布
本功能的实现资源保持 v001 schema identity；本执行计划迭代至 v003。正式进入生产发布时必须同步提升站点 release identity，不使用“代码已经合并”作为完成标志。

## 八、验收矩阵
1. `上海交通大学` 能显示“华东五校”等已核验称谓。
2. `清华大学` 能显示“机械五虎”“建筑老八校”等已核验称谓。
3. 非成员学校不显示称谓。
4. 未核验称谓不显示。
5. 校区/分校/医学实体不会因母校称谓自动错误合并。
6. 学校查询、学校语音/学生留言、专业查询不回归。
7. PC / Pad / Android / Alook 不出现横向溢出、覆盖、展开失效。
8. focused verifier 全绿；现有 Tongxue/UEC owner 审计全绿。
9. PR Ready 前必须取得 exact Preview SHA；Ready 后必须在同一 SHA 再跑第二轮。
10. merge 必须使用 expected head SHA，并在新 main 与 Production 上验证。
