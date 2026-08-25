# 跨模块家庭决策链增强计划 v001

## 1. 目标

基于 main 当前的四条真实产品入口：

- `/ln-rank/`：分数、位次、地区、学校、专业、三年历史、自选方案；
- `/aiplus/`：家庭对话、事实研究、决策书、家庭档案；
- `/tongxue/`：学校体验和单专业学生公开体验；
- `/major-path/`：本科专业归属、相近专业和本科到研究生路径；

把现在“各模块功能已存在、但跨模块继续时需要家长重新组织问题”的体验，收敛为一条可恢复的家庭决策链。

核心原则：

1. Answer First：先展示真正回答，再展示工程状态和技术信息；
2. 只读交接：跨模块传递上下文，但不因打开链接而静默修改筛选、家庭条件或自选方案；
3. 实体识别不等于筛选变更：只有用户明确说“只看、筛选、保留、换成、收窄”等，才允许修改候选；
4. `/tongxue` 专业模式继续只查询一个具体专业；`/ln-rank` 的专业初选继续支持多个已确认专业；
5. 2026 为主事实，2025/2024 只作同口径历史对照；官方、投档历史、国家目录、专业路径和学生体验不能互相冒充；
6. PC、Pad、Android 的输入、滚动、返回、键盘和失败恢复必须一致；
7. 网络失败时保留输入、原结果和上下文，只重试当前动作，不重复提交或静默改变条件。

## 2. 明确不做

本 PR 不做：

- 全站视觉重构或重新设计导航；
- `/tongxue` 多专业学生体验；
- 录取概率、冲稳保、自动志愿排序；
- AI 自动修改 `/ln-rank` 筛选或家庭长期条件；
- 新建第二套专业目录、学校目录或来源抓取系统；
- 完整的二期比较工作台；
- 把学生留言写成学校官方结论；
- 把专业路径关系写成就业保证或学校培养方案。

## 3. 统一交接合同

新增只读的 `shared/decision-context/decision-context.v001.js`，作为四个入口之间的最小交接合同。

上下文必须可序列化、可裁剪、可校验，至少包含：

```text
contractVersion
contextId
sourceSurface
sourceAction
createdAt
returnTo
province
admissionYear
track
score
rank
regionKeys / regionLabel
school / schoolCode
major / majorCode
majorKeywords
projectMode
candidateIds
selectionSnapshot
pendingQuestions
evidenceRefs
```

合同要求：

- 只接受同源安全路径，不接受外域返回地址；
- 所有文本、数组、URL 参数有长度上限；
- `majorCode` 与标准专业名必须来自当前专业目录或现有结果；
- `score` 与 `rank` 不互相臆算；
- 只读上下文默认不写入家庭方案；
- 无法验证的字段丢弃并保留明确的“部分上下文”状态；
- 过期上下文可以继续查看，但必须显示创建时间和“返回原查询”；
- 同一 `contextId` 重复打开不得重复添加自选或重复发起请求。

## 4. 执行任务

### TX-00：计划、状态和恢复合同

交付：

- 本计划文件；
- `docs/status/cross-module-journey-context-v001-status.json`；
- PR body 的任务清单；
- 本地 `.codex/progress/cross-module-journey-context-v001.json`。

恢复规则：

1. 先读本地断点；
2. 再读远程 PR、分支 head、main head；
3. 再读当前 head 的 CI、Preview、Production；
4. 根据第一个未完成 TX 继续；
5. 任何写操作遇到超时都先按精确 SHA 搜索，不重复提交。

### TX-01：只读决策上下文与安全返回

交付：

- 新增上下文合同、编码/解码、校验和裁剪函数；
- 不改变现有 `localStorage` 自选池和 AIPLuS 家庭档案语义；
- 支持 URL、`history.state` 和跨页面返回；
- 支持 `ln-rank → major-path/tongxue/aiplus`；
- 支持 `tongxue/major-path → ln-rank`；
- 返回时恢复原页面的查询口径、结果模式和定位对象；
- 重复打开同一上下文保持幂等。

