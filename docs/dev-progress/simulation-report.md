# 模拟志愿填报单页开发进度

当前主线：`feat/simulation-workspace-v016-human-complete`
PR：#290
基线 main：`a96a7d15190b1f8737501985a92b4c5ab09e4978`
当前产品版本：`simulation-workspace-v016.37`
当前产品修订：`r127-direct-candidate-actions`
阶段：exact-head CI verification → browser/performance → Preview

## v016.37 本轮修正

- [x] 候选学校与专业由全局 click 委托改为候选按钮自身绑定 click handler，避免旧 document-level handler 吞掉确认动作。
- [x] 候选主体文字与“选这所/选这个”操作区域均保留在同一个真实 button 命中区内，主体文字 pointer-events 关闭，不再形成点击歧义。
- [x] 候选按钮显式启用 pointer-events，并增加 touch-action，统一 PC、Pad、Android 的命中行为。
- [x] 学校候选继续保留省/市/层次/精确或相似匹配信息。
- [x] 专业候选继续区分专业目录提示与该校实际专业记录，并要求选择后事实核验。
- [x] active page/runtime/cache-buster 升级为 `v016.37-r127`，避免继续命中旧资源。

## v016.36 已完成能力

- [x] 学校候选不再只显示校名；Worker 保留省、市、办学层次与匹配类型。
- [x] 精确学校名称显示“名称完全一致”，相似结果显示“相似匹配”。
- [x] 学校候选明确显示“找到 N 所候选学校，请按地区和层次确认”，每项明确提供“选这所”。
- [x] 专业目录候选与学校实际专业候选视觉和文案分层；学校实际专业项明确提供“选这个”。
- [x] 修复候选下拉被 `.volunteer-card{overflow:hidden}` 截断的 PC/桌面交互问题。
- [x] 候选菜单在焦点卡片上提升层级，避免被相邻志愿卡覆盖。
- [x] 选中专业后显式回显“名称 · 代码”，最终事实核验规则不变。
- [x] 新增桌面回归：真实输入 `沈阳工业大学`，校验辽宁省/沈阳市/本科/名称完全一致/选这所，然后进入专业候选。

## 已确认的输入架构

- [x] 学校输入不等待 resolver/network；候选搜索走 Worker `search()`。
- [x] 用户明确点击候选后才执行严格 `resolve()` 并建立 `confirmedSchool`。
- [x] 专业输入先走本地目录；学校事实核验使用 `/api/ai/major-history` 多 `major` 单次查询并内存过滤。
- [x] 快速专业输入取消旧请求；学校切换取消旧事实并清除旧 `confirmedSchool`/context。
- [x] 已缓存且被前一轮有界事实查询覆盖的具体专业，点击确认时直接复用缓存。
- [x] IME、Paste、Backspace、删除、refresh、duplicate、URL inbound 已纳入回归范围。

## 当前 exact-head 门禁

- [ ] v016.37 exact HEAD contract PASS
- [ ] v016.37 exact HEAD browser PASS（390 / 768 / 1280）
- [ ] v016.37 exact HEAD performance PASS
- [ ] Cloudflare Preview 与 exact HEAD SHA 一致并 SUCCESS
- [ ] 多端/PDF必要核验
- [ ] 再次确认 PR head 未移动

## Merge Gate

必须满足全部 exact-head 门禁后，才允许以最终实时 PR HEAD 作为 `expected_head_sha` merge。合并后重新读取 main SHA，并核验 Cloudflare Production、custom domain、`/api/ai/*` 与相关数据版本/SHA parity。

禁止使用旧 HEAD 的 CI、Preview、部署或聊天记录作为最终通过依据。