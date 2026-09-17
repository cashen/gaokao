# 模拟志愿 r155：学校—专业—三年历史与移动端 P0 修订计划

## 背景

当前 `simulation-report.html` 的实际运行时是 `ln-rank/js/simulation-runtime.js`。r154 已经完成统一接管，但本轮真实使用暴露出两个层面的 P0 问题：

1. 用户点击学校候选后，`confirmedSchool` 原先要等 Worker 异步 resolve 返回，导致 UI 在学校已经点选后仍可能显示“学校还没有确认”，专业入口被阻塞。
2. 专业状态把“用户正在搜索的专业文本”和“实际招生专业身份”混在一起，并以标准专业名称/标准专业代码作为主要匹配键。对同一标准专业下的普通项目与中外合作办学项目，会发生身份折叠。
3. 历史索引本身已经保存 2026/2025/2024 以及 `id / major / majorCode2026 / standardMajorCode`，所以本轮不重新造数据层，而是让运行时完整消费同一条招生记录。
4. 移动端原布局将桌面四列压缩成两列，并对历史区使用横向滚动；这不是家长端自然阅读方式，也容易在 Android 下形成横向溢出和点击区域错位。

## 本轮目标

### 1. 状态模型

每条志愿明确区分：

- `school`：用户输入/当前显示的学校。
- `confirmedSchool`：用户显式选择后的学校事实锚点。
- `majorQuery`：用户正在输入的搜索词。
- `majorName`：实际招生专业名称。
- `majorCode`：实际 2026 招生代码。
- `majorRecordId`：历史索引中的唯一招生记录 id。
- `standardMajorName / standardMajorCode`：标准专业身份，仅作参考，不再承担唯一招生身份。
- `history.years`：严格绑定 `majorRecordId` 的 2026/2025/2024 参考数据。

### 2. 学校选择

来自 2026 辽宁招生学校目录的候选必须在点击“选择”时立即同时写入 `school + confirmedSchool`。网络只负责搜索候选，不负责阻塞用户已经完成的显式选择。

入站参数仍允许走后台 resolve，但 resolve 不得成为普通点击后的必经路径。

### 3. 专业选择

专业候选只能来自 `/api/ai/major-history` 返回的、与当前 `confirmedSchool` 一致的实际招生记录；全国专业目录只允许作为输入理解层，不能作为当前学校的最终可选项目。

候选显示必须包含：

- 实际专业名称。
- 2026 招生代码。
- 项目类型（普通项目 / 中外合作等需核验提示）。
- 2026/2025/2024 有记录年数。

点击候选后直接绑定候选原始记录，不能再发起第二次模糊匹配。

### 4. 三年历史

必须以 `majorRecordId` 为首要身份键；同标准专业代码但不同 `majorCode2026` 的招生项目必须保持分离。

匹配到招生记录但某一年度没有数据时，显示“暂无对应投档记录”，不能再把“缺年度”表达成“没有严格记录”。

### 5. UI

每条志愿统一显示三个家庭可理解的步骤：

`1 学校 → 2 专业 → 3 三年历史`

避免内部工程语言作为主要状态文案。

移动端采用单列选择区、单列候选区、四格历史在小屏自动变成两列，禁止页面水平滚动。按钮最小触控高度保持 40px 以上，并处理安全区。

### 6. 架构

继续由 `simulation-runtime.js` 单一接管，不新增 `simulation-report-v0xx-*.js` 平行运行时。CSS 继续只有 `simulation-report.css` 一个页面 owner；PDF 继续由现有 service 按需调用。

## 验证矩阵

### 数据与状态

- 辽宁科技大学 + 冶金工程 → 普通项目 `05`，历史 497 / 494 / 473。
- 辽宁科技大学 + 冶金工程(中外合作办学) → 中外项目 `H1`，历史 427 / 448 / 437。
- 两者必须同时可见、可选、可持久化，不得合并成同一“冶金工程 / 080404”。

### 浏览器

- 390×844 Android mobile UA。
- 768×1024 Pad。
- 1280×900 Desktop。

每个视口检查：

- `documentElement.scrollWidth === clientWidth`。
- 学校显式选择后无需等待 resolve 即可进入专业输入。
- 专业候选来自学校实际记录。
- 选中专业后 `majorRecordId / majorCode / majorName / 三年历史` 同步落库。
- 切换普通项目/中外项目后历史随记录切换。
- 家庭处理仍可持久化、排序、reload。
- 无 page error。

### CI

canonical workflow `verify-simulation-workspace-v016.yml` 增加 r155 浏览器回归，且先跑既有 unified runtime / family note / PDF 回归，再跑本轮 P0 回归。

## 版本规则

本轮从 `simulation-workspace-v016.64 / v016.64-r154 / page v1.0` 提升为：

- workspace：`simulation-workspace-v016.65`
- runtime：`v016.65-r155`
- page：`模拟志愿 v1.1`
- revision：`r155-school-major-history-mobile`

后续任何继续修订都必须再次提升版本/修订号，不能复用 r155 结果作为最终证据。
