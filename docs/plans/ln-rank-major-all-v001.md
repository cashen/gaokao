# ln-rank major-all 专业优先查询 v001

## 0. 基线与目标

- 仓库：`cashen/gaokao`
- 基线：`main@0c1097d3c086658fce7813c7227a157c40ded412`
- 工作分支：`agent/ln-rank-major-all-v001`
- 目标能力：在现有 `score-bands`（按分数找学校和专业）与 `school-all`（按学校看在辽专业）之外，增加第三条平行查询线 `major-all`（按专业找学校）。
- 当前招生口径：辽宁 2026 年普通类本科批物理类投档记录；2024、2025 作为同口径历史参考。
- 一期明确不做：学校/专业横向对比、综合推荐分、录取概率、就业排名、多个专业横向对比（多专业查询并集属于本期范围）、趋势自动推荐。

## 1. 产品结果

三个平行选项卡使用同一查询工作台、同一家庭方案/自选池、同一导航与发布 owner：

1. 按分数：按分数找学校和专业。
2. 按学校：按学校看该校在辽专业。
3. 按专业：按专业找学校。

选项卡切换不建立第二套运行时，不丢失条件，不自动把实体识别变成筛选变更；提交由现有查询事务 owner 统一处理。

## 2. MAJ-00：可恢复架构合同

### 2.1 查询模式

```text
resultMode = score-bands | school-all | major-all
```

### 2.2 major-all 查询输入

单专业与多专业是同一查询线的两种合法范围，不拆成第二套查询器：

- **单专业**：确认一个 canonical 本科专业后查询；适用于“电气工程及其自动化有哪些学校”。
- **多专业**：支持多个已确认的 canonical 专业并集查询；适用于“机械、测控和材料有哪些学校”“沈航机械测控与材料多少分”。每个专业必须保留独立的 majorCode、匹配原因、年度趋势和招生记录身份，不能把多个专业拼成一个模糊关键词后得到错误的 0 条或混合趋势。
- **模糊输入**：先由现有 major resolver/catalog owner 生成候选；高置信简称/别名可以批量展示候选，用户确认后才执行。无法唯一确认、专业类/大类/试验班保持 needs-confirmation/fail-closed，不能静默替换成某个本科专业。
- **组合交互**：允许“先选机械，再追加测控，再移除机械，再提交”；允许用逗号、顿号、空格、“和/或”及连续输入表达多个方向；每次候选确认、删除、清空都只更新 draft，不自动覆盖已提交结果。
- **结果语义**：多专业默认按学校×专业×项目独立列出；跨专业概览只做记录数/年份/位次范围等口径化统计，不排序学校、不推荐专业、不做一期横向对比。

家长视角自然表达必须等价覆盖以下语义，而不是只支持固定句式：

- “不填分，先看看电气”；“570分想看电气”；“570分沈阳或大连的电气和自动化”；
- “机械、测控、材料，辽宁所有学校，从高到低”；“沈航机械测控与材料多少分”；
- “计算机/软件，普通项目”；“电气，去掉中外合作”；“只看中外/高收费”；
- “先查机械，再加测控”；“不要机械了，只保留测控”；“清空专业后回到待确认”；
- 专业代码、正式名称、简称、错别字、中文/英文混排、带括号项目名、重复词、空格/标点差异；
- “沈阳”“大连”“辽宁省内”“不限地区”与学校关键词的组合；分数缺失、0、负数、非数字、344/449/450/549/550/589/590/624/625/750 边界值；
- 普通项目、中外合作、高收费、校区/分校、试验班/专业类等需要明确身份或确认的表达。

```text
majorInput                 家长原始输入
majorCode                  确认后的 canonical 本科专业代码，唯一执行键
majorName                  确认后的 canonical 本科专业名
candidateState              unresolved | needs-confirmation | resolved
score                       可选；不填时允许专业优先全量查看
region                      可选；学校所在地，不等同招生省份
schoolKeyword               可选；沿用学校实体解析
projectMode                 all | ordinary-only | sino-only
bottomLineMode              沿用现有学校性质/费用边界
years                      [2026, 2025, 2024]
sort                       与参考位次、历史位次、学校名的稳定排序
```

### 2.3 保护边界

- 继续复用 2026 canonical major catalog、major-understanding resolver、既有 admissions truth、major-bands/school-majors 查询 owner、score-to-rank owner、selection workspace owner。
- 不复制专业目录、别名库、招生事实、分数转换、自选池、报告 payload、student voice 或 major-path 数据。
- 不修改 `/fenxi/`、`functions/fenxi/`、`functions/_middleware.js`。
- `functions/_lib/release-contract.js` 必须继续导出 `LN_RANK_RELEASE_CONTRACT` 与 `RELEASE_CONTRACT`。
- `major-all` 是 additive capability，不制造新的全站 release、第二套 runtime 或第二套状态机。

