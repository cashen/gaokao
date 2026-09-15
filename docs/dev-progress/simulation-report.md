# 模拟志愿填报单页开发进度

分支：`feat/simulation-workspace-v015-human-input`
PR：待创建
基线 main：`6c18f7aeadfb66f5eef940d8f3ccb4cbe0d16a5a`
当前版本：`simulation-workspace-v015.0`
当前修订：`r074-human-workbench`
当前阶段：Phase 0 — 基线确认与 PR/断网续接建立

## 当前状态

- [x] 读取并确认 main 基线 SHA：`6c18f7aeadfb66f5eef940d8f3ccb4cbe0d16a5a`
- [x] 从该精确 SHA 创建 v015 独立分支
- [x] 创建 v015 总体执行计划：`docs/plans/simulation-workspace-v015-human-input.md`
- [ ] 创建 PR
- [ ] Phase 1 架构收口
- [ ] Phase 2 Human Input Engine
- [ ] Phase 3 School × Major 联合匹配
- [ ] Phase 4 Confirmation/Data Context
- [ ] Phase 5 Workbench Domain State
- [ ] Phase 6 Inbound/PDF/Accessibility
- [ ] Phase 7 Human Regression Matrix
- [ ] Phase 8 CI / Preview / merge / production verification

## 已知基线事实

- v014.11 已将宽泛专业、学校实际记录、最终学校+专业确认写入 release contract。
- 当前页面仍同时加载多个历史 runtime/bridge；v007 通过 Legacy DOM 同步字段，v006 仍监听全局 input bridge。
- 因此本次不是继续增加局部输入补丁，而是收口为单一 domain state + 非阻塞 Human Input Engine。

## 数据所有权

1. 专业目录：`shared/resources/majors/major-catalog-contract.js` + 2026 generated catalog。
2. 历史招生记录：`/api/ai/major-history`。
3. 学校实体：`tongxue/data/school-name-resolver-v150.js`。
4. 参考位次：既有 `ln-2026-physics-score-rank.js` 经 `/api/simulation-rank` bridge 使用。
5. 家庭草案/PDF：继续复用既有控制器与兼容层，不改变 selection-pool 事实真源。

## 断网续接规则

恢复时只认：

1. 本文件的最新提交与当前阶段。
2. GitHub PR 的真实状态与 head SHA。
3. `main` 的实时 SHA。
4. 最新专用 CI run/job 状态。
5. Preview/Production 的实际部署状态。

不得根据旧聊天内容推断某阶段已经完成；不得把 queued 当 passed；不得在没有实际证据时声称部署或生产验证成功。

## 修改安全规则

- 不使用 `git reset --hard`。
- 不使用 `git checkout --`。
- 不覆盖未知用户改动。
- 每次版本修订必须 bump version/revision。
- 失败先定位是产品、测试还是基础设施问题，再修改。
- 不能为通过测试给“机械”等关键词写特判。

## Merge Gate

只有 v015 Definition of Done 全部满足才允许合并 main：

- 所有输入不卡顿；
- 学校×专业严格交集；
- 宽泛专业相关反馈；
- 代码逐级删除；
- 中文 IME/粘贴/快速输入；
- 请求竞态/网络失败隔离；
- 换学校/专业旧确认失效；
- 家庭状态/排序/持久化；
- URL 入站；
- PDF/打印；
- Windows/Android Chrome/Alook/Pad；
- 专用 CI 与全站门禁；
- 最终 Preview 精确对应最终 HEAD；
- merge 后 main/Cloudflare/custom domain/API/data-SHA parity。

未全部完成不得 merge。
