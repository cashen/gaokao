# 模拟志愿填报单页开发进度

分支：`fix/simulation-major-intent-v014`
PR：#285
当前 HEAD：`3c1763ff8c2addcb8a2672754891db3c68b8c887`
当前 main：`3b24bbd425aace4702d5ebeda32d526ff1447f5a`
当前版本：`simulation-workspace-v014.5`
当前修订：`r067-human-typing-browser-regression`

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
- [x] v014 contract gate
- [x] Cloudflare branch preview deploy for v014 head
- [ ] v014.5 browser gate：上一轮失败已定位，当前 head 已改为逐字输入回归，等待新 CI
- [ ] 最终全站 release/runtime/resource/production gates
- [ ] exact-head merge
- [ ] merge 后重新核验 main SHA、Cloudflare Preview/Production、custom domain、API health、数据 SHA parity

## 当前阻塞

v014 原 browser CI 在 desktop 阶段等待 `.major-suggestion` 超时。诊断显示学校索引请求成功、无 request failure/page error，但没有发出 `/api/ai/major-history` 请求。该失败发生在浏览器回归输入路径，不能把旧 PASS 当成当前 head 的 PASS。

v014.5/r067 已将 major 输入回归改成清空后逐字输入（`pressSequentially`），继续验证真实键盘输入路径；未修改招生事实源，也未复制数据。

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
