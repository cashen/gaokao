# 模拟志愿填报单页开发进度

分支：`feat/simulation-workspace-v015-human-input`
PR：#286
基线 main：`6c18f7aeadfb66f5eef940d8f3ccb4cbe0d16a5a`
当前版本：`simulation-workspace-v015.9`
当前修订：`r083-exact-school-major-confirmation`
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
- [x] v015.7 增加 runtime syntax static contract，浏览器回归前先阻断语法错误。
- [x] v015.8 将 browser regression 扩展到 390/768/1280 三种 viewport，并覆盖快速逐字输入、IME lifecycle、paste、连续 Backspace、学校无专业、网络失败、换学校和请求预算。
- [x] v015.9 修正最终学校专业确认过宽的问题：当候选同时带有专业名称和专业代码时，实际记录必须同时满足学校、名称、代码，不能仅因名称相同而误确认。
- [x] 每次代码修订均递增 version/revision。

## 尚未完成

- [ ] Legacy compatibility 最终收口，并证明 PDF/排序/家庭状态无回归。
- [ ] 真实粘贴/中文 IME/快速输入 browser regression 全覆盖（当前为自动化 lifecycle/事件回归，仍需尽可能接近真实终端行为）。
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

## 本 checkpoint 新增跟踪方法

1. **三端尺寸矩阵**：同一场景同时覆盖 390 / 768 / 1280，避免只在手机宽度通过。
2. **输入生命周期矩阵**：普通输入、快速逐字输入、IME compositionstart/compositionend、paste、真实 Backspace 分开验证。
3. **事实边界矩阵**：学校实际专业存在、学校实际专业不存在、全国目录存在但学校记录不存在、网络失败分别验证文案和状态。
4. **状态转换矩阵**：学校变化、专业变化、旧确认失效、候选重新核对必须验证，不只验证最终字段值。
5. **性能证据**：请求计数纳入回归；发现重复查询时优先优化缓存/取消/debounce，不用关键词特判。
6. **证据分层**：静态 contract → 浏览器行为 → CI → Preview exact SHA → Production parity，任何上层证据不能替代下层缺失证据。
7. **故障分类**：测试失败必须先区分产品 bug、测试脚本 bug、数据/接口契约问题、GitHub runner/环境问题，再决定修代码还是修测试。
8. **事实确认双键**：最终专业确认若同时存在名称和代码，必须要求名称与代码均匹配，防止“同名不同代码”误确认。

## 本 checkpoint 发现并纠正的风险

1. **周期性 render**：v007 原先每 500ms 调用 render；已移除，避免用户输入期间被无意义刷新干扰。
2. **学校变化后的旧专业状态**：已取消专业异步任务、清空 `majorName`，并在新学校确认后重新核对保留的专业输入。
3. **compositionend 漏触发**：已在 compositionend 后按当前字段值重新进入 v015 输入流程；普通 input 仍可幂等处理。
4. **回归测试过弱**：已把专业代码删除改为真实 Backspace，并加入学校不存在专业、换学校和请求计数检查。
5. **debounce 误伤本地反馈**：v015.5 初版把整个 majorInput 延迟，导致本地目录反馈也延迟；v015.6 将本地 preview 与异步核验分离，保证输入即时可见。
6. **运行时代码语法缺少独立门禁**：v015.7 在 contract 中加入去除 import 后的 `new Function` 语法校验，避免浏览器任务才暴露低级语法错误。
7. **单 viewport 假通过**：v015.8 扩展到手机、Pad、桌面同一行为矩阵，降低“只在 390px 正常”的风险。
8. **最终确认条件过宽**：v015.9 发现 `exactRecord` 原先使用“代码或名称任一匹配”，可能让同名但代码不同的专业被误确认；现改为提供什么就必须全部匹配。

## 当前仍需重点验证

- v015 仍通过 v007 兼容层完成排序/PDF/家庭状态等非输入职责；不能在没有回归证据前宣称已完全移除 Legacy。
- fuzzy fallback 虽已有缓存，但仍可能对多个本地候选逐项查询；必须继续优化并以请求计数证明，而不是增加关键词特判。
- paste 自动化测试验证的是浏览器事件链，不等价于所有 Android/Alook 原生粘贴实现，仍需终端级回归。
- CI 当前只能证明 run/job 的真实状态；queued/pending/unknown 均不视为通过。

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
6. 若 HEAD 已变化，重新计算本轮所有证据，不沿用上一 HEAD 的结论。

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
