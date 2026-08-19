# major-path × ln-rank 直达与返回 v0.03 · durable status

本文件记录 `/ln-rank/` 与 `/major-path/` 的跨页直达、事实边界和返回恢复 ownership。它不替代 `docs/architecture/MAJOR-PATH-STATUS.md`；专业知识/关系图核心仍是 major-path v0.02。

## Product job

家长在 `ln-rank` 已经看到一个具体本科专业时，不再要求重新搜索：

`按分数查专业 / 按学校查专业 -> 了解这个专业 -> /major-path/ 具体专业 -> 返回刚才结果`

返回优先使用浏览器 history；如果源页发生硬重载，则消费源 history entry 中的轻量 resume snapshot，重新通过原有查询 owner 取得结果，再用既有 scroll-policy 定位源卡片。

## Singular owners

- 本科专业事实与具体/专业类判定：`ln-rank/js/knowledge/major-understanding-resolver.js`
- URL 与 same-origin return 安全：`shared/resources/majors/major-path-navigation.v003.js`
- ln-rank 跨页 handoff / resume adapter：`ln-rank/js/workspace/major-path-handoff.v003.js`
- 实际页面导航事务：`shared/ui/interaction/interaction-transaction.v3990_1.js`
- ln-rank 查询事实与重新执行：现有 `selection-workspace` / major-bands / school-majors owners
- 返回定位：`ln-rank/js/workspace/scroll-policy.v3961_0.js`
- major-path 专业知识与 SVG 图谱：继续由 major-path v0.02 owners 管理
- major-path Direct Mode：`major-path/app.v003.js`，只负责来源上下文、直接打开和返回，不拥有专业事实

## Concrete-major gate

入口不是“只要看见专业名字就出现”。

### 分数卡

优先读取当前卡片已经由 `record.standardMajor` 渲染出的 canonical 本科专业代码。只有 resolver 再次确认是具体专业才生成入口。

### 学校卡

因为招生记录标题可能是专业类、试验班、项目名或带招生后缀，只有下列 resolver 状态且 `confidence=high` 才生成入口：

- `name_exact`
- `admission_suffix_clean`
- `alias_exact`

并且必须：

- `matched=true`
- `isClassLevel=false`
- 有唯一 canonical code/name

因此：

- `工程管理` 可以直达 `120103`
- `机械工程（中外合作办学）` 可以直达 `080201`，但 major-path 必须提醒项目/校区/学费仍回招生记录核验
- `计算机类` 不得默认跳 `计算机科学与技术`
- `工科试验班` / 无唯一映射招生名不得出现具体专业直达

## Navigation contract

ln-rank 新入口必须使用：

- `data-ui-navigation`
- `data-ui-navigation-target`

由现有 interaction transaction 执行最终 navigation。handoff adapter 不调用 `location.assign()`，也不建立 Android/Pad 专属点击逻辑。

内部专业 identity 使用 canonical `majorCode`；专业名只用于显示和来源说明。

`returnTo` 只允许 same-origin `/ln-rank/` 路径。外站 URL 或其他站内页面均 fail closed 到 `/ln-rank/`。

## Return / resume contract

在 interaction owner 接受 major-path 导航后、真正离开页面前，handoff adapter 同步写入当前 history entry：

- source mode (`score` / `school`)
- source card key
- score / range preset / active band
- current primitive filters
- school selection / school sort
- source URL

不保存整批招生结果，不创建 localStorage/sessionStorage/IndexedDB 第二缓存。

返回：

1. BFCache / 正常 history 恢复时，浏览器自然保留 DOM 与滚动；`pageshow.persisted` 后清除临时 resume snapshot。
2. 硬重载时，adapter 恢复轻量查询输入，调用现有 workspace `submit()` 重新获取 canonical 结果。
3. 结果出现后调用现有 `scrollToExplicitTarget()` 定位源卡片；不新增 MutationObserver、setTimeout scroll chain 或第二 viewport owner。

## Major-path Direct Mode

当 URL 带 `majorCode + from=ln-rank`：

- 直接按 canonical code 打开专业结果；
- 搜索 hero 不占首屏；
- 显示“返回刚才的专业列表”或“返回某校的专业”；
- 显示来源边界说明；
- “换个专业”后恢复普通搜索模式。

独立访问 `/major-path/` 或旧 `?major=...` 仍保持 v0.02 搜索体验。

## Version boundary

- major-path 知识/关系图核心：`major-path-v0.02`
- ln-rank ↔ major-path 直达与返回能力：`major-path-handoff-v0.03`
- direct runtime：`major-path-direct-v0.03`
- navigation contract：`major-path-navigation-v0.03`

v0.03 是 additive cross-page capability，不创建第二份专业目录、第二个关系图 owner、第二个 ln-rank 查询 runtime 或第二个 navigation state machine。

## Required proof

- source verifier：`tools/verify-major-path-handoff-v003.mjs`
- browser verifier：`tools/browser-major-path-handoff-v003.mjs`
- 保留既有 `tools/verify-major-path-v002.mjs` 与 `tools/browser-major-path-v002.mjs`
- PC / Pad / Android / Android compact：
  - 分数卡具体专业出现入口
  - 学校卡具体专业出现入口
  - 专业类不出现具体专业入口
  - 中外合作后缀映射后显示项目边界
  - `majorCode` 直接打开，不二次输入
  - history resume snapshot 可消费并清除
  - 外站 returnTo 被拒绝
  - document 无横向溢出
- exact-head Preview 与 exact-main Production 均重跑 major-path v0.02 核心旅程 + v0.03 handoff 旅程

## Release protocol

Draft fresh checks -> exact-head Preview -> freeze SHA -> Ready same SHA -> expected_head_sha merge -> main push -> exact-main Production -> Pages/custom-domain resource graph -> durable `production/major-path-handoff-v0.03` success。
