# 专业升学地图 v0.02 · durable status

本文件是 `/major-path/` 的跨会话状态账本。它记录本科目录层级、研究生国家目录、本科→研究生导航、家长语义搜索和 v0.02 SVG 专业关系图的当前 ownership 与发布边界。

## Product job

v0.02 不是“专业百科”或“平替排行榜”。它帮助家长回答：

1. 高考实际报的是哪个本科专业；
2. 它在教育部 2026 本科目录里属于哪个门类、哪个专业类；
3. 同专业类还有哪些专业值得一起比较；
4. 哪些跨专业类专业与它共享已经验证的研究生升学导航；
5. 继续读研时先看哪些国家一级学科 / 专业学位类别；
6. 家长只知道“机械 / 电气 / 计算机 / 计科 / 测控”等口语时，先消歧再看关系。

页面不生成录取概率、考研成功率、课程相似度分数、就业等价结论或学校推荐。

## Canonical owners

### 本科专业事实

- `functions/_lib/kb/standard-major-catalog-2026-full.generated.js`
  - 标准全量目录：883 专业、92 专业类、13 门类；
  - verifier 的最终 hierarchy parity owner。
- `ln-rank/kb/major-understanding/major-catalog-2026.generated.js`
  - 既有浏览器 883 专业运行时格式；继续复用，不复制第二份浏览器专业库。
- `shared/resources/majors/major-catalog-contract.js`
  - `deriveMajorCatalogHierarchy()` 是 v0.02 新增的统一层级适配函数；
  - 将浏览器运行时行归一为 `disciplineCode / disciplineName / categoryCode / categoryName`；
  - verifier 必须逐专业与标准全量目录一致。
- `ln-rank/kb/major-understanding/admission-major-alias.generated.js`
  - 家长简称 owner。
- `ln-rank/js/knowledge/major-understanding-resolver.js`
  - 本科专业解释 owner。

### 研究生事实

- `shared/resources/graduate/graduate-catalog-2022.v001.js`
  - 国家研究生一级学科 / 专业学位类别 owner。
- `shared/resources/majors/undergrad-graduate-pathway.v001.js`
  - 本科→研究生升学导航 owner；不是教育部一一对应表。

### 家长语义搜索

- `shared/resources/majors/major-search-intent.v001.js`
  - “输入说法 → 规范候选 / 消歧状态” owner；
  - 不拥有专业事实，不得静默把模糊词改成一个具体专业。

### v0.02 专业关系图

- `shared/resources/majors/major-relationship-graph.v002.js`

这是纯投影 owner，只消费上述 canonical 数据。允许的关系类型：

- `same_undergraduate_major_class`：同一真实本科专业类；
- `shared_academic_navigation`：共享当前已验证的研究生一级学科导航；
- `shared_professional_navigation`：共享当前已验证的专业学位类别导航。

不存第二份专业名单，不建立课程库，不推断课程等价、就业等价或“自动平替”。

## 2026 本科层级：重要例外

教育部 2026 本科目录的总体口径仍是 **13 门类、92 专业类、883 专业**，但这不意味着每一个具体专业都必经三层。

标准全量目录中，交叉学科 `14` 门类下有专业的：

- `disciplineCode = 14`
- `categoryCode = ''`
- `categoryName = ''`

例如：

- `140001TK 未来机器人`
- `140012TK 具身智能`

因此这些专业的真实目录图是：

`交叉学科（14） → 具体本科专业`

而不是：

`交叉学科（14） → 1400 专业类 → 具体专业`

`1400` **不是 v0.02 可以根据六位专业代码前四位自行补造的专业类**。也不能沿用这些专业调整前的旧 `majorClass` 展示标签作为 2026 归属。

`deriveMajorCatalogHierarchy()` 负责消除这个旧运行时格式与 2026 标准目录之间的层级歧义。关系图、结果页、候选图和按门类浏览都必须消费这个归一结果。

## Research hierarchy boundary

国家《研究生教育学科专业目录（2022年）》统一到：

- 学科门类；
- 一级学科；
- 专业学位类别。

二级学科与专业领域由学位授予单位在授权权限内按规定自主设置与调整。

因此 v0.02 严禁伪造“全国统一二级学科树”。页面必须告诉家长：

- 国家目录层面可以稳定展示一级学科 / 专业学位类别；
- 某学校具体有哪些二级学科、研究方向、专业领域、考试科目和前置要求，要继续核验该校当年硕士招生专业目录和招生简章。

六位专业领域仍只在现行官方材料明确点名时展示，例如工程管理专业学位下已经有官方依据的 `125601/125602/125603/125604`。

## Relationship semantics

### 本科硬关系

常规专业：

`门类 → 专业类 → 具体专业`

交叉学科中专业类未单列的专业：

`门类 → 具体专业`

都使用本科目录实线关系。

### Graduate navigation

`本科专业 → 研究生一级学科 / 专业学位类别` 是升学理解导航，不是国家一一对应表。

### Neighbor relation

“相邻选择”只有两种证据来源：

1. 同一 canonical 本科专业类；
2. 共享 current canonical 升学导航中的一级学科 / 专业学位类别。

