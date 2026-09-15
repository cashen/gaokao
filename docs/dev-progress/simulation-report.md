# 模拟志愿填报单页开发进度

分支：`fix/simulation-major-intent-v014`
PR：#285
当前 HEAD：`bba4d7a5d24fc7e219ed7706a027f0926036726d`
当前 main：`3b24bbd425aace4702d5ebeda32d526ff1447f5a`
当前版本：`simulation-workspace-v014.10`
当前修订：`r072-final-regression-gate`

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
- [x] 固定 v014 release-family compatibility contract
- [ ] v014.10 contract/browser 最新运行必须通过
- [ ] 全站 release/runtime/resource/production/tree integrity 必须通过
- [ ] exact-head merge
- [ ] merge 后 main/Cloudflare/custom-domain/API/data-SHA parity 必须重新核验

## 已定位并修复的错误类型

1. **v014 browser 输入路径问题**：原测试使用 `fill()` 后没有触发预期专业候选事件；回归改为逐字键入。
2. **v012 持久化误测**：原测试 reload 时再次覆盖 seed storage；改为仅 storage 为空时初始化。
3. **v006 测试断言错误**：`!value === '080301'` 运算符优先级导致断言失效；已修复。
4. **历史版本契约过期**：旧测试继续要求已经被后续工作台替换的脚本、文案、DOM；现在检查当前工作台及仍保留的兼容能力。

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
