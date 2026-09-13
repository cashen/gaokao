# 模拟志愿纸面核对单 v002

## 基线

- repository: `cashen/gaokao`
- base main: `a5f213396ef4fdfecee3ad87587f15af9847509c`
- branch: `feat/simulation-report-v002-paper-check-sheet`
- source page: `/ln-rank/simulation-report.html`

## 目标

把现有模拟志愿填报单升级为“纸面核对单”，不提前建设招生人数、学费、校区等招生事实数据库。

本版本只增加“人工核对字段槽位”：字段标题固定，当前没有系统事实时字段值保持为空；用户可以在屏幕端手工填写并保存，也可以直接打印后手写核对。

同时重构 A4 打印分页：任意数量志愿自动分页；每页重复学生身份头和志愿列头；单个志愿不得跨页拆开。

## 明确不做

- 不新增招生计划数据源。
- 不新增学费数据源。
- 不新增校区数据源。
- 不新增招生章程解析。
- 不新增招生事实 API。
- 不复制学校实体。
- 不复制专业目录。
- 不修改历史最低分 API。
- 不修改位次算法。
- 不修改 `selection-pool`。
- 不使用 AI 推断缺失招生事实。

## 人工核对字段

每个志愿预留以下字段，默认空字符串：

- 院校代码
- 专业组/招生代码
- 校区
- 实际培养地点
- 学费
- 住宿费
- 2026 招生计划
- 学制
- 培养方式
- 选科要求
- 专业备注/特殊限制

这些字段属于用户自己的核对记录，不是系统招生事实。

## 数据结构边界

扩展现有每条 volunteer：

```js
manualCheck: {
  institutionCode: '',
  groupCode: '',
  campus: '',
  studyLocation: '',
  tuition: '',
  accommodationFee: '',
  planCount: '',
  studyLength: '',
  trainingMode: '',
  subjectRequirement: '',
  remark: ''
}
```

旧 `v001` 草稿必须兼容：缺失 `manualCheck` 自动补全为空对象；原学校、专业和历史数据保持不变。

存储仍使用现有 simulation report localStorage owner，不创建第二套草稿存储。

## UI

### 屏幕端

保留现有学校/专业输入、历史记录、添加/删除/上下移动/拖拽能力。

每行增加“报考信息”可展开区域，显示上述人工核对字段。空值显示为空输入框，不显示“待核实”。

移动端使用原生按钮/表单控件，避免新增依赖手势事务的导航机制。

### 打印端

A4 横向继续保留。

每个志愿使用“核心身份 + 人工核对 + 历史 + 家庭决策”结构：

1. 志愿序号、学校、专业代码/名称；
2. 院校代码、专业组/招生代码、校区、实际培养地点；
3. 学费、住宿费、2026招生计划、学制、培养方式；
4. 选科要求、专业备注/特殊限制；
5. 2026/2025/2024 历史与当前位次差；
6. 家庭判断与家庭备注。

空字段只保留字段名和足够手写的空白区域。

## 多页打印合同

打印 `thead` 必须同时包含：

- 标题
- 姓名
- 总分
- 参考位次
- 考试类型
- 志愿列头

因此浏览器自动分页时，每一页都保留完整学生身份和列头。

志愿项必须 `break-inside: avoid`，不得把同一志愿拆到两页。

志愿序号跨页连续，不重新编号。

不硬编码每页固定志愿数量，允许浏览器按实际内容自然分页。

## 验证

### 状态迁移

- 无旧草稿：生成一个空白志愿。
- v001 草稿：升级后学校/专业/历史保留，人工核对字段为空。
- 手工填写后刷新：人工核对字段保留。
- 清空重填：回到全空初始状态。

### 功能回归

- 新增志愿，最大 30 条。
- 删除志愿。
- 上移/下移。
- 拖拽排序。
- 学校 resolver。
- 专业代码解析。
- 历史记录读取。
- 总分参考位次读取。

### 打印边界

分别验证 1、5、10、20、30 条志愿。

每组确认：

- A4 landscape。
- 第二页开始均有学生姓名、总分、参考位次、考试类型。
- 每页都有志愿列表头。
- 志愿编号连续。
- 单志愿不跨页拆分。
- 空字段没有“待核实”文字。
- 手写空白足够。
- 长备注不会造成内容截断。

### 浏览器矩阵

- PC 1366px。
- Pad 820px。
- Android 390px。
- Android compact 360px。
- Windows Chrome 打印预览。
- Windows Edge 打印预览。
- 浏览器打印为 PDF。

### 发布门禁

- Node syntax。
- simulation report contract verifier。
- diff check。
- main tree integrity。
- canonical release。
- unified resource graph/runtime。
- exact-head Preview。
- exact-head browser journeys。
- merge 前不得修改 `main`。
- 合并后重新验证 main SHA、Pages、custom domain、API 和资源身份。

## 完成定义

只有在功能、状态迁移、打印分页、四视口、Windows Chrome/Edge 打印预览以及 release/tree/resource 门禁全部通过后，PR 才允许 Ready；使用 exact expected head SHA 合并 `main`。
