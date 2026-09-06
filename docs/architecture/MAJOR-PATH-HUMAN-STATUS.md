# 专业升学地图 v0.06 · human-first durable status

本文件记录 `/major-path/` v0.06 的人类信息架构、presentation ownership 与 viewport contract。它不替代 `MAJOR-PATH-STATUS.md` 的专业事实/关系图 truth，也不替代 `MAJOR-PATH-HANDOFF-STATUS.md` 的 ln-rank 跨页返回合同。

## Product job

v0.05 解决的不是“增加更多专业知识”，而是把现有可靠事实按家长的思考顺序呈现：

`这个专业是什么 → 本科属于哪里 → 如果读研先看哪些方向 → 还可以比较哪些专业 → 为什么这样说 / 官方依据`

从 `/ln-rank/` 已经看到具体专业后，Direct Mode 不再停在 major-path 页面头部或整个结果容器顶部，而直接落到：

`本科到读研，先看这条线`

并在同一首屏尽量看到本科目录位置与读研方向。

## Preserved truth owners

v0.06 不新建专业事实、研究生事实、搜索、关系图或 handoff 状态：

- 本科专业事实 / 搜索解释：继续复用 major-path 的 canonical owners；
- 本科→研究生导航：`undergrad-graduate-pathway.v001.js`；
- SVG 关系图：`major-relationship-graph.v002.js`；
- ln-rank 具体专业 gate / return snapshot：继续使用 `major-path-handoff.v003.js`；
- URL / same-origin return：使用 `major-path-navigation.v004.js`，并显式记录来源与返回状态。

## Runtime boundary

活动页面入口：

- `major-path/index.html`
- `major-path/app.v006.js`
- `major-path/major-path-human.v006.css`

稳定事实/搜索/图谱 core runtime：

- `major-path/app-core.v006.js`

历史 `major-path/app.v003.js` 与 `major-path-direct.v003.css` 不再由页面加载。v0.06 直接 import v0.06 core，不形成 wrapper chain。

Visible product identity：`major-path-v0.06`。
Stable core identity：`major-path-core-v0.06`。
Cross-page handoff identity：`major-path-handoff-v0.03`。
Human presentation identity：`major-path-human-v0.06`。

## Presentation / viewport ownership

v0.06 core runtime 继续负责事实、搜索语义、SVG 与 raw result HTML；v0.06 human shell 负责把 raw result 转成人类信息顺序，并拥有最终可见 landing。

### Core-ready boundary

v0.05 core runtime 通过动态 import 启动。`DOMContentLoaded` 之后、core handler 注册之前，用户仍可能已经按 Enter 或点示例。v0.05 只在这个短启动窗口保存**最后一次用户提交动作**：

- 不复制搜索算法；
- 不预判专业；
- core ready 后仍通过既有 `form.requestSubmit()` / 既有示例按钮把动作交回 v0.02 canonical search；
- 不建立第二 query runtime。

`data-major-path-core-ready` 只用于 boot readiness / proof，不是业务 truth source。

### Raw-result presentation boundary

页面内相关专业、消歧后选中具体专业等动作，由 v0.02 先同步生成新的 raw result。v0.05 不依赖已经被 `innerHTML` 替换后失效的旧 `event.target`；它只检查**当前 result 是否存在具体专业结果且还没有 `[data-major-pathway-focus]`**：

- raw result → humanize 一次；
- 已 humanize result → 幂等，不重复重排；
- 图谱 tab / details 展开不被误判成新专业结果。

这避免 observer、timeout 与事件目标竞态。

### Visible viewport transaction

v0.05 core runtime 不拥有 viewport 滚动；v0.05 human shell 决定最终可见位置：

- **Direct Mode**：在 raw result 阶段临时隐藏 `#result`，core 完成事实渲染后 humanize，恢复结果，等待稳定帧，再只执行一次最终 `window.scrollTo()` 到 `[data-major-pathway-focus]`；
- **standalone 搜索 / 页面内相关专业**：先隐藏结果，完成 humanize 后等待稳定帧，再只提交一次最终 `window.scrollTo()` 到当前结果标题；
- **换个专业**：回到搜索 hero。

