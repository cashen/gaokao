# 模拟志愿填报单页开发进度

当前合并基线：`main` / `6c18f7aeadfb66f5eef940d8f3ccb4cbe0d16a5a`
当前修复分支：`fix/simulation-postmerge-v011-contract`
当前版本：`simulation-workspace-v014.12`
当前修订：`r074-postmerge-v011-compatibility`

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
- [x] 清理 v001/v003/v005/v008/v009/v013 superseded page markup 误报
- [x] 合并 PR #285 到 main
- [x] 合并后 production API health：SUCCESS
- [x] 合并后 Cloudflare Pages：SUCCESS，部署 `6c18f7a`
- [x] 定位合并后 v011 compatibility contract/browser 失败为旧版 CSS/JS 引用误报
- [x] 建立 post-merge v011 修复分支
- [x] v011 contract/browser 改为验证当前 v012 family decision + v014 工作台
- [x] 版本提升至 v014.12 / r074
- [ ] post-merge v011 contract/browser CI
- [ ] post-merge 全站 release/runtime/resource/tree integrity
- [ ] post-merge Cloudflare custom-domain/runtime/API/data-SHA parity 完整核验
- [ ] 修复 PR 合并回 main

## 当前已确认的问题

`main` 上合并后的 `Verify simulation report v011 family decision` 在 contract/browser 两个 job 均失败。日志明确显示 contract 失败原因是仍要求已经不再由当前单页加载的 `simulation-report-v011-family-decision.css/js`；页面实际加载的是 v012 family decision 层，并同时加载 v014 学校/专业意图层。该问题属于测试契约过期，不是招生事实或页面运行时异常。

## 数据所有权

1. 专业目录：`shared/resources/majors/major-catalog-contract.js` + 2026 generated catalog。
2. 历史招生记录：`/api/ai/major-history`。
3. 学校实体：`tongxue/data/school-name-resolver-v150.js`。
4. 参考位次：既有 `ln-2026-physics-score-rank.js` 经 `/api/simulation-rank` bridge 使用。
5. 家庭草案/PDF：继续复用既有控制器与兼容层，不改变 selection-pool 事实真源。

## 断网续接规则

恢复时必须以本文件、修复分支 HEAD、main HEAD 和对应 CI run 为准；不得根据旧聊天状态推断已完成。

## Merge gate

post-merge 修复仍必须走独立 PR；只有该 PR 的最终 HEAD 专用 contract/browser 和全站门禁均通过，才允许再次合并。合并后必须重新读取 main SHA，并核验 Cloudflare Preview/Production、custom domain、API health 与数据 SHA parity。
