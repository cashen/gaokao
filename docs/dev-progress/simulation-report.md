# 模拟志愿填报单页开发进度

当前合并基线：`main` / `7873c939e3cfebc4bf3e48a230de09dadd930d60`
当前修复分支：`fix/simulation-postmerge-v011-contract`
当前版本：`simulation-workspace-v014.14`
当前修订：`r076-ci-concurrency-guard`

## 当前状态

- [x] v001 独立模拟志愿单页面
- [x] 家庭决策工作台 v006
- [x] Android/390px 移动布局修复 v007
- [x] 近3年历史信息常显/紧凑布局 v008-v010
- [x] 家庭处理方式人类化 v011-v012
- [x] 专业名称/代码宽容输入 v013
- [x] 学校约束 + 学校实际招生记录驱动的专业候选 v014
- [x] 宽泛专业不自动替用户拍板
- [x] 错别字候选必须用户明确确认
- [x] 保留既有 PDF、历史数据和家庭状态兼容层
- [x] 修正 v014 浏览器 `fill()` 与真实输入事件差异
- [x] 修正 v012 reload seed 误测
- [x] 修正 v006 assertion precedence 误测
- [x] 清理历史版本 superseded page markup 误报
- [x] 合并 PR #285 到 main
- [x] 合并后 production API health：SUCCESS
- [x] 合并后 Cloudflare Pages：SUCCESS，部署 `6c18f7a`
- [x] 定位合并后 v011 compatibility contract/browser 失败为旧版 CSS/JS 引用误报
- [x] 建立 post-merge v011 修复分支
- [x] v011 contract/browser 改为验证当前 v012 family decision + v014 工作台
- [x] v014.12 / r074
- [x] 定位学校输入删除卡顿的运行时根因：逐字符解析/持久化 + 待完成异步工作未立即失效 + MutationObserver 对自身候选 DOM 变化重复 rehydrate
- [x] v014.13 / r075：学校输入防抖、删除时取消/失效 pending work、API 请求 AbortController、候选 DOM 幂等渲染、rehydrate 按卡片批处理
- [x] 增加“输入辽宁后立即删除”浏览器回归
- [x] 更新 v014 runtime cache-buster
- [x] v014.14 / r076：PR-scoped concurrency guard，避免旧 revision queued jobs 持续争抢 runner
- [ ] v014.14 / r076 post-merge v011 contract/browser CI
- [ ] v014.14 / r076 全站 release/runtime/resource/tree integrity
- [ ] v014.14 / r076 Cloudflare custom-domain/runtime/API/data-SHA parity 完整核验
- [ ] 修复 PR 合并回 main

## 当前已确认的问题

`main` 上合并后的 `Verify simulation report v011 family decision` 在 contract/browser 两个 job 均失败。日志明确显示 contract 失败原因是仍要求已经不再由当前单页加载的 `simulation-report-v011-family-decision.css/js`；页面实际加载的是 v012 family decision 层，并同时加载 v014 学校/专业意图层。该问题属于测试契约过期，不是招生事实或页面运行时异常。

用户反馈新的真实体验问题：在学校输入框先输入“辽宁”再删除，界面仍出现明显卡顿。代码审计确认 v014 当前实现对每次 `input` 都立即触发学校解析和 localStorage 写入，并且 workbench 的 MutationObserver 会观察候选节点自身的 childList 变化，存在不必要的重复 rehydrate 放大。r075 直接处理这三个路径，不改变学校解析与招生事实来源。

本轮新增 CI 架构问题：同一 PR HEAD 会同时触发大量历史兼容 workflow，runner 并发槽位被 queued jobs 占满；r076 已为当前 v014 专项与 main tree integrity 增加 PR-scoped concurrency guard，旧提交在同一 PR 上产生的新执行可被最新执行淘汰。全站 workflow 分层治理仍需在后续 CI 架构专项中继续完善。

## 数据所有权

1. 专业目录：`shared/resources/majors/major-catalog-contract.js` + 2026 generated catalog。
2. 历史招生记录：`/api/ai/major-history`。
3. 学校实体：`tongxue/data/school-name-resolver-v150.js`。
4. 参考位次：既有 `ln-2026-physics-score-rank.js` 经 `/api/simulation-rank` bridge 使用。
5. 家庭草案/PDF：继续复用既有控制器与兼容层，不改变 selection-pool 事实真源。

## 断网续接规则

恢复时必须以本文件、修复分支 HEAD、main HEAD 和对应 CI run 为准；不得根据旧聊天状态推断已完成。

## Merge gate

post-merge 修复仍必须走独立 PR；由于本轮用户反馈直接落在当前 #287 修复分支上，现 PR #287 需要以最终 HEAD 重新完成专用 contract/browser 和全站门禁。只有最终 HEAD 所有门禁通过，才允许再次合并。合并后必须重新读取 main SHA，并核验 Cloudflare Preview/Production、custom domain、API health 与数据 SHA parity。