## 3. MAJ-01：专业模糊解析与确认

### 3.1 解析层级

- 正式名称/代码：直接确认。
- 高置信简称/别名：展示规范名称和代码后确认。
- 模糊方向词：展示候选，不静默替换。
- 专业类/大类/试验班：保持 class-level，不能直接查询成某个具体本科专业。
- 无法唯一映射：fail-closed，说明需要选择具体专业。

### 3.2 必测输入

`电气`、`机械`、`机械电子`、`测控`、`自动化`、`软件`、`计算机`、`师范`、`临床`、正式专业名、六位/带 T 代码、专业类、大类和试验班。

提交规则：未确认 canonical majorCode 时不能发起 major-all 招生查询。

## 4. MAJ-02：带分/不带分与地区

### 4.1 不带分

示例：`软件工程，辽宁有哪些学校`。

- 查询该 canonical major 在数据口径内的全部可核验招生记录。
- 默认按 2026 历史最低位次从前到后。
- 页面明确“历史招生记录”，不显示录取承诺语言。

### 4.2 带分

示例：`570 分，电气工程及其自动化`。

- 复用现有分数转位次与位次关系分组。
- 结果按“历史位置更靠前 / 与参考位次接近 / 历史位置更靠后”组织。
- 继续支持现有查看范围与家庭可接受学校性质/费用条件。
- 不生成概率、稳录、冲稳保或推荐分。

### 4.3 地区

- 默认“不限地区”。
- 可按学校所在地筛选沈阳、大连等地区。
- 当前招生省份仍固定为辽宁，不能将学校所在地和招生省份混淆。

## 5. MAJ-03：项目、校区和中外合作

`projectMode` 至少支持：

- 全部招生项目（默认，含中外合作，明确标签）；
- 仅普通项目；
- 仅中外合作/高收费项目。

每条记录保留独立身份：

- 学校实体；
- canonical major；
- 招生项目；
- 校区；
- 招生类型；
- 年份；
- sourceRecordId。

普通项目、中外合作、不同校区不能合并为一条记录。学费、校区、合作办学条件以当年招生计划和招生章程为最终依据。

## 6. MAJ-04：2024–2026 三年数据与趋势

### 6.1 对齐规则

三年记录只有在以下身份一致时才可直接对齐：

```text
学校实体 + canonical 本科专业 + 项目 + 校区 + 招生类型
```

缺失年度显示“该年度暂无同口径投档记录”，不补值、不猜测、不用其他项目代替。

### 6.2 单记录趋势

每条学校×专业×项目记录展示：

- 2026 最低分/最低位次；
- 2025 最低分/最低位次；
- 2024 最低分/最低位次；
- 位次变化；
- 分数变化；
- 数据是否完整；
- 项目口径是否发生变化。

趋势以位次为主、裸分为辅，使用“历史最低位次相对靠前/靠后”“变化较小”“波动较大”“数据不完整”等人类语言，不写“明年一定上涨”“越来越难”“稳录”。

### 6.3 专业概览趋势

在 major-all 结果顶部提供当前过滤口径下的概览：

- 每年有效招生记录数；
- 分数区间；
- 位次区间；
- 位次中位数；
- 普通/中外项目记录数。

所有统计展示样本量、年份和地区/项目口径，不把跨校汇总转成学校推荐结论。

## 7. MAJ-05：结果展示与现有能力复用

每条结果至少显示：

- 学校名称与所在地；
- canonical 专业名和代码；
- 项目/校区标签；
- 2026、2025、2024 分数和位次；
- 近三年趋势；
- 数据口径与更新时间；
- 学费、合作办学、招生章程复核提示。

结果动作必须复用现有 owner：

- 查看该校在辽全部专业；
- 了解这个专业（major-path）；
- 查看本科→研究生路径；
- 大学生怎么说（Tongxue major scope）；
- 加入家庭方案。

“大学生怎么说”必须与招生记录、专业资料、升学路径分区显示，并明确是跨学校个人体验，不代表当前学校培养结果，也不参与录取排序或推荐。

## 8. MAJ-06：家庭方案/自选池

