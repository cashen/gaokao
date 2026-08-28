# PR193：全专业专业域统一 owner 与查询链路收口

## 这不是 PR192 的重做

PR #192 已被动关闭且未合并。它暴露了正确方向，但其单一“电气工程及其自动化”注册表不能进入主线；主线已经存在唯一的 shared/resources/majors/major-catalog-contract.js，其 2026 本科目录为 883 条记录。PR193 从最新 main 重新梳理，禁止引入第二套 shared/resources/major 目录。

## 真实产品意图

“电气工程及其自动化怎么样？”只是第一个 vertical-slice fixture，不是功能边界。相同运行时必须支持所有本科专业，包括但不限于：

- 电气工程及其自动化；
- 机械电子工程、机械类与机械相关简称；
- 测控技术与仪器、材料类、自动化；
- 会计学及其他文理工专业；
- 2026 本科目录中的全部正式专业、代码、专业类和已审核别名。

同一专业域必须覆盖以下问题：

1. 专业是什么、学什么、主要课程、毕业方向、适合谁、注意事项；
2. 学校 × 专业历史分数，支持多个专业并列查询，例如“沈航机械、电气、测控、材料多少分”；
3. 省内某专业所有学校的历史分数，按分数从高到低；
4. 默认包含中外合作办学，并能在后续“取消中外”时只改变筛选，不改变专业身份；
5. 精确专业不存在或简称有歧义时，给出候选确认，不静默替换成另一个专业。

## 唯一链路

用户问题 → Major Resolver → Canonical Major Owner → Major Knowledge → School-Major Relationship → Admission History → Student Experience → Human Answer

四个数据层必须保持独立：

- 专业知识只说明专业本身；
- 学校关系只说明学校是否开设、培养方向和关联；
- 招生层只说明分数、位次、年份、合作办学筛选；
- 学生体验只说明真实留言与校园感受。

AIPLuS、Tongxue、ln-rank 只能消费这些 owner，不能自己维护专业解释、别名、历史分数或第二套状态机。

## 本次首个提交

- major-domain-owner.v001.js 只编排主线已有的 canonical catalog，不复制目录数据；
- 支持单专业、多个专业、学校 × 专业、省内专业全校查询的统一 request shape；
- 对未解析、专业类、歧义简称 fail-closed；
- 四层 adapter 的返回状态独立，不因某一层不可用而伪造其他层；
- verify-major-domain-owner-v001.mjs 对全量目录 code 解析、典型专业、多专业、省内筛选和层间隔离做确定性验证。

## 后续必须完成才能转 Ready

- 把现有 school-majors.js、major-bands.js、AIPLuS school_history/school_major_history 接到此 owner；
- 用真实 883 条目录和已审核别名覆盖机械、测控、材料、会计及全部专业，不按专业写特殊分支；
- 真实数据验证：全量真集 = 召回集；学校 × 多专业无漏项；省内全学校分页无漏无重、nextOffset 严格递增；中外合作筛选可追问；
- PC / Pad / Android 四端人类问法与布局验证；
- 保持 /fenxi/、functions/fenxi/、functions/_middleware.js 不变，并保持 release-contract.js 双 export；
- only after exact-head Preview、Ready 同 SHA 第二轮、Production exact-main 验证才允许合并。

## 明确非目标

不修改录取算法、位次口径、学校事实源、学生评价源，不引入第二套 AI runtime，不把目录数据扩展成未经来源核验的专业百科。
