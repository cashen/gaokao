# 专业升学地图 v0.02 · durable status

本文件是 `/major-path/` 独立页面、研究生国家目录 owner、本科→研究生升学导航 owner、家长语义搜索 owner，以及 v0.02 专业关系图 owner 的跨会话状态账本。

## Product job

帮助家长把专业放回完整教育结构里理解，而不是只读一个孤立词条：

1. 高考实际报考的 **本科专业**；
2. 它在教育部 2026 本科目录中的 **门类 → 专业类 → 具体专业** 位置；
3. 同专业类中还有哪些具体专业，哪些值得一起比较；
4. 研究生阶段可先看的 **一级学科（学术学位）** 与 **专业学位类别**；
5. 只有存在结构证据时，才提示跨专业类的升学方向交叉；
6. 对“机械 / 电气 / 计算机 / 计科 / 测控”等家长说法先消歧，再进入具体专业关系图。

v0.02 的新增价值不是“平替排行榜”，而是 **专业关系理解**：让家长看见一个专业属于哪个家族、周围有哪些近邻、继续读研可能在哪些国家目录方向重新汇合。

页面不生成录取概率、考研成功率、就业预测、课程相似度分数或学校推荐，也不把相邻专业写成无条件平替。

## Canonical owners

### Existing truth owners reused unchanged

- 本科专业目录：`ln-rank/kb/major-understanding/major-catalog-2026.generated.js`，883 个本科专业；不复制第二份本科目录。
- 本科招生别名：`ln-rank/kb/major-understanding/admission-major-alias.generated.js`；不在页面手写第二套简称表。
- 本科专业解释：`ln-rank/js/knowledge/major-understanding-resolver.js`；没有可靠解释时只展示国家目录身份，不补写未经验证的课程/就业事实。
- 家长语义搜索：`shared/resources/majors/major-search-intent.v001.js`；只负责“输入说法 → 规范候选/消歧状态”，不拥有专业事实。
- 研究生国家目录：`shared/resources/graduate/graduate-catalog-2022.v001.js`。
- 本科→研究生导航关系：`shared/resources/majors/undergrad-graduate-pathway.v001.js`。

### v0.02 relationship owner

- `shared/resources/majors/major-relationship-graph.v002.js`

它是 **纯投影 owner**，只消费现有 canonical 本科目录和现有本科→研究生导航：

- `same_undergraduate_major_class`：两个本科专业属于同一教育部本科专业类；
- `shared_academic_navigation`：两个本科专业共享当前已验证的研究生一级学科导航；
- `shared_professional_navigation`：两个本科专业共享当前已验证的专业学位类别导航。

它不存第二份专业名单、不新增课程库、不计算“专业相似度”、不推断就业等价关系。

页面当前执行入口：

- `major-path/index.html`
- `major-path/app.v002.js`
- `major-path/major-path.v001.css` — v0.01 稳定基础样式，继续作为稳定依赖；
- `major-path/major-path-graph.v002.css` — v0.02 图谱增量样式。

`app.v001.js` 与 v0.01 verifier 文件保留为历史证据，但不再由当前 HTML / 当前 workflow 作为活动页面运行时。

## Source policy and graduate second-level boundary

### Undergraduate hierarchy

本科 `门类 → 专业类 → 具体专业` 是教育部《普通高等学校本科专业目录（2026年）》中的国家目录硬关系。

因此 v0.02 可以完整、确定性地为全部 **13 门类 / 92 专业类 / 883 专业** 建立本科目录关系图，不需要人工写关系边。

### Graduate hierarchy

研究生国家目录继续以国务院学位委员会、教育部《研究生教育学科专业目录（2022年）》为 canonical owner，自 2023 年起实施。

关键边界：国家目录统一列出 **学科门类、一级学科和专业学位类别**。二级学科与专业领域，由学位授予单位按照有关规定在一级学科或专业学位类别学位授权权限内自主设置与调整。

因此 v0.02 **严禁伪造一棵“全国统一研究生二级学科树”**。页面必须告诉家长：

- 国家目录层面可以稳定展示一级学科 / 专业学位类别；
- 某学校具体有哪些二级学科、研究方向、专业领域、考试科目和前置要求，必须继续核验该招生单位当年的硕士招生专业目录和招生简章。

六位专业领域仍不做全量静态猜测。现有 v0.01 规则继续成立：仅在国家现行官方材料明确点名时展示，例如工程管理专业学位 `125601/125602/125603/125604`。

## Relationship semantics

### Hard relation

`本科门类 → 本科专业类 → 本科专业` 是国家目录层级，可以用实线展示。

### Graduate navigation

`本科专业 → 研究生一级学科 / 专业学位类别` 继续沿用 `undergrad-graduate-pathway.v001.js` 的升学导航语义，不是教育部发布的一一对应表。

### Neighbor relation

“相邻选择”只有两种允许来源：

1. 同一本科专业类；
2. 共享当前 canonical 升学导航中的一级学科 / 专业学位类别。

跨专业类节点进一步收紧：只有同本科门类，或至少共享多个研究生导航方向时，才进入主图的跨类候选集合；页面只显示排序靠前的有限节点，避免图谱膨胀。

