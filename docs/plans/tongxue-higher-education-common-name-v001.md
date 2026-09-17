# Tongxue 高校民间称谓统一接入计划 v001

## 目标
将“高校民间称谓”作为学校理解层的只读关联信息接入 Tongxue；不把它当作教育部门官方分类，不从称谓推导专业强项，不新增独立标签查询 SP/API。

## 当前基线
- main: `b9d15d201142ff0ceb05399c8888bf7b00654861`
- PR304: 源站采集 29 个标签、839 条标签→学校关系；PR304 自身标签→专业直接关系为 0。
- 学校身份 owner：`shared/resources/schools/school-identity-center.js`
- Student Voice owner：现有 UEC/Student Voice gateway；Tongxue 不直接读取源站标签接口。
- 跨模块上下文 owner：`shared/decision-context/decision-context.v001.js`

## 数据语义
用户显示名统一为：**高校民间称谓**。

说明文案统一为：
> 这是大家常用的高校叫法，不是教育部门的官方分类。

数据必须拆成：

`source label → common-name definition → canonical school entities`

源站 school entity 与 canonical school entity 永不直接等价；分校、校区、医学院等实体必须按照现有 school identity center 的边界处理。

## 第一批只开放已交叉核验的称谓
1. 华东五校
2. 国防七子
3. 两电一邮
4. 两财一贸
5. 建筑老八校
6. 机械四小龙
7. 机械五虎
8. 电力部老六校

未完成成员口径核验的其余源站标签保持 `unresolved/not-published`，不得为了覆盖率进入 Tongxue UI。

## Owner
- 称谓定义：`shared/resources/higher-education/higher-education-common-names.v001.js`
- canonical school：现有 `school-identity-center.js`
- Tongxue presentation：薄包装层 `tongxue/app/tongxue-runtime-common-name-v001.js`，不改原 Student Voice result owner
- 跨模块导航：现有 decision context；本阶段输出 handoff payload，不复制结果状态、不新增 router
- Release：现有 release identity；本阶段不提升全站 runtime generation，避免无关资源同步升级

## Tongxue UI
学校结果标题后的 meta 信息区增加轻量一行：

`大家常说：华东五校`

旁边提供可展开说明，不增加标签墙，不新增大型卡片。

展开内容：
- 称谓名称
- “这是大家常用的高校叫法，不是教育部门的官方分类。”
- 已核验的 canonical school 成员
- 明确说明它不参与录取、排名或专业强弱判断

成员点击只返回 Tongxue 对应学校实体；不伪造尚未实现的 ln-rank 集合查询。

## ln-rank 互通预留
本阶段不新建 `tag-query API`，也不改变现有 decision-context.v001 的字段白名单。

共享资源提供：
- `commonNameId`
- `commonName`
- `commonNameType`
- `candidateSchoolIds`
- `candidateSchoolNames`
- `sourceSurface=tongxue`
- `sourceAction=view_common_name_schools`
- `handoffContractVersion=higher-education-common-name-handoff-v001`

第 2 个计划再把该 payload 正式接入 ln-rank 的 decision-context 导航，不在本 PR 中以伪 URL 方式冒充已完成能力。

## 专业边界
严禁：
- 由“机械五虎”自动推出机械类专业强项；
- 由“电气四虎”自动推出电气工程及其自动化；
- 由称谓成员数量推断学校层次；
- 把 2026 辽宁招生专业改写成“学校全部本科专业”；
- 把学生体验或第三方称谓作为官方事实。

2026 招生专业继续由现有 admissions owner 提供；专业强项继续由独立 evidence 层提供。

## 验收
- 现有学校查询、学生留言、专业查询不回归。
- PC/Pad/Android/Alook 不出现遮挡、横溢出、锚点异常。
- 无新的 source registry、school resolver、major catalog、router、SP。
- 源站新增/删除/拆分实体不会直接改变 Tongxue 已发布 canonical 成员。
- 未核验称谓不显示。
- 同一学校最多展示 3 个已核验称谓。
- 学校实体为校区/分校/医学独立实体时，不因母校称谓自动合并。
- handoff payload 以 canonical school identity 为主键，不以民间称谓作为跨模块主键。
- 任何称谓文本都不会进入 admissions ranking、recommendation score 或 Student Voice evidence ranking。

## 发布门槛
计划、资源、实现、测试必须形成一个最小 PR；每次修订必须同步更新版本号。必须经过 Draft → exact Preview → Ready same SHA → 二轮检查 → merge → main/Production 验证，不能以 PR merged 作为完成标志。