- major-all 每条独立招生记录支持加入现有家庭方案。
- 复用现有 selection workspace/selection pool，不新增 major-only shortlist。
- 普通、中外、校区、项目作为独立 sourceRecord 加入。
- 加入操作幂等，重复点击不产生重复记录。
- score-bands、school-all、major-all 加入同一个方案，切换查询线不丢失。
- 记录携带学校实体、专业代码、项目、校区、年份、sourceRecordId、查询来源。
- 一期不实现对比，但保留未来从统一自选池生成对比的稳定身份。

## 9. MAJ-07：查询返回和性能合同

返回合同至少包含：

```text
mode
queryIdentity
majorIdentity
filters
years
records
trendSummary
totalCount
loadedCount
hasMore
nextOffset
coverage
dataMeta
```

要求：

- 服务端/构建期索引按 canonical majorCode、地区、项目和年份查询；
- 禁止浏览器扫描全量招生表；
- 禁止通过循环请求全部 score bucket 实现 major-all；
- 分页完整召回、去重、nextOffset 严格递增；
- sourceRecordId 稳定；
- 排序稳定；
- 空结果区分“无同口径记录”“条件过窄”“数据源暂不可用”；
- 不因一条记录缺失趋势而阻断整页其他记录。

## 10. MAJ-08：三终端交互

同一 DOM 语义、同一业务状态、同一查询 owner，仅由响应式布局改变。

### PC

- 三个选项卡等宽平行；
- 查询条件按可读宽度排列；
- 结果采用可读的招生记录行/分组，不制造超宽表格；
- 三年数据与趋势清楚可见。

### Pad

- 三个选项卡平行可点击；
- 查询条件可两列布局；
- 结果最多两列信息区；
- 趋势数据不依赖 hover；
- 不产生横向溢出。

### Android/compact

- 选项卡显示“按分数 / 按学校 / 按专业”；
- 触控目标至少 44px；
- 查询条件单列；
- 分数、地区、项目筛选适配键盘与拇指；
- 三年数据用三行紧凑结构，不隐藏在桌面 hover；
- 结果动作可见且不挤压；
- 键盘弹出、返回、焦点、滚动和安全区正确；
- 不抖动、不横向溢出、不建立 Android 专属业务分支。

目标尺寸：360×740、375×800、390/412 Android、Pad 竖屏/横屏、PC 1366/1440 宽屏。

## 11. MAJ-09：测试与验收

### 源码/合同

- canonical identity 与模糊解析；
- class-level fail-closed；
- 三模式状态和 URL/history；
- 项目/校区身份；
- 三年对齐和趋势；
- 自选池幂等；
- student voice/major-path 回链；
- protected paths 与 release exports。

### 数据/算法

- 全量专业候选召回；
- majorCode 结果与真实招生记录集合一致；
- 普通/中外/校区不误合并；
- 2024–2026 缺失值不补造；
- 分数/位次关系和排序；
- 分页耗尽、去重、nextOffset；
- 空结果和数据不可用状态。

### 浏览器

- major-only；
- major+score；
- major+region；
- major+score+region；
- 普通/中外切换；
- 三年趋势；
- 加入/重复加入/移除家庭方案；
- 跳转 major-path/Tongxue/学校全部专业并返回；
- score-bands 与 school-all 原有流程回归；
- PC/Pad/Android/compact、键盘和滚动。

## 12. MAJ-10：发布与断网恢复

每个子任务完成后，先提交、测试并将状态写回本文件和 `docs/status/ln-rank-major-all-v001-status.json`，不得先声称完成。

状态字段：

```json
{
  "task": "ln-rank-major-all-v001",
  "repository": "cashen/gaokao",
  "branch": "agent/ln-rank-major-all-v001",
  "baseSha": "0c1097d3c086658fce7813c7227a157c40ded412",
  "headSha": "",
  "pr": null,
  "completed": [],
  "inProgress": "MAJ-00",
  "pending": ["MAJ-01","MAJ-02","MAJ-03","MAJ-04","MAJ-05","MAJ-06","MAJ-07","MAJ-08","MAJ-09","MAJ-10"],
  "lastFailure": null,
  "verifiedAt": ""
}
```

网络中断恢复顺序：

1. 读取本状态文件；
2. 重新获取 main、分支、PR head、PR 状态；
3. 重新获取当前 head 的 Actions/checks；
4. 若写入结果不明确，按 exact SHA/title 搜索后再重试；
5. 从第一个未完成 MAJ 子任务继续；
6. 不重复成功 commit、测试、PR、merge 或部署。

最终闭环：

Draft PR 全量检查 → exact-head Preview → PC/Pad/Android 验证 → 冻结 final head → Ready（不改变 SHA）→ 同 SHA 第二轮检查 → `expected_head_sha` 合并 → 新 main/Actions/Pages/Production/真实流程核验。

