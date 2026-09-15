# 模拟志愿填报单页开发进度

分支：`fix/simulation-major-intent-v014`
PR：#285
当前 HEAD：`99aa21c8ab021c19591b6fe0c97139a41c4dbbc2`
当前 main：`3b24bbd425aace4702d5ebeda32d526ff1447f5a`
当前版本：`simulation-workspace-v014.7`
当前修订：`r069-current-workbench-regression-cleanup`

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
- [x] 修正 v012 browser reload seed 误测
- [x] 修正 v006 browser assertion precedence 误测
- [x] 清理 v001/v003/v005/v008/v009/v013 对 superseded page markup 的错误契约依赖
- [x] v014.7 contract source updated
- [ ] 最新 v014 contract/browser CI 全部通过
- [ ] v006/v012/v008/v009 browser regressions 全部通过
- [ ] 最终全站 release/runtime/resource/production gates
- [ ] exact-head merge
- [ ] merge 后重新核验 main SHA、Cloudflare Preview/Production、custom domain、API health、数据 SHA parity

## 已定位的历史误报/失败

1. v014：旧浏览器测试使用 Playwright `fill()` 后，没有触发预期的专业输入事件；已改为逐字键入。
2. v012：测试自己的 `addInitScript` 在 reload 时重新写入 seed，导致持久化结果被测试覆盖；已改为仅在 storage 为空时 seed。
3. v006：测试中一个 `!awaitValue === '080301'` 断言存在运算符优先级错误；已修正。
4. v001/v003/v005/v008/v009/v013：后续版本替换页面入口/文案后，旧契约仍要求已移除的可见标记；已改为兼容性契约，继续检查仍存在的旧运行时/打印能力，而非删除验证。

## 数据所有权

1. 专业目录：`shared/resources/majors/major-catalog-contract.js` + 2026 generated catalog。
2. 历史招生记录：`/api/ai/major-history`。
3. 学校实体：`tongxue/data/school-name-resolver-v150.js`。
4. 参考位次：既有 `ln-2026-physics-score-rank.js` 经 `/api/simulation-rank` bridge 使用。
5. 家庭草案/PDF：继续复用既有控制器与兼容层，不改变 selection-pool 事实真源。

## 断网续接规则

恢复时必须以本文件、PR #285、branch HEAD、main HEAD 和对应 CI run 为准；不得根据旧聊天状态推断已完成。

## Merge gate

只允许以最终 HEAD 的专用 contract/browser CI 和全站门禁为依据合并。合并后必须重新读取 main SHA，并核验 Cloudflare Preview/Production、custom domain、API health 与数据 SHA parity；旧 SHA 的部署或测试证据不能替代最终 head 验证。
