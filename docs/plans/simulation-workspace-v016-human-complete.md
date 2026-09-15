# 模拟志愿工作台 v016 人类确认链路完整计划

## 目标

把 `/ln-rank/simulation-report.html` 的学校→专业输入链路做成可以被普通家长直接理解、直接操作、可靠确认的工作流，并确保 PC / Pad / Android 一致。

## 1. 输入与候选

学校输入必须即时响应，不等待网络；候选搜索使用独立 Worker，并取消过时查询结果。候选项必须保留学校官方名称、所在省、市、办学层次和匹配类型，让同名/近似学校可以人工区分。

专业输入先提供本地专业目录反馈，但目录候选只能作为名称提示，不能冒充该学校招生事实。确认学校后，再基于该校实际招生记录进行专业候选筛选。

## 2. 明确确认

学校候选必须显示明确的“选这所”操作。只有用户明确点击候选后，系统才进行严格学校 resolve，并建立 `confirmedSchool`。

专业候选必须显示明确的“选这个”操作。只有用户明确选择具体专业后，系统才将 `majorCode` / `majorName` 写入当前志愿，并用学校名称、专业名称、专业代码共同进行事实核验。

候选按钮必须是实际可点击的 button，不能依赖 document/window 捕获阶段的全局 click 委托；避免其他旧运行时阻断确认动作。

## 3. 状态隔离

学校发生改变时，必须清除原来的 `confirmedSchool`、专业名称、专业事实上下文以及过时异步任务。快速输入、IME、Paste、Backspace、删除和刷新不得产生旧结果覆盖新输入的问题。

学校事实查询采用有限数量的专业名称一次性查询并在内存中过滤；已经由同一批查询覆盖的专业再次点击确认时不得产生重复请求。

## 4. UI 层级

候选菜单不能被志愿卡片的 overflow 截断，也不能被相邻卡片覆盖。PC / Pad / Android 的候选按钮都必须保持可见、可点击，并提供清晰的主要信息与操作区域。

## 5. 运行时收敛

当前页面只允许一套候选确认运行时。历史版本脚本可以作为兼容资产保留，但不能拥有当前候选的第二套确认事件路径。

当前运行时：`simulation-report-v017-responsive-input.js`。

## 6. Workflow 收敛

历史 simulation-report v001/v003/v005/v006/v007/v008/v009/v010/v011/v012/v013/v014 自动触发退出，改为 `workflow_dispatch` 手动取证。当前模拟工作台只使用 `.github/workflows/verify-simulation-workspace-v016.yml` 作为 canonical gate。

canonical gate 必须执行当前 v017 contract、当前 v017 direct-action browser regression，以及 performance regression；不能调用过期的 v016 browser 脚本。

当前仓库 CI 进一步采用资源边界触发：与 simulation-report 无关的 PR workflow 不应因 `ln-rank/**` 或其它宽路径匹配而启动；生产资源验证以 main 为主，专门模块验证只监听其实际负责的代码/测试输入。这样避免一次局部页面修改同时占用多个重型 runner。

## 7. 发布版本

每次产品/验证修订都提升版本或修订号，并同步页面 cache-buster、release manifest、验证脚本和进度文件。

当前版本：`simulation-workspace-v016.41`
当前修订：`r131-school-worker-and-performance-gate`
当前运行时实现：`v016.39-r129`

本轮还补齐了运行时 Worker 和性能门禁：

- `ln-rank/js/simulation-school-search-worker-v001.js`：复用既有 v150 学校目录 resolver 与 v3969 学校查询引擎，专门负责候选搜索和严格 resolve。
- `tools/browser-simulation-workspace-v016-performance.mjs`：测量学校/专业输入事件的同步 dispatch 成本，防止输入本身被同步计算拖慢。

## 8. 发布级真实回归

canonical browser regression 必须覆盖：

- Android 390
- Pad 768
- Desktop 1280
- 输入 `沈阳工业大学`
- 候选显示 `辽宁省 / 沈阳市 / 本科 / 名称完全一致`
- 点击候选内部真实文字 `选这所`
- 等待 `已确认学校：沈阳工业大学`
- 输入具体专业
- 点击候选内部真实文字 `选这个`
- 检查 `confirmedSchool`、`majorCode`、`majorName` 实际持久化
- 检查无 page error
- 输入性能同步 dispatch 满足 canonical performance gate

## 9. Merge Gate

只有以下全部成立才允许 merge：

1. 最终实时 PR HEAD 的 canonical contract PASS。
2. 最终实时 PR HEAD 的 PC / Pad / Android direct-action browser PASS。
3. 最终实时 PR HEAD 的 performance PASS。
4. Cloudflare Preview 与最终 HEAD SHA 精确对应且 SUCCESS。
5. 必要 PDF / 多端核验完成。
6. merge 前重新读取 PR HEAD，确认没有移动。
7. 使用 expected-head SHA merge 到 `main`。
8. merge 后重新读取 main SHA，核验 Cloudflare Production、custom domain、`/api/ai/*` 与相关数据 SHA parity。

旧 Preview、旧 SHA、旧 workflow 结果不得替代最终 HEAD 证据。