因此用户看到的是 v0.05 的最终 landing policy，而不是两个滚动 owner 先后拉扯页面。

不使用 `MutationObserver`、`setTimeout` scroll chain、第二个 `scrollIntoView()`、local/session storage 或 Android/Pad 专属业务分支。

## Human information architecture

具体专业结果默认顺序：

1. 专业名称 + 一句话；
2. `本科到读研，先看这条线`；
   - 本科属于哪里；
   - 学硕方向；
   - 专硕方向；
3. 默认折叠：`还想看看和它相关的专业？`；
4. 默认折叠：`为什么这里只写“可以先看”，不是固定对应？`；
5. 官方依据位于第二个折叠层内。

SVG 保留但不再抢在读研答案之前出现。

## Language contract

用户主流程优先使用家长语言，正式教育概念作为解释而不是门槛：

- `一级学科` → `学硕方向`卡中标注“国家目录：一级学科”；
- `专业学位类别` → `专硕方向`卡中标注“国家目录：专业学位类别”；
- `本科目录硬关系` → `本科属于哪里`；
- `研究生升学导航` → `读研可以先看`；
- `跨专业类升学交叉` → `跨专业也可能衔接`。

以下工程/自证式表达不得出现在默认可见主流程：

- “系统已经确认”；
- “本科目录硬关系”；
- “研究生升学导航”；
- “跨专业类升学交叉”；
- “暂无证据足够强的跨类节点”；
- “不补造1400专业类”；
- “关系边界”。

事实边界不删除，只进入用户主动展开的依据层或以家长语言呈现。交叉学科必须明确“直接列在交叉学科门类下，专业类未单列”；合法本科代码如 `140012TK` 必须保留，同时不得制造 `1400专业类`。

## Direct Mode

从 ln-rank 进入：

- search hero 隐藏；
- browse / 全页 truth note 隐藏；
- 顶部只保留轻量 sticky 返回动作；
- 来源说明压缩为 1–2 行；
- 中外合作等招生后缀继续明确“本页讲专业本体，学费/校区/合作项目回招生记录确认”；
- 不出现“系统确认”“规范本科专业”等内部语言；
- 返回仍优先原生 history/BFCache，硬重载继续使用 v0.03 resume contract；
- 从相关专业继续展开时，来源提示切为“从刚才的专业继续看”，不得把新专业冒充成原招生记录。

## Required proof

Source：

- `tools/verify-major-path-v002.mjs`：保留 883/92/13、交叉学科、研究生路径和关系真值；
- `tools/verify-major-path-human-v005.mjs`：活动入口、core-ready queue、raw-result presentation、viewport owner、human copy 与 handoff boundary。

Browser：

- `tools/browser-major-path-human-v005.mjs`：PC / Pad / Android / Android compact；
- `tools/browser-major-path-human-live-v005.mjs`：exact-head Preview / exact-main Production 的 PC / Pad / Android。

必须验证：

- ln-rank score / school concrete-major direct entry；
- 专业类仍 fail closed；
- 用户在 core 尚未 ready 时快速 Enter 不丢查询；
- Direct Mode pathway target 位于首屏稳定区域；
- result header 在 pathway target 上方，不能把“页面顶部”冒充精准落点；
- 读研 section 进入 Direct Mode 第一 viewport；
- 页面内相关专业点击生成新专业后重新 humanize，且来源语义切成 continuation；
- standalone 搜索与 related-major 最终落到当前结果标题，不保留 legacy smooth 抖动；
- 相关专业 / 科学边界默认折叠；
- 展开关系图仍可交互，SVG 不是唯一信息通道；
- 工程化术语不出现在默认可见主流程；
- `140012TK` 合法专业代码可见，但不得出现 `1400专业类`；
- 中外合作项目边界不丢；
- 返回原 ln-rank 正常；
- document 无横向溢出。

## Release protocol

最新 main → isolated branch → Draft fresh source/browser → exact-head Preview → freeze SHA → Ready same SHA fresh checks → expected_head_sha merge → main push → exact-main Production → Pages/custom-domain resource graph → durable production status。