**相邻不等于平替。** 关系边不得被解释为：

- 课程内容相同；
- 培养方案等价；
- 就业出口等价；
- 考研可无条件互换；
- 分数不足时的自动替代推荐。

具体课程必须看学校培养方案；具体研究生可报范围必须看当年招生目录。

## Search-view contract

同一个搜索框支持不同家长入口，但每种入口使用不同关系视角：

### 具体本科专业

例如 `计算机科学与技术`：

- Answer First；
- 本科目录位置；
- `专业关系图谱`；
- 默认“按本科目录看”：门类 → 专业类 → 当前专业 + 同类专业；
- 可切换“看相邻选择与读研交叉”：同专业类 / 共享研究生导航 / 有证据的跨专业类交叉；
- 最后继续展示学硕、专硕和权威来源。

### 正式专业类 / 专业类简称

例如 `计算机类` 或 `计算机`：

- 不静默选择某一个专业；
- 进入专业家族视角；
- SVG 展示本科门类 → 专业类 → 该类全部具体专业（图上可收束视觉节点，但下方候选保持完整）；
- 用户点具体专业后再进入该专业的关系图。

### 宽泛关键词

例如 `测控`：

- 继续使用 v0.01 消歧 owner；
- 如果候选横跨不同正式专业 / 专业类，SVG 先把“家长输入 → 候选所属专业类 → 具体专业”画出来；
- 不因为关键词或别名默认选择一个具体专业。

### 唯一可靠简称

例如 `计科`：

- 仍可解析为 `计算机科学与技术 080901`；
- 结果页必须保留“搜索识别说明”；
- 然后进入同一个 canonical 专业关系图，不建立简称专属逻辑。

## UI contract

继续沿用 major-path / tongxue 一致的低噪音视觉策略：白底、深蓝主色、青绿色反馈、圆角卡片和家长可读文案。

v0.02 图谱使用 **原生 SVG**，不引入第三方自由脑图编辑器：

- 图是只读关系表达，不建立第二份状态机；
- 专业节点可点击 / 键盘 Enter、Space 进入具体专业；
- PC / Pad / Android 复用同一 DOM 和业务状态；
- 小屏图谱由 `.graph-viewport` 自己横向滑动，页面本身不得产生横向溢出；
- 图下始终保留结构化文字列表，SVG 不是唯一信息通道；
- 不做自由拖拽编辑、不做设备专属业务分支。

线条语义：

- 实线灰：本科目录硬关系；
- 实线绿：研究生升学导航；
- 虚线蓝紫：跨专业类升学交叉。

## Parent-language contract

“有温度”不等于降低事实精度。v0.02 使用家长能理解的语言解释结构，例如：

- “把它放回专业家族里看”；
- “这些专业适合一起比较”；
- “如果你主要关心继续读研，可以看看哪些方向会重新汇合”；
- “相邻不等于平替”；
- “课程到底像不像，要继续看学校培养方案”。

任何温和提示都不能扩大证据范围。

## Verification

当前正式 owner：

- `tools/verify-major-path-v002.mjs`
  - 883 本科专业、184 研究生国家目录实体；
  - 13 门类、92 专业类、883 专业关系图全量覆盖；
  - 每一个同类关系必须仍在同一 canonical 专业类；
  - 每一个跨专业类关系必须存在共享研究生导航证据；
  - 所有研究生目标必须存在于 canonical 2022 目录；
  - 二级学科自主设置边界必须存在；
  - `计算机类 / 计算机 / 机械 / 测控 / 计科` 等搜索视角合同。
- `tools/browser-major-path-v002.mjs`
  - 本地 PC / Pad / Android / Android compact；
  - 工程管理、计算机科学与技术、计算机类、机械、计科、测控、按门类浏览；
  - SVG 节点、图谱视角切换、真实点击；
  - document 无横向溢出，小屏图谱 viewport 自己承担横向滑动。
- `tools/browser-major-path-live-v002.mjs`
  - exact-head Preview 与 exact-main Production 的 PC / Pad / Android 同类真实旅程。
- `.github/workflows/verify-major-path-v001.yml`
  - 历史文件名继续作为 **单一活动 workflow owner**，内容已升级到 `Verify major path v0.02`；不创建并行 v0.02 workflow。
  - Production durable status：`production/major-path-v0.02`。

## Release protocol

1. 基于最新 main 的隔离分支；
2. Draft fresh source + browser + exact-head Cloudflare Preview 全绿；
3. 冻结最终 head SHA；
4. Ready 不改变 SHA，再跑 fresh 第二轮；
5. 使用 `expected_head_sha` merge；
6. 合并后核验 main、push workflow、Cloudflare Production、`/major-path/` PC/Pad/Android 真实行为、Pages/custom-domain resource graph 和 `production/major-path-v0.02` durable status。

v0.02 仍不修改 `ln-rank` 专业点击入口。未来接入只能复用以上 owners，不能复制本科目录、别名、搜索意图、研究生目录或关系图逻辑。
