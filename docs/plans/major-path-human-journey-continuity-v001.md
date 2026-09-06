# major-path 人类旅程连续性与弱网治理计划

## 目标

把专业升学地图（`/major-path/`）从“能看目录与路径”收敛为一条不会让用户迷路的连续查询：用户始终知道当前专业、进入来源、证据边界、下一步动作；从 ln-rank、Tongxue、学术背景或分享链接进入后，返回能够恢复原来的分数、专业、筛选条件、hash 与阅读位置。

本计划基于 main `2f36a067990c8a1a6fc2f19f9b10c27322730e71`、全站 `v3.9.90.3 / v3990_3`、major-path `v0.05`、core `v0.05`、handoff `v0.03` 制定。实现时不得修改 `/fenxi/`、`functions/fenxi/`、`functions/_middleware.js`，不得另建第二套状态、缓存、事实或渲染 owner。

## 人类行为原则

1. 首屏回答“我看的是谁、从哪里来、下一步是什么”。
2. 专业代码是身份主键；专业名、学校名和分数不能互相替代。
3. “无记录”与“查询失败”必须分开；失败不能补写或暗示不存在。
4. 任何上下文丢失都要显式说明，不得静默降级后继续假装连续。
5. 一个主要返回动作，一个主要下一步动作；模块切换是次级动作。
6. JS 只增强导航，关键路径必须有原生链接或 GET 兜底。

## 入口/出口矩阵

| 入口 | 必须携带 | 主要出口 | 验收重点 |
| --- | --- | --- | --- |
| 独立搜索、快捷示例、门类浏览 | canonical majorCode（确定后） | 专业路径、关系图、最低分 | 刷新/分享可复现 |
| ln-rank 分数卡 | score、resultMode、filters、returnTo、anchor | 返回原查询、最低分 | 分数与筛选恢复 |
| ln-rank 学校/专业卡 | school identity、majorCode、sourceKey | 返回学校/专业结果 | 学校与专业不串线 |
| Tongxue 专业入口 | majorCode、source surface、returnTo | 返回 Tongxue、最低分 | 体验上下文不误挂 |
| 学术背景/AIPLuS | 明确 sourceSurface、证据范围 | 返回来源或独立状态 | 不伪装为 ln-rank |
| 直接/分享/刷新 | 仅安全公开参数 | 独立浏览 | 不显示虚假的“返回刚才列表” |
| 相关专业切换 | 新专业 code/name | 新专业路径或继续浏览 | 清除旧学校、旧分数、旧 decisionContext |

## 工作包

### MP-00 基线与断点

- 固定 base/head SHA、PR、CI、Preview、Production 状态。
- 使用 `.codex/progress/major-path-human-journey-v001.json` 保存完成项、失败项和下一步。
- 任何 timeout、无输出或断网均记为 `unknown`；恢复时先核验实时状态。

### MP-01 来源与返回契约

- 升级 `major-path-navigation` 版本，增加显式 `sourceSurface` 枚举：`ln-rank-score`、`ln-rank-school`、`ln-rank-major`、`tongxue-major`、`academic-background`、`aiplus`、`direct`、`share`。
- 分离安全返回地址、缺失返回地址和非法返回地址；统一 major-path、Tongxue、最低分入口的 return sanitizer。
- 校验 canonical majorCode/name；上下文超过 URL 限制时显式标记 independent/omitted。

### MP-02 上下文隔离

- 相关专业切换创建目标专业的新上下文。
- 不把原专业的 score、school、sourceKey、decisionContext 带给新专业的 Tongxue、最低分或背景入口。
- 保留来源返回目标，但不保留与目标专业不相容的事实。

### MP-03 历史、URL 与阅读位置

- URL 保存专业身份和来源；history state 保存必要筛选、结果模式、焦点和锚点。
- 只允许一个恢复 owner，顺序固定为 URL → 主体 → 一次锚点/滚动。
- 显式 `returnTo` 优先于 referrer/history.back；后者只能作为无安全返回地址时的受控 fallback。

### MP-04 无脚本、弱网与 fail-closed

- 搜索表单提供 GET fallback；门类、专业类、歧义候选、关系节点优先使用原生 `<a>`。
- 背景证据区区分 loading、ready、no-record、offline、timeout、http-error、invalid-data，并提供可控重试。
- 可用缓存必须带验证时间；禁止模型补写缺失来源或把失败说成无记录。

### MP-05 UI 与可访问性

- 顶部只保留一个主要返回；来源 chip 放在结果头部。
- 先显示答案与本科→研究生路径，再展开关系图、背景证据和学生体验。
- 关系图保留列表替代，不让横向滚动成为理解核心。
- 触控目标至少 44px，补足键盘 focus、减弱动画、360px/低高度/安全区适配。

### MP-06 跨模块回归

- 验证 major-path ↔ ln-rank、Tongxue、academic-background、AIPLuS 的 code、school、source、return、hash、scroll 契约。
- 覆盖直接打开、分享、刷新、前进后退、相关专业切换。

### MP-07 测试、发布与 changelog

- 修复过期的 `verify-major-path-handoff-v003.mjs`，不再硬编码 v0.04。
- 增加非法 code、缺失/非法 returnTo、上下文超长、相关专业隔离、网络故障测试。
- 固定 Playwright Chromium 依赖；通过 PC、Pad、Android 390、Android 360 与无脚本/弱网矩阵后，才 Ready、合并并复核 Production。
- 每次产品修订递增模块/资源版本，并同步全站 release revision 与 `changelog.html`。

## 完成门槛

- 所有入口能说明来源，所有出口能说明下一步。
- 返回恢复原分数、专业、筛选、hash 和阅读位置。
- 相关专业不携带旧学校、旧分数或旧决策上下文。
- JS 不可用时核心路径仍可用；无记录与失败清楚区分。
- 当前最终 head 的 required checks、Preview、Production 使用同一 exact SHA；合并后 main 与生产版本/代际一致。
