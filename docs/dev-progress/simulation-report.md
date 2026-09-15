# 模拟志愿填报单页开发进度

分支：`feat/simulation-workspace-v015-human-input`
PR：#286
基线 main：`6c18f7aeadfb66f5eef940d8f3ccb4cbe0d16a5a`
当前版本：`simulation-workspace-v015.6`
当前修订：`r080-immediate-local-feedback`
当前阶段：Phase 1/2 implementation + regression
当前 HEAD：以 GitHub PR #286 实时 HEAD 为唯一事实；本文件不替代 GitHub 状态。

## 本 checkpoint 已完成

- [x] 从 main 精确 SHA 创建独立 v015 分支。
- [x] 创建 PR #286，保持 Draft，未允许 merge。
- [x] 创建完整计划 `docs/plans/simulation-workspace-v015-human-input.md`。
- [x] 创建 v015 release contract。
- [x] 新建 v015 Human Input controller。
- [x] 页面停止加载 v006 input bridge 与 v014 input controller，输入主路径切到 v015。
- [x] v015 使用 AbortController/request token 隔离异步结果。
- [x] 宽泛专业先给本地目录反馈，再按已确认学校实际专业记录收敛。
- [x] 学校×专业候选严格以实际学校记录为边界。
- [x] 专业代码保留可编辑中间态。
- [x] 中文 IME composition 生命周期保护，并补 compositionend 后正式匹配。
- [x] browser regression 使用真实 Backspace 连续删除。
- [x] v007 旧 workbench 移除正常运行期间 500ms 周期性 render，减少输入干扰。
- [x] 学校变化会取消专业请求、清除旧专业确认，并对保留的专业输入重新核对。
- [x] fact cache 已加入，避免同一学校+专业查询重复请求。
- [x] v015.5 加入 180ms 异步核验 debounce。
- [x] v015.6 修正 debounce 后的体验回归：本地专业目录反馈在输入事件内即时显示，只有异步学校/事实核验延迟。
- [x] 版本已提升到 `v015.6/r080`。

## 尚未完成

- [ ] Legacy compatibility 最终收口，并证明 PDF/排序/家庭状态无回归。
- [ ] 真实粘贴/中文 IME/快速输入 browser regression 全覆盖。
- [ ] School × Major 全场景：精确、关键词、代码类、学校无该专业、换学校/换专业确认失效。
- [ ] URL inbound 冲突/duplicate 全覆盖。
- [ ] 刷新/返回/后台恢复全覆盖。
- [ ] PDF/多页/Android/Alook/Pad/Windows 回归。
- [ ] 真实学校 resolver + mock fact source 的浏览器场景扩充。
- [ ] API debounce/缓存/取消策略以最终 HEAD 做请求数量回归。
- [ ] v015 contract/browser CI 全部通过并核验最终 HEAD。
- [ ] 全站 release/runtime/production/tree integrity 门禁通过。
- [ ] 最终 Preview 必须精确对应最终 HEAD。
- [ ] merge 后重新验证 main/Cloudflare/custom-domain/API/data-SHA parity。

## 本 checkpoint 发现并纠正的风险

1. **周期性 render**：v007 原先每 500ms 调用 render；已移除，避免用户输入期间被无意义刷新干扰。
2. **学校变化后的旧专业状态**：已取消专业异步任务、清空 `majorName`，并在新学校确认后重新核对保留的专业输入。
3. **compositionend 漏触发**：已在 compositionend 后按当前字段值重新进入 v015 输入流程；普通 input 仍可幂等处理。
4. **回归测试过弱**：已把专业代码删除改为真实 Backspace，并加入学校不存在专业、换学校和请求计数检查。
5. **debounce 误伤本地反馈**：v015.5 初版把整个 majorInput 延迟，导致本地目录反馈也延迟；v015.6 将本地 preview 与异步核验分离，保证输入即时可见。

## 当前仍需重点验证

- v015 仍通过 v007 兼容层完成排序/PDF/家庭状态等非输入职责；不能在没有回归证据前宣称已完全移除 Legacy。
- fuzzy fallback 虽已有缓存，但仍可能对多个本地候选逐项查询；必须继续优化并以请求计数证明，而不是增加关键词特判。
- CI 当前仅能证明 run/job 的真实状态；queued/pending/unknown 均不视为通过。

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
4. 最新 v015 CI run/job；旧 SHA 结果不得替代新 HEAD。
5. Preview/Production 实际部署状态。

不得从聊天记录推断完成状态；不得把 queued/pending/unknown 当 passed；不得声称未验证的浏览器、Alook、生产状态已通过。

## 修改安全规则

- 不使用 `git reset --hard`。
- 不使用 `git checkout --`。
- 不覆盖未知用户改动。
- 每次代码修订必须 bump version/revision。
- 测试失败先区分产品、测试、环境问题。
- 不为“机械”等示例写特判。
- 不把全国专业目录候选冒充学校专业。

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