### TX-02：统一下一步动作

交付一个共享 action descriptor 合同，动作至少包括：

- `view_major_history`：回到/打开专业历史；
- `view_major_path`：打开专业升学地图；
- `view_student_voice`：打开同学你好；
- `add_to_family_plan`：仅在有完整招生记录时允许；
- `ask_family_advisor`：带只读上下文进入 AIPLuS；
- `return_to_source`：回到原查询位置。

规则：

- 每个卡片最多显示 4 个主要动作；
- 无法证明前置条件时不显示动作；
- 任何动作都显示目标模块和口径；
- 行为埋点不上传家庭对话；
- 不用 AI 重新排序动作，动作由确定性上下文和未解决问题决定。

接入：

- `ln-rank` 结果卡、学校全部专业、专业全部学校；
- `tongxue` 学校结果和单专业结果；
- `major-path` 专业主体和相关专业；
- `AIPLuS` 决策书、事实回答后的下一步。

### TX-03：查询口径、证据和边界文案

统一展示一个可折叠但默认可见的 query context strip：

```text
辽宁 · 2026 · 物理类 · 沈阳
机械工程 / 测控技术与仪器
普通项目 / 含中外 / 未填分数
```

交互要求：

- 临时查询显示“本轮只查，不修改家庭方案”；
- 已写入家庭条件显示“已写入家庭条件”；
- `tongxue` 显示“一次查看一个具体专业”；
- `ln-rank` 显示“当前支持多个已确认专业”；
- AIPLuS 显示本轮事实来源类型；
- 证据标签区分官方招生事实、历史投档、国家目录、专业路径、学生体验、待核实；
- 来源正文继续放在合适的详情层和 footer，不大面积复制。

### TX-04：多终端、加载、滚动、失败和恢复

覆盖：

- PC 1366；
- Pad 820 touch；
- Android 390 touch；
- compact Android 360 touch。

每个端验证：

- 输入焦点和键盘不丢失；
- 查询完成不抢滚动；
- 返回原查询恢复结果和定位；
- 失败保留输入和已显示结果；
- 重试只触发当前请求；
- 旧上下文不会覆盖新上下文；
- 无横向溢出；
- 多专业/单专业边界不混淆；
- AIPLuS 不把临时查询写入长期家庭条件。

### TX-05：静态、浏览器、CI、Preview、Production

静态测试：

- 上下文合同编码、解码、裁剪、安全路径、幂等；
- action descriptor 前置条件；
- 现有专业目录 883、专业类 92、学科门类 13 不回归；
- 学校、地区、学校×专业历史不回归；
- AIPLuS 多轮任务与历史档案不回归。

浏览器测试：

- `580 + 机械 + 沈阳` 从 `/ln-rank` 进入专业路径和同学体验，再返回原结果；
- `电气` 在 `/tongxue` 选择一个具体专业，再进入专业历史；
- AIPLuS 导入自选快照后只读显示，不改变原方案；
- AIPLuS 追问“只看沈阳”明确修改候选，“沈阳怎么样”不修改候选；
- 网络失败后重试和返回；
- PC/Pad/Android 无溢出和输入丢失。

发布门槛：

1. Draft PR；
2. 当前 head 所有 required checks 成功；
3. Preview 与当前 head SHA 一致；
4. 真实浏览器链路成功；
5. Ready；
6. 第二轮 required checks 全部成功；
7. expected head SHA 合并；
8. main SHA、Production、关键入口和最终状态文件核验。

## 5. 验收标准

- 家长从任一模块继续时，不需要重新解释刚才查询的学校、专业、分数和地区；
- 打开跨模块链接不会静默修改筛选、自选池或家庭长期条件；
- 任何结果都能看懂当前查询口径；
- 每个结果都有符合前置条件的下一步，但不堆满按钮；
- `tongxue` 单专业、`ln-rank` 多专业边界清楚；
- 来源和证据等级不混淆；
- 网络中断可从 PR/status/head/CI/部署恢复；
- 所有任务测试通过后才允许合并 main。
