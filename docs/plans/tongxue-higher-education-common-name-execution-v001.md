# Tongxue 高校民间称谓执行验收门 v001

本文件用于本次 PR 的实施与验收，不替代功能版本。

## 必查
1. 共享资源只能从 `school-identity-center.js` 解析 canonical school。
2. `tongxue-runtime-common-name-v001.js` 不访问源站，不重复 Student Voice owner，不建立新 router/SP。
3. 仅展示 8 个已核验高校民间称谓。
4. 校区、分校、医学实体不得因母校关系自动作为独立称谓成员显示。
5. 各称谓只承担学校群体叫法说明，不参与录取、排名、推荐、专业强弱和学生体验排序。
6. handoff payload 必须以 canonical school identity 为跨模块主键，下一阶段再接入现有 decision-context。
7. PC、Pad、Android、Alook 不出现横向溢出或交互遮挡。

## 当前事实边界
PR304 是第三方源站采集层；其 29 个标签、839 条学校关系和 `majorRelationCount=0` 不能直接转成“标签→专业事实”。本 PR 只使用经过交叉核验的 8 个称谓定义，并保留源站标签作为 provenance。

## 合并门槛
必须在 exact head SHA 上完成测试、Preview、Ready 二轮校验后再 merge；未完成任一项不得把 PR merged 视为任务完成。
