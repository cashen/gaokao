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
- 称谓定义：新增 `shared/resources/higher-education/higher-education-common-names.v001.js`
- canonical school：现有 `school-identity-center.js`
- Tongxue presentation：现有 `tongxue/app/tongxue-runtime-result-view-v159.js`
- 跨模块导航：现有 decision context；本阶段只定义上下文载荷，不复制结果状态、不新增 router
- Release：现有 `shared/resources/release/current-release.js`

## Tongxue UI
学校结果标题下方、现有 meta 信息区域内增加轻量一行：

`大家常说：华东五校`

旁边提供轻量说明入口，不增加标签墙，不新增大型卡片。

点击称谓打开轻量集合内容：
- 称谓名称
- “这是大家常用的高校叫法，不是教育部门的官方分类。”
- 已核验的 canonical school 成员
- 唯一主要动作：`看看这些学校在辽宁能报哪些专业`

集合页面不复制 admissions 数据；只将 canonical school ids 交给现有 ln-rank 能力。

## ln-rank 互通预留
本阶段不新建 `tag-query API`。

现有 decision context 后续承载：
- `commonNameId`
- `commonName`
- `candidateSchoolIds`
- `sourceSurface=tongxue`
- `sourceAction=view_common_name_schools`
- `returnTo`
- `province/admissionYear/track`

真正跨模块主键仍为 canonical school identity，而不是高校民间称谓。

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
- 点击称谓可进入集合并向 ln-rank 传 canonical school identity；返回 Tongxue 能恢复来源上下文。
- 任何称谓文本都不会进入 admissions ranking、recommendation score 或 Student Voice evidence ranking。

## 发布门槛
计划、资源、实现、测试必须形成一个最小 PR；每次修订必须同步更新版本号。必须经过 Draft → exact Preview → Ready same SHA → 二轮检查 → merge → main/Production 验证，不能以 PR merged 作为完成标志。
