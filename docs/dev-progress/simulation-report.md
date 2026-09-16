# 模拟志愿填报单页开发进度

当前主线：`refactor/simulation-family-note-r152`
基线 main：`cf99186d50388c5f5e8ce14f5a6c0605361b449d`
当前产品版本：`simulation-workspace-v016.62`
当前产品修订：`r152-family-note-unified-editor`
运行时 owner：`/ln-rank/js/simulation-runtime.js`
阶段：备注统一管理修订 → CI / Preview / Production 验证

## r152 修正

- [x] 备注继续作为 `volunteer.familyNote` 一等字段，未增加平行 store 或 note runtime。
- [x] 家庭处理区收敛为同一语义上下文：处理结论与备注放在同一区域，不再把备注作为卡片末尾孤立输入。
- [x] 备注由单行 input 改为多句 textarea，最大 1000 字符，支持自动增高并限制编辑区域最大高度。
- [x] 备注输入不触发整张志愿清单 render；继续使用 unified runtime 的直接状态写入路径。
- [x] 刷新、改变家庭处理结论、排序均继续保留备注内容。
- [x] CI 新增 Android / Pad / Desktop 三视口备注回归。
- [x] release contract 提升到 `v016.62-r152`。

## r151 修正

- [x] 修复 Chromium 无法解析 `?.preset = ...` 导致的运行时 `SyntaxError: Invalid left-hand side in assignment`；入站参数改为先取 pending 再显式赋值。
- [x] 专业核验改为学校 + 专业名称 + 专业代码严格匹配；缺少代码或代码不一致不再通过名称回退。
- [x] 页面缓存版本统一提升到 `v016.61-r151`，避免旧运行时资源继续命中缓存。

## r150 统一接管

- [x] 页面从多套历史 simulation runtime 收敛为唯一 Bootstrap。
- [x] Store 成为唯一持久化状态 owner，保留 v002 数据结构兼容。
- [x] 移除新运行时对 legacy row / controller / DOM bridge 的依赖。
- [x] 学校候选、学校确认、专业目录候选、学校×专业历史核验均由 unified runtime 协调。
- [x] 输入过程不重新渲染整张清单，保留 100ms school debounce 与 stale sequence 防护。
- [x] 家庭处理使用统一家长语言，旧状态在加载时完成一次性映射。
- [x] PDF 改为统一 runtime 按需调用 service；Android 只使用输出适配，不再加载第二个 Android runtime。
- [x] 页面 CSS 收敛到单一 `simulation-report.css`。
- [x] architecture contract / browser regression 已改为 unified runtime 口径。
- [x] 删除页面 active legacy runtime / CSS / PDF entry；历史 PR 与进度记录保持不变。
- [x] r150 修正 PDF 分页测量，按实际内容边界决定分页，而不是依赖固定容器高度。
- [x] r150 修正统一架构测试契约，使其不再绑定局部变量命名。

## 当前 Definition of Done

- [ ] unified architecture static contract PASS
- [ ] Node syntax PASS
- [ ] Desktop / Pad / Android browser PASS
- [ ] rapid input / clear / school confirmation / major confirmation PASS
- [ ] history / family decision / reorder / refresh persistence PASS
- [ ] family note long-text / autosize / persistence PASS
- [ ] PDF service smoke PASS
- [ ] final PR head exact SHA verified
- [ ] Cloudflare Preview exact SHA verified
- [ ] merge 后 main SHA / custom domain / API / resource parity verified

## 后续开发规则

模拟志愿不得再新增平行 `simulation-report-v0xx-*.js` 页面运行时。新增能力必须进入 `simulation-runtime.js` 或明确的 service 模块，并通过统一 architecture contract。备注能力必须继续作为 volunteer row 的字段和家庭处理上下文的一部分演进。
