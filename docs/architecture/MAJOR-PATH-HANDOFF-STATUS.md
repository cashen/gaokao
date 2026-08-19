# major-path × ln-rank 直达与返回 v0.03 · durable status

本文件记录 `/ln-rank/` 与 `/major-path/` 的跨页直达、事实边界和返回恢复 ownership。跨页合同仍是 v0.03；当前 major-path 可见 presentation 已升级到 v0.04，详见 `MAJOR-PATH-HUMAN-STATUS.md`。

## Product job

家长在 `ln-rank` 已经看到一个具体本科专业时，不再重新搜索：

`按分数查专业 / 按学校查专业 → 了解这个专业 → major-path → 返回刚才结果`

v0.04 presentation 进一步规定：从 ln-rank 进入时，Direct Mode 要直接落到“本科到读研，先看这条线”，而不是停在页面头部或整个结果容器顶部。

## Singular owners

- 本科专业事实与具体/专业类判定：`ln-rank/js/knowledge/major-understanding-resolver.js`
- URL 与 same-origin return：`shared/resources/majors/major-path-navigation.v003.js`
- ln-rank handoff / resume：`ln-rank/js/workspace/major-path-handoff.v003.js`
- 实际跨页 navigation：`shared/ui/interaction/interaction-transaction.v3990_1.js`
- ln-rank 查询事实：现有 `selection-workspace` / major-bands / school-majors owners
- ln-rank 返回定位：`ln-rank/js/workspace/scroll-policy.v3961_0.js`
- major-path 专业事实、搜索与 SVG：v0.02 canonical owners
- major-path 当前 presentation / viewport：`major-path/app.v004.js`

历史 `major-path/app.v003.js` 不再是活动页面入口；它保留为 v0.03 发布证据，不应重新挂回 HTML。

## Concrete-major gate

入口不是“只要看见专业名称就出现”。

分数卡优先读取当前卡片已有 canonical 本科专业代码；学校卡只有 resolver 处于高置信具体专业状态才出现入口：

- `name_exact`
- `admission_suffix_clean`
- `alias_exact`

并且必须满足：

- `matched=true`
- `isClassLevel=false`
- 唯一 canonical code/name

因此：

- `工程管理` → 可直达 `120103`
- `机械工程（中外合作办学）` → 可直达专业本体 `080201`，但项目/校区/学费继续回招生记录确认
- `计算机类` → 不得默认跳 `计算机科学与技术`
- `工科试验班` / 无唯一映射招生名 → 不得出现具体专业入口

## Navigation contract

ln-rank 入口继续使用：

- `data-ui-navigation`
- `data-ui-navigation-target`

由现有 interaction transaction 执行最终 navigation。handoff adapter 不调用 `location.assign()`，不建立 Android/Pad 专属点击逻辑。

内部专业 identity 使用 canonical `majorCode`；专业名仅用于显示和来源说明。

`returnTo` 只允许 same-origin `/ln-rank/`。外站 URL 或其他站内页面均 fail closed 到 `/ln-rank/`。

## Return / resume contract

在 interaction owner 接受 major-path 导航后、离开页面前，handoff adapter 只把轻量 resume snapshot 写入当前 history entry：

- source mode
- source card key
- score / range preset / active band
- primitive filters
- school selection / school sort
- source URL

不保存整批招生结果，不创建 localStorage/sessionStorage/IndexedDB 第二缓存。

返回：

1. BFCache / 正常 history：浏览器自然保留 DOM 与滚动；
2. 硬重载：恢复轻量查询输入，调用原 workspace `submit()` 重新取得 canonical 结果；
3. 结果完成后调用既有 `scrollToExplicitTarget()` 回到源卡附近。

## Current Direct Mode

当 URL 带 `majorCode + from=ln-rank`：

- `major-path/app.v004.js` 直接按 canonical code 发起既有 core 查询；
- search hero 不占首屏；
- 顶部只保留轻量返回动作；
- presentation 精准落到 `[data-major-pathway-focus]`；
- 来源说明压缩为 1–2 行家长语言；
- “换个专业”后恢复普通探索模式。

Direct Mode 不建立第二份专业事实、第二个 query runtime 或第二个 return state machine。

## Version boundary

- visible major-path：`major-path-v0.04`
- professional truth/search/graph core：`major-path-v0.02`
- ln-rank ↔ major-path handoff：`major-path-handoff-v0.03`
- human presentation / viewport：`major-path-human-v0.04`

## Required proof

- `tools/verify-major-path-v002.mjs`：保留 883/92/13 与研究生/关系真值；
- `tools/verify-major-path-human-v004.mjs`：当前活动 presentation、single viewport transaction 与 v0.03 handoff boundary；
- `tools/browser-major-path-human-v004.mjs`：本地 PC/Pad/Android/Android compact；
- `tools/browser-major-path-human-live-v004.mjs`：exact-head Preview / exact-main Production。

必须继续证明：具体专业能直达、专业类 fail closed、中外合作边界不丢、Direct Mode 精准落到本科→读研区、返回原 ln-rank 正常、无横向溢出。

## Release protocol

Draft fresh checks → exact-head Preview → freeze SHA → Ready same SHA → `expected_head_sha` merge → exact-main Production → Pages/custom-domain resource graph → durable Production status。
