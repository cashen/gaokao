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

## 6. v016.42 / r132 本轮生命周期修复

旧 v007 workbench 仍负责历史展示，因此不能继续以固定周期或宽范围 MutationObserver 对 `#wbRows` 做整卡 `innerHTML` 重绘。该路径会销毁 v017 刚生成的候选 button，造成“候选看得到但点不进去”的真实人类交互故障。

本轮将旧运行时改为仅在明确终态需要同步时刷新，当前候选确认仍由 v017 独立直接绑定 button；不会为了补一个点击问题继续增加第三套事件委托。

专业确认完成后，历史记录重新写入同一志愿的 `history.years`，让三年历史显示直接消费确认后的事实；不存在严格历史记录时明确写入 `no-strict-record`，不得静默缺失。

## 7. Workflow 收敛

历史 simulation-report v001/v003/v005/v006/v007/v008/v009/v010/v011/v012/v013/v014 自动触发退出，改为 `workflow_dispatch` 手动取证。当前模拟工作台的 PR 功能性验证只使用 `.github/workflows/verify-simulation-workspace-v016.yml` 作为 canonical gate。

其他重型跨站/生产验证不应因为 `simulation-report.html` 局部修改反复启动；主干发布级验证放在 main push 阶段完成，模块级 PR 只验证自己真正负责的资源边界。

## 8. 发布版本

每次产品/验证修订都提升版本或修订号，并同步页面 cache-buster、release manifest、验证脚本和进度文件。

当前版本：`simulation-workspace-v016.42`
当前修订：`r132-candidate-lifecycle-and-history-hydration`
当前运行时实现：`v016.39-r129`

## 9. 发布级真实回归

canonical browser regression 必须覆盖 Android 390、Pad 768、Desktop 1280；输入 `沈阳工业大学`，确认候选中的 `辽宁省 / 沈阳市 / 本科 / 名称完全一致`，点击 `选这所`；再输入专业，点击 `选这个`；检查 `confirmedSchool`、`majorCode`、`majorName` 以及 `history.years` 实际持久化；检查无 page error；输入性能同步 dispatch 满足 canonical performance gate。

同时保留具体“沈阳工业大学 → 电气工程及其自动化”回归，用来验证候选在短暂异步和旧 DOM 生命周期下仍可持续点击。

## 10. Merge Gate

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
