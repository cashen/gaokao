# Tongxue 高校民间称谓统一接入计划 v002

本版本替换 v001，作为当前执行版本。

## 核心原则
“高校民间称谓”只表示公开资料中形成的常见高校群体叫法，不是教育部门的官方分类。Tongxue 只展示经过公开资料交叉核验且能够解析到现有 canonical school identity 的称谓。

## 数据链
`第三方源站标签 → 高校民间称谓定义 → canonical school entity → Tongxue 展示`

PR304 的第三方标签关系只作为来源线索，不直接成为生产 truth。源站拆分的校区、分校、医学院等实体必须继续服从现有 school-identity-center 边界。

## 本阶段已落地
- 共享资源：`shared/resources/higher-education/higher-education-common-names.v001.js`
- Tongxue 薄包装展示：`tongxue/app/tongxue-runtime-common-name-v001.js`
- 首页 importmap 入口已切换到薄包装层；原 Student Voice result owner 不复制、不重写。
- 共享资源提供统一 handoff payload，供下一阶段 ln-rank 接入；本阶段不伪造 ln-rank 集合查询能力。
- 测试入口：`tools/tongxue/verify-higher-education-common-name-v001.mjs`

## 当前发布口径
第一批公开 8 个已交叉核验称谓：华东五校、国防七子、两电一邮、两财一贸、建筑老八校、机械四小龙、机械五虎、电力部老六校。

## UI 口径
学校结果头部只增加一条轻量信息：`高校民间称谓 · 大家常说：XXX`。展开后给出非官方说明和已核验学校成员；称谓不参与排序、录取判断、专业强弱判断或学生留言排序。

## 互通口径
跨模块真正主键仍为 canonical school identity。高校民间称谓仅作为描述上下文，handoff payload 提供 commonNameId/commonName/candidateSchoolIds 等字段，下一阶段正式纳入 decision-context。

## 版本纪律
v002 是本次修订的当前计划版本；后续任何修改必须新建更高版本号，不能覆写 v002。
