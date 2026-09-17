# 模拟志愿填报单页开发进度

当前主线：`fix/simulation-p0-school-major-history-r155`（待通过 PR 回到 `main`）
当前 main 基线：`c00efafad761ea11571427efa760372e81f6a306`
当前工作版本：`simulation-workspace-v016.65`
当前工作修订：`r155-school-major-history-mobile`
运行时 owner：`/ln-rank/js/simulation-runtime.js`

## r155 本轮已实现

- [x] 普通学校候选显式点击后，`school + confirmedSchool` 原子确认，不再等待异步 resolve 才允许继续。
- [x] 专业搜索词与实际招生专业身份拆开：`majorQuery / majorName / majorCode / majorRecordId`。
- [x] 专业候选只从当前确认学校的实际历史招生记录生成，不把全国专业目录作为最终可选记录。
- [x] 专业候选直接缓存并绑定原始招生记录，保留实际 `majorCode2026` 与 `id`。
- [x] 标准专业名称/代码只作为参考身份，普通项目与中外合作项目不再因同一标准代码被合并。
- [x] 三年历史绑定所选招生记录；年度缺失显示“暂无对应投档记录”。
- [x] 模拟志愿卡增加 1 学校 → 2 专业 → 3 三年历史的家长可读状态轨。
- [x] 移动端移除历史横向滚动，历史改为响应式网格；页面与志愿卡禁止水平溢出。
- [x] Android / Pad / Desktop 目标视口统一触控尺寸、安全区与单列输入布局。
- [x] canonical workflow 增加 r155 P0 浏览器回归，并同步旧 unified browser fixture 的招生记录身份字段。
- [x] release contract 提升到 `v016.65-r155 / page v1.1`。

## r154 基线

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

- [ ] r155 Node syntax PASS
- [ ] r155 existing unified runtime browser PASS
- [ ] r155 family note browser PASS
- [ ] r155 PDF browser PASS
- [ ] r155 school-major-mobile browser PASS
- [ ] r155 Preview exact SHA verified
- [ ] r155 merged main SHA / Production / API / resource parity verified

## 当前架构规则

模拟志愿不得再新增平行 `simulation-report-v0xx-*.js` 页面运行时。新增能力必须进入 `simulation-runtime.js` 或明确的 service 模块，并通过统一 architecture contract。备注能力必须继续作为 volunteer row 字段和家庭处理上下文的一部分演进。

后续任何代码修订必须重新提升 simulation workspace 版本 / revision，并重新验证最终 HEAD；旧 Preview、旧 SHA、历史 workflow 结果不得替代最终 HEAD 证据。
