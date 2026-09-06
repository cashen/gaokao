# 专业升学地图 v0.06 · durable status

本文件是 `/major-path/` 当前总入口账本。v0.06 收敛来源、返回、上下文隔离、presentation / viewport / 搜索交互；专业事实、搜索、研究生导航和 SVG 关系图仍由同一组 canonical owners 提供。

## Product job

家长需要连续回答：

1. 高考报的具体本科专业是什么；
2. 它在教育部 2026 本科目录里属于哪里；
3. 如果以后读研，可以先了解哪些学硕/专硕国家目录方向；
4. 还可以和哪些专业一起比较；
5. 为什么这里只写“可以先看”，以及官方依据是什么。

v0.05 的默认信息顺序是：

`专业是什么 → 本科属于哪里 → 读研先看什么 → 相关专业（折叠）→ 目录边界/官方依据（折叠）`

从 ln-rank 进入时直接落到“本科到读研，先看这条线”。

## Canonical truth owners

### 本科专业

- `functions/_lib/kb/standard-major-catalog-2026-full.generated.js`
  - canonical full truth：883 专业、92 专业类、13 门类；
- `ln-rank/kb/major-understanding/major-catalog-2026.generated.js`
  - 浏览器 883 专业稳定运行时格式；
- `shared/resources/majors/major-catalog-contract.js`
  - `deriveMajorCatalogHierarchy()` 统一目录层级；
- `ln-rank/kb/major-understanding/admission-major-alias.generated.js`
  - 家长简称；
- `ln-rank/js/knowledge/major-understanding-resolver.js`
  - 专业解释与具体/专业类判定。

### 研究生

- `shared/resources/graduate/graduate-catalog-2022.v001.js`
  - 国家研究生一级学科 / 专业学位类别；
- `shared/resources/majors/undergrad-graduate-pathway.v001.js`
  - 本科→研究生理解导航，不是国家一一对应表。

### 搜索与关系图

- `shared/resources/majors/major-search-intent.v001.js`
  - 家长说法→规范专业/消歧；
- `shared/resources/majors/major-relationship-graph.v002.js`
  - 纯投影关系 owner，只允许同本科专业类、共享学术导航、共享专业学位导航三类有结构证据的关系。

不建立课程相似度分数、就业等价、“自动平替”或第二份专业目录。

## 2026 本科层级重要边界

总体仍是 **13 门类、92 专业类、883 专业**，但不是每个专业都必经“门类→专业类→专业”三层。

交叉学科 `14` 门类中存在 `categoryCode/categoryName` 为空的专业，例如：

- `140001TK 未来机器人`
- `140012TK 具身智能`

真实结构是：

`交叉学科（14） → 具体本科专业`

不得根据六位专业代码前四位自行补造 `1400` 专业类。

## Research hierarchy boundary

国家研究生目录稳定到：

- 学科门类；
- 一级学科；
- 专业学位类别。

二级学科、专业领域和研究方向要继续看具体学位授予单位当年的招生目录。major-path 不伪造全国统一二级学科树。

## Current runtime boundary

活动入口：

- `major-path/index.html`
- `major-path/app.v006.js`
- `major-path/major-path-human.v006.css`

稳定 core runtime：

- `major-path/app-core.v006.js`
- `major-path/major-path.v001.css`
- `major-path/major-path-graph.v002.css`

v0.06 `app.v006.js` 直接 import `app-core.v006.js`。历史 `app.v003.js` / `major-path-direct.v003.css` 不再由 HTML 加载，避免 wrapper chain。

版本边界：

- visible product：`major-path-v0.06`
- truth/search/graph core runtime：`major-path-core-v0.06`
- ln-rank handoff：`major-path-handoff-v0.03`
- human presentation：`major-path-human-v0.06`

## Search contract

### 具体专业

例如 `计算机科学与技术`：

- 先看专业名 / 一句话；
- 再看“本科到读研，先看这条线”；
- 学硕方向卡同时保留正式概念“国家目录：一级学科”；
- 专硕方向卡同时保留正式概念“国家目录：专业学位类别”；
- 相关专业与 SVG 默认折叠；
- 科学边界与官方来源默认折叠。

### 专业类 / 宽泛说法

`计算机类 / 计算机 / 机械 / 测控` 继续由 search-intent owner 消歧，不静默选一个具体专业。

### 唯一可靠简称

`计科` 可解析为 `080901 计算机科学与技术`，并保留搜索识别说明。

### 交叉学科

`具身智能 140012TK` 必须保持 `交叉学科 → 具体专业`，任何可见或隐藏的 canonical hierarchy 都不得制造 `1400`。

## Human presentation contract

默认主流程不展示工程自证式语言。正式教育概念仍保留，但翻译为家长能直接理解的入口：

- `一级学科` → `学硕方向`卡中的正式目录说明；
- `专业学位类别` → `专硕方向`卡中的正式目录说明；
- `本科目录硬关系` → `本科属于哪里`；
- `研究生升学导航` → `读研可以先看`；
- `跨专业类升学交叉` → `跨专业也可能衔接`。

工程/科学边界不删除，只通过 progressive disclosure 进入“为什么不是固定对应 / 官方依据”。

详细 presentation / viewport contract：`docs/architecture/MAJOR-PATH-HUMAN-STATUS.md`。

## ln-rank handoff

跨页 concrete-major gate、same-origin return 与 resume snapshot 继续由 v0.03 owners 管理。当前 Direct Mode 的 landing/presentation 已由 v0.05 接管。

详见：`docs/architecture/MAJOR-PATH-HANDOFF-STATUS.md`。

## Verification owners

- `tools/verify-major-path-v002.mjs`
  - 883/92/13 parity、交叉学科、研究生目录、关系真值、搜索语义；
- `tools/verify-major-path-human-v005.mjs`
  - 当前入口、presentation/viewport ownership、人类语言和 handoff boundary；
- `tools/browser-major-path-human-v005.mjs`
  - 本地 PC / Pad / Android / Android compact；
- `tools/browser-major-path-human-live-v005.mjs`
  - exact-head Preview / exact-main Production PC / Pad / Android；
- `.github/workflows/verify-major-path-v001.yml`
  - 历史文件名继续作为唯一活动 major-path workflow owner。

Production durable status：`production/major-path-v0.06`（待本 PR 合并后写入）。

## Release protocol

latest main → isolated branch → Draft fresh source/browser → exact-head Preview → freeze head SHA → Ready same SHA fresh checks → `expected_head_sha` merge → main push → exact-main Production → Pages/custom-domain resource graph → durable status success。