跨专业类节点进一步收紧：只有同本科门类，或至少共享两个研究生导航方向，才进入主图的跨类候选集合；UI 只展示有限高证据节点。

**相邻不等于平替。** 不得扩大为：

- 课程内容相同；
- 培养方案等价；
- 就业出口等价；
- 考研可以无条件互换；
- 分数不够时的自动替代推荐。

具体课程看学校培养方案；具体研究生可报范围看当年招生目录。

## Search-view contract

### 具体专业

例如 `计算机科学与技术`：

- Answer First；
- 本科目录位置；
- `专业关系图谱`；
- 默认“按本科目录看”；
- 可切换“看相邻选择与读研交叉”；
- 再展示学硕、专硕和权威来源。

例如 `具身智能`：

- 必须显示 `交叉学科 14 → 具身智能 140012TK`；
- 必须明确“专业类未单列”；
- SVG、结果元信息、按门类浏览均不得出现虚构 `1400` 专业类。

### 专业类 / 专业类简称

例如 `计算机类` / `计算机`：

- 不静默选择具体专业；
- 进入专业家族 SVG；
- 显示该 canonical 专业类下的具体专业；
- 点具体专业后进入同一个具体专业关系 owner。

### 宽泛关键词

例如 `测控`：

- 继续由 search-intent owner 消歧；
- SVG 先把候选放回各自真实专业类；
- 若候选属于专业类未单列的目录结构，则显示“门类直接到专业”；
- 不因 substring 或默认别名静默选一个具体专业。

### 唯一可靠简称

例如 `计科`：

- 可解析为 `计算机科学与技术 080901`；
- 必须保留“搜索识别说明”；
- 然后进入同一个 canonical 专业关系图。

## UI contract

当前入口：

- `major-path/index.html`
- `major-path/app.v002.js`
- `major-path/major-path.v001.css` — v0.01 稳定基础样式；
- `major-path/major-path-graph.v002.css` — v0.02 图谱增量样式。

图谱使用原生 SVG，不引入第三方自由脑图编辑器：

- 同一 DOM / 同一业务状态覆盖 PC / Pad / Android；
- 专业节点可点击，也支持 Enter / Space；
- 小屏由 `.graph-viewport` 自己横向滑动，document 不产生横向溢出；
- 图下保留结构化文字列表，SVG 不是唯一信息通道；
- 不做自由编辑、拖拽状态机或设备专属业务分支。

线条：

- 灰色实线：本科目录硬关系；
- 绿色实线：研究生升学导航；
- 蓝紫虚线：跨专业类升学交叉。

“有温度”只体现在家长语言，不扩大事实：

- “把它放回专业家族里看”；
- “这些专业适合一起比较”；
- “继续读研时哪些方向会重新汇合”；
- “相邻不等于平替”；
- “课程到底像不像，要继续看学校培养方案”。

## Verification owners

### `tools/verify-major-path-v002.mjs`

必须验证：

- 883 浏览器专业逐条对齐 `STANDARD_MAJOR_CATALOG_2026_FULL` hierarchy；
- 92 canonical 专业类、13 门类；
- 标准目录中 categoryCode 为空的 direct-discipline 专业保持为空；
- `140001TK` / `140012TK` 不出现 `1400`；
- 所有同类关系仍在同一 canonical categoryCode；
- 所有跨类关系都有共享研究生导航证据；
- 所有研究生目标存在于 canonical 2022 目录；
- 二级学科自主设置边界；
- `计算机类 / 计算机 / 机械 / 测控 / 计科` 搜索合同。

### `tools/browser-major-path-v002.mjs`

本地：PC / Pad / Android / Android compact。

真实旅程：

- 工程管理；
- 计算机科学与技术 + 图谱视角切换；
- 计算机类；
- 机械；
- 计科；
- 测控；
- 具身智能 / 交叉学科 direct-major；
- 管理学 → 管理科学与工程类浏览；
- document 无横向溢出，小屏 SVG viewport 自己滚动。

### `tools/browser-major-path-live-v002.mjs`

exact-head Preview / exact-main Production：PC / Pad / Android，同样包含交叉学科边界。

### `.github/workflows/verify-major-path-v001.yml`

历史文件名继续作为**单一活动 workflow owner**，内容名称已经升级为 `Verify major path v0.02`；不创建并行 v0.02 workflow。

Production durable status：`production/major-path-v0.02`。

## Release protocol

1. 最新 main 创建隔离分支；
2. Draft fresh source + local browser + exact-head Preview 全绿；
3. 冻结最终 head SHA；
4. Ready 不改变 SHA，再跑 fresh 第二轮；
5. `expected_head_sha` merge；
6. 合并后验证 main、push workflows、Cloudflare exact-main Production、`/major-path/` PC/Pad/Android、Pages/custom-domain resource graph 和 `production/major-path-v0.02` durable status。

v0.02 仍不修改 `ln-rank` 专业点击入口。未来接入只能复用上述 owners，不能复制本科目录、别名、搜索、研究生目录或关系图逻辑。
