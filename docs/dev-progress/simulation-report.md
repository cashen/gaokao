# 模拟志愿填报单页开发进度

当前主线：`feat/simulation-family-decision-r140`
关联任务：#297
基线 main：`c96c80526ccf88f4c37070db0483b554ed9546b1`
当前产品版本：`simulation-workspace-v016.58`
当前产品修订：`r148-family-decision-ui`
运行时 owner：`/ln-rank/js/simulation-report-v017-responsive-input.js`
阶段：开发中 → 待 canonical browser / performance / PDF / Preview 验证

## r148 家长决策层

- [x] 页面主标题由“模拟志愿工作台”收敛为家长更自然的“模拟志愿”。
- [x] Hero 文案改为“先放进来、看清楚、聊清楚、再决定怎么排”的家庭工作流表达，并保留“不是正式填报”的边界。
- [x] 现有 `wbSummary` 提升为家庭整理进度区，作为单页唯一的状态摘要入口。
- [x] 空状态改为“先放进一所考虑过的学校”，降低首次使用认知负担。
- [x] 打印按钮面向家长显示为“打印 / 保存这份方案”，保留既有 PDF 底层入口。
- [x] 移动端优化操作层级、按钮触控尺寸、家庭处理区域与候选菜单层级。
- [x] 历史参考不新增新的家长待办状态；继续使用既有历史 reference-only 契约。
- [x] 不新增招生数据、Worker 搜索、PDF 分页或复杂决策模型。
- [x] 新增 `tests/verify-simulation-family-decision-r140.mjs` 静态契约测试。

## 架构约束

- 学校→专业真实数据确认继续由现有 v017 responsive input owner 负责。
- r136-r147 已验证的 debounce、sequence supersession、stale-response guard、目录预热、异常恢复与 Android PDF 兼容保持不变。
- 本轮暂不删除 legacy 脚本；待 canonical gate 前完成 ownership 检查，确保没有第二套当前候选确认事件路径。

## 验证门槛

- [ ] 静态 r148 contract PASS
- [ ] Desktop 1280 browser PASS
- [ ] Pad 768 browser PASS
- [ ] Android 390 browser PASS
- [ ] rapid input / clear / IME / paste stale-response regression PASS
- [ ] 家庭处理四状态 + 刷新持久化 PASS
- [ ] 排序 PASS
- [ ] PDF 2 条同页、长清单自动分页、续页上下文 PASS
- [ ] Preview 与最终 PR HEAD SHA 精确对应
- [ ] merge 前重新读取 PR HEAD
- [ ] merge 后 main / Production / custom domain / `/api/ai/*` / resource SHA parity PASS

## 备注

旧的 r139 合并验证记录保持不变；本轮所有新增证据从当前 `main` 基线重新产生，不复用旧 PR / 旧 Preview 作为 r148 的完成证明。
