# 模拟志愿填报单页开发进度

当前主线：`main`
当前 main：`813e98138f53b7a90e010c84d616acabd044f81f`
当前产品版本：`simulation-workspace-v016.64`
当前产品修订：`r154-reload-safe-note-persistence`
运行时 owner：`/ln-rank/js/simulation-runtime.js`
阶段：统一接管完成 → 持续回归与生产观察

## r154 已完成

- [x] 备注继续作为 `volunteer.familyNote` 一等字段，未增加平行 store 或 note runtime。
- [x] 家庭处理区收敛为同一语义上下文：处理结论与备注放在同一区域。
- [x] 备注由单行输入改为多句 textarea，最大 1000 字符，自动增高并限制编辑区域最大高度。
- [x] 备注输入不触发整张志愿清单 render；继续使用统一 runtime 的直接状态写入路径。
- [x] 后台位次刷新改为局部更新 `#wbRank/#wbRankSource`，不打断正在编辑的备注。
- [x] 刷新、家庭处理结论变化、排序均保持备注内容。
- [x] Android / Pad / Desktop 三视口覆盖长文本、自动增高、持久化、处理结论切换与 reload。
- [x] release contract / 页面缓存 / 工作台版本同步到 `v016.64-r154`。

## r153 已完成

- [x] 修复后台位次请求触发整表 render、导致正在编辑的备注输入被替换的问题。
- [x] 恢复异步学校核验使用明确 row id，避免异步结果串行污染。
- [x] 测试契约同步到 r153。

## r151 已完成

- [x] 修复 Chromium `?.preset = ...` 语法错误；入站参数改为先取 pending 再显式写入。
- [x] 专业核验改为学校 + 专业名称 + 专业代码严格匹配；缺少代码或代码不一致不再通过名称回退。
- [x] 页面缓存版本提升到 `v016.61-r151`。

## r150 统一接管已完成

- [x] 页面从多套历史 simulation runtime 收敛为唯一 Bootstrap。
- [x] Unified Store 成为唯一持久化状态 owner，保留 v002 数据结构兼容。
- [x] 页面不再依赖 legacy row / controller / DOM bridge 维持正常输入生命周期。
- [x] 学校候选、学校确认、专业目录候选、学校×专业历史核验均由统一 runtime 协调。
- [x] 输入过程不重新渲染整张清单，保留 debounce、sequence supersession 与 stale-response 防护。
- [x] 家庭处理使用统一家长语言，旧状态在加载时完成一次性映射。
- [x] PDF 作为统一 runtime 按需调用的 service；Android 使用输出适配，不再加载第二个 Android runtime。
- [x] 页面 CSS 收敛到单一 `simulation-report.css`。
- [x] architecture contract / browser regression 改为 unified runtime 口径。
- [x] 历史 active legacy runtime / CSS / PDF entry 不再由页面加载。
- [x] PDF 分页按实际内容边界测量，避免固定容器高度造成错误分页。

## 当前 Definition of Done

- [x] unified architecture static contract PASS
- [x] Node syntax PASS
- [x] Desktop / Pad / Android browser PASS
- [x] rapid input / clear / school confirmation / major confirmation PASS
- [x] history / family decision / reorder / refresh persistence PASS
- [x] family note long-text / autosize / persistence PASS
- [x] PDF service smoke PASS
- [x] r154 final PR head exact SHA verified
- [x] r154 Cloudflare Preview exact SHA verified
- [x] r154 合并后 main SHA / Production / API / resource parity verified

## 当前架构规则

模拟志愿不得再新增平行 `simulation-report-v0xx-*.js` 页面运行时。新增能力必须进入 `simulation-runtime.js` 或明确的 service 模块，并通过统一 architecture contract。备注能力必须继续作为 volunteer row 字段和家庭处理上下文的一部分演进。

后续任何代码修订必须重新提升 simulation workspace 版本 / revision，并重新验证最终 HEAD；旧 Preview、旧 SHA、历史 workflow 结果不得替代最终 HEAD 证据。
