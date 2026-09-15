# 模拟志愿工作台 clean PR 进度

当前合并基线：`main` / `7873c939e3cfebc4bf3e48a230de09dadd930d60`
当前修复分支：`fix/simulation-v014-clean-pr`
当前版本：`simulation-workspace-v014.16`
当前修订：`r078-clean-pr-skip-ci`

## 本轮状态

- [x] 从已关闭 PR #287 提取有效功能任务
- [x] 学校输入“辽宁→立即删除”卡顿修复：防抖、取消 pending work、AbortController、延迟持久化、幂等 DOM、批量 rehydrate
- [x] v011 compatibility contract/browser 迁移到当前 v012/v014 工作台
- [x] 增加 1280px/390px “输入辽宁后立即删除”回归
- [x] 保留 main 已有 v015.9 runtime，不覆盖未接入实现
- [x] #287 已关闭，不再作为执行载体
- [x] #288 因 Actions fan-out 再次关闭，不再继续消耗 runner
- [x] 新功能分支基于 main 单次原子提交整理
- [x] 本轮新提交使用 `[skip ci]`，不再制造新的 Actions 队列
- [ ] 完成功能代码的独立本地/静态核验
- [ ] 恢复 CI 后进行 v014/v011 专项 browser/contract 门禁
- [ ] 全站必要门禁
- [ ] merge
- [ ] merge 后 main / Cloudflare / custom domain / API / data-SHA parity

## CI 事件说明

当前仓库已经出现明显的 PR workflow fan-out。旧 PR #287、#288 已关闭，避免继续创建新的执行。由于现有工具链没有暴露 GitHub Actions “cancel run” 操作，已经创建的历史 queued run 不能由本会话直接逐个 DELETE；本轮通过关闭 PR + `[skip ci]` 止住新的队列增长。

## 功能边界

当前页面 `/ln-rank/simulation-report.html` 仍加载 v014 school-major-intent runtime；本轮不改共享 HTML 入口，也不覆盖 main 上单独存在的 v015.9 runtime。
