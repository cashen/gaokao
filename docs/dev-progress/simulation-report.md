# 模拟志愿工作台 v014.15 clean PR progress

当前合并基线：`main` / `7873c939e3cfebc4bf3e48a230de09dadd930d60`
当前修复分支：`fix/simulation-v014-clean-pr`
当前版本：`simulation-workspace-v014.15`
当前修订：`r077-clean-pr-rebuild`

## 本轮迁移任务

- [x] 从已关闭 PR #287 提取有效功能任务
- [x] 学校输入“辽宁→立即删除”卡顿修复：防抖、取消 pending work、AbortController、幂等候选 DOM、批量 rehydrate
- [x] v011 compatibility contract/browser 改为验证当前 v012 family-decision + v014 workbench
- [x] 增加“输入辽宁后立即删除”桌面 1280px / 移动 390px 回归
- [x] 版本提升至 v014.15 / r077
- [x] 不携带 #287 的临时 CI fan-out 修改
- [x] 不改写 main 已存在但当前页面尚未接入的 v015.9 runtime
- [ ] 新 clean PR v014 contract/browser CI
- [ ] 必要全站门禁
- [ ] merge 后 main / Cloudflare / custom domain / API / data-SHA 验证

## CI边界

本 clean PR 不修改公共 `simulation-report.html`，避免触发历史 v001-v013 workflow 的共享页面路径 fan-out。当前页面仍加载同一 v014 runtime URL；Cloudflare 部署验证必须确认最终 runtime 内容 SHA 与 clean PR HEAD 一致。

历史 v001-v013 workflow 本身保留，后续可作为独立 CI 治理任务清理，不与本次功能修复混合。

## 数据所有权

专业目录、学校实体、历史招生记录与参考位次继续复用现有事实源，不复制招生事实。
