# 模拟志愿填报单页开发进度

分支：`feat/simulation-workspace-v015-human-input`
PR：#286
基线 main：`6c18f7aeadfb66f5eef940d8f3ccb4cbe0d16a5a`
当前版本：`simulation-workspace-v015.0`
当前修订：`r074-human-workbench`
当前阶段：Phase 1/2 implementation + regression
当前 HEAD：以 GitHub branch `feat/simulation-workspace-v015-human-input` 为准；不要从聊天记录猜测。

## 已完成

- [x] 从 main 精确 SHA 创建独立 v015 分支。
- [x] 创建 PR #286，保持 Draft，未允许 merge。
- [x] 创建完整计划 `docs/plans/simulation-workspace-v015-human-input.md`。
- [x] 创建 v015 release contract。
- [x] 新建 v015 Human Input controller。
- [x] 页面停止加载 v006 input bridge 与 v014 input controller，输入主路径切到 v015。
- [x] v015 使用 AbortController/request token 隔离异步结果。
- [x] 宽泛专业先给本地目录反馈，再按已确认学校实际记录收敛。
- [x] 学校×专业候选严格以实际学校记录为边界。
- [x] 专业代码保留可编辑中间态。
- [x] 加入中文 IME composition 生命周期处理。
- [x] 加入 v015 static contract/browser regression 初版。
- [x] 加入 v015 GitHub Actions workflow。

## 尚未完成

- [ ] 完成 v015 domain state 与 Legacy compatibility 的最终收口，确认不破坏现有 PDF/排序/家庭状态。
- [ ] 完善 IME：compositionend 后的最终 input 事件覆盖。
- [ ] 完善真实逐字符删除测试，而非仅验证重新设置值。
- [ ] 学校/专业换值后的 confirmation dependency 完整落地。
- [ ] URL inbound 冲突/duplicate 全覆盖。
- [ ] 刷新/返回/后台恢复全覆盖。
- [ ] PDF/多页/Android/Alook/Pad/Windows 回归。
- [ ] 真实学校 resolver + mock fact source 的浏览器场景扩充。
- [ ] API cache/debounce 进一步优化，避免 fuzzy fallback 多次串行查询。
- [ ] v015 contract/browser CI 全部通过。
- [ ] 全站 release/runtime/resource/production/tree integrity 门禁通过。
- [ ] 最终 Preview 必须精确对应最终 HEAD。
- [ ] merge 后重新验证 main/Cloudflare/custom-domain/API/data-SHA parity。

## 当前已知实现风险

1. v007 仍负责 workbench legacy 数据控制与 render；v015 已停止 v006/v014 输入桥，但必须继续验证排序、PDF、家庭状态没有回归。
2. v015 当前 fuzzy fallback 为安全优先实现，可能产生多次实际记录请求；Phase 3 必须增加缓存/批量策略，不能以增加关键词特判解决。
3. IME 逻辑已经阻止 composition 中的业务输入，但必须用真实 browser regression 验证 compositionend 后行为。
4. 浏览器测试初版需要修正为真正逐字符删除，不能把“重新填值”冒充删除测试。

## 数据所有权

1. 专业目录：`shared/resources/majors/major-catalog-contract.js` + 2026 generated catalog。
2. 历史招生记录：`/api/ai/major-history`。
3. 学校实体：`tongxue/data/school-name-resolver-v150.js`。
4. 参考位次：既有 `ln-2026-physics-score-rank.js` 经 `/api/simulation-rank` bridge 使用。
5. 家庭草案/PDF：继续复用既有控制器与兼容层，不改变 selection-pool 事实真源。

## 断网续接规则

恢复时严格按以下顺序重新核实：

1. 本文件最新版本/阶段。
2. PR #286 实际 state/head SHA。
3. `main` 实时 SHA。
4. 最新 v015 CI run/job。
5. Preview/Production 实际部署状态。

不得把 queued 当 passed；不得把旧 SHA 的通过结果当作新 HEAD 的证据；不得声称未验证的浏览器、Alook、生产状态已通过。

## 修改安全规则

- 不使用 `git reset --hard`。
- 不使用 `git checkout --`。
- 不覆盖未知用户改动。
- 每次代码修订必须 bump version/revision。
- 测试失败先区分产品、测试、环境问题。
- 不为“机械”等示例写特判。

## Merge Gate

**未全部完成不得 merge。**

必须同时满足：

- 输入/删除不卡顿；
- 学校与专业严格交集；
- 宽泛专业有相关反馈；
- 中文 IME/粘贴/快速输入；
- 请求竞态/网络失败隔离；
- 换学校/专业旧确认失效；
- 家庭状态/排序/持久化；
- URL inbound；
- PDF/打印多端；
- Windows/Android Chrome/Alook/Pad；
- v015 专用 CI 与全站门禁；
- 最终 Preview 精确对应最终 HEAD；
- merge 后 main/Cloudflare/custom-domain/API/data-SHA parity。
