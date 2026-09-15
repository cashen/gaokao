# 模拟志愿工作台 v015：Human Input + School × Major 联合匹配

- 版本：`simulation-workspace-v015.0`
- 修订：`r074-human-workbench`
- 基线 main：`6c18f7aeadfb66f5eef940d8f3ccb4cbe0d16a5a`
- 分支：`feat/simulation-workspace-v015-human-input`
- 页面：`/ln-rank/simulation-report.html`
- 目标：把模拟志愿恢复为真正以人为中心的输入/核对/整理工作台，解决输入卡顿、专业关键词无反馈、学校与专业未形成严格交集，以及由 Legacy bridge/rerender 造成的一系列潜在问题。

## 0. 不可违反的产品原则

1. 用户输入的是意图，不等于已经确认的学校/专业实体。
2. 专业目录只负责理解“用户想找什么”；不能证明某学校开设该专业。
3. 最终专业结果必须与已确认学校的实际专业/招生记录交叉匹配。
4. 宽泛输入（如“机”“机械”“自动化”“计算机”）必须给相关反馈，但绝不能偷偷替用户选择一个专业。
5. 专业代码允许合法中间态：`0 → 08 → 080 → 0803 → 08030 → 080301`；删除任何一级都必须即时响应。
6. 网络请求不得阻塞输入、删除、焦点或基本编辑。
7. 请求结果只能更新与其输入快照对应的状态；旧请求不能覆盖新输入。
8. 中文输入法 composition、粘贴、快速连续键入、Alook/Chrome 都必须正常。
9. 学校或专业改变后，依赖旧实体的“已确认”状态必须失效并重新验证。
10. “专业存在”“学校开设”“当前年度招生”“辽宁物理类招生”“历史可比较记录”必须保持语义区分。
11. 家庭决策状态、事实状态、输入状态、UI 展开状态彼此独立，重新渲染不得互相覆盖。
12. 不引入“冲稳保”。不伪造招生事实，不用 AI/调试术语替代家长可理解的反馈。
13. 不重新造数据真源：继续复用学校 resolver、2026 专业目录、既有历史 API、位次 bridge、PDF/selection-pool 能力。

## Phase 1 — 架构收口：移除输入链路的 Legacy 反复同步

### 目标

让新工作台拥有单一 domain state；Legacy runtime 仅作为必要兼容/迁移层，不再参与每个字符的输入闭环。

### 工作

- 梳理 v001/v005/v006/v007/v010/v012/v014 的实际职责和依赖。
- 新建 v015 runtime/domain controller；统一管理志愿实体与输入状态。
- 输入事件直接进入 v015 state，不再 `input → legacy DOM → dispatch → render → observer → input`。
- 去除或隔离 500ms 全局 render/轮询和由其造成的输入干扰。
- MutationObserver 不得承担业务状态同步；如保留，只用于一次性兼容初始化并有明确边界。
- 保留既有存储格式的迁移能力，不破坏已有家庭志愿。
- 任何删除/清空/排序都必须操作稳定 row id，而非 DOM 位置。

### 验收

- 连续输入和删除不丢字符、不抢焦点、不出现明显停顿。
- 无循环 dispatch。
- domain state 是唯一业务真源。

## Phase 2 — Human Input Engine

### 输入状态

`idle / typing / resolving / candidate / matched / mismatch / network-error`

### 学校

- trim/空白规范化、简称/别名、轻度错别字候选。
- 输入中只显示候选，不自动选择第一项。
- 单一明确学校可进入候选/确认，但仍保留可见的确认语义。
- 清空学校立即清空依赖的学校确认，不阻塞输入。

### 专业

统一识别：

- 代码：`0/08/080/0803/08030/080301` 等中间态。
- 完整名称：精确候选。
- 前缀/关键词：`机/机械/机械设计/自动化/计算机/网络/电气/材料...`。
- 模糊输入/错别字：候选提示，不自动改写。

### 中文 IME / 粘贴

- 正确处理 `compositionstart/update/end`。
- composition 中不做破坏性匹配或改写。
- compositionend 后再进入正式匹配。
- 粘贴“东北大学 自动化”“东北大学  自动化”“东北大学-自动化”等常见人类输入必须合理解析为候选，不要求固定格式。

### 验收

- `机械` 必须有相关专业反馈，不能判为“无匹配”。
- `机` 不得空白无反馈。
- `机械设计` 有候选。
- 完整专业可精确匹配。
- `0803` 明确显示专业类含义。
- `080301` 可精确识别。
- 连续删除 `080301 → 08030 → 0803 → 080 → 08 → 0 → 空` 每步立即可编辑。
- 连续删除 `自动化 → 自动 → 自 → 空` 每步立即可编辑。

## Phase 3 — School × Major 联合匹配引擎

### 核心流程

`用户专业意图 → 专业目录候选 → 已确认学校实际专业集合 → 交集 → 当前事实核验 → 最终状态`

### 规则

- 全国专业目录候选不是学校事实。
- 已确认学校后，宽泛专业必须优先在该学校实际记录中收敛。
- `东北大学 + 机械` 只能返回东北大学实际存在/记录中的相关专业。
- `东北大学 + 自动化` 必须出现明确的相关/精确反馈，而不是空白。
- `东北大学 + 0803` 必须以东北大学实际 `0803` 专业记录为边界。
- 学校没有某专业时明确提示“该校暂未找到对应专业记录”，不得把全国目录候选冒充该校专业。
- 专业只有全国目录命中但学校实际记录未知时，状态为待核实，不得标为已匹配。
- 同一学校多候选时按相关度排序，并告诉用户需要进一步输入/选择。

### 取消竞态

- 使用 AbortController/request sequence/input snapshot。
- 新输入产生后旧请求不得写回。
- 同一 schoolEntity + major intent 使用缓存，避免逐字 API 风暴。
- debounce 只作用于异步查询，不作用于本地输入显示。

## Phase 4 — Confirmation/Data Context

建立明确的确认依赖：

`schoolEntity + majorEntity + dataContext → confirmation`

任何一项变化都使旧 confirmation 失效。

必须区分：

1. 专业目录存在。
2. 学校实际开设/记录存在。
3. 当前年度招生记录。
4. 辽宁物理类招生记录。
5. 历史记录是否可比较。
6. 网络异常与数据不存在。

禁止用“历史查询成功”反向证明专业一定可填。

## Phase 5 — Workbench Domain State

拆分：

- `inputState`
- `entityState`
- `factState`
- `familyDecisionState`
- `uiState`

覆盖：

- 添加空白志愿。
- 编辑学校/专业。
- 排序后所有字段跟随同一 row id。
- 删除只影响模拟清单，不影响正式填报。
- 清空有明确后果提示。
- 家庭状态不被重新渲染覆盖。
- 展开/收起状态不因普通输入丢失。
- 刷新、返回、切后台回来后草稿可恢复。
- 已确认实体与候选状态不可被旧 render 偷换。

## Phase 6 — Inbound / PDF / Accessibility

### URL 入站

测试：

- school only
- major only
- school + majorCode
- school + majorName
- majorCode 与 majorName 冲突
- duplicate
- 已有志愿再次进入

冲突必须可见提示，不静默选择。

### PDF

继续复用现有 PDF 能力，重点回归：

- Windows Chrome
- Android Chrome
- Android Alook
- Pad
- 多页分页
- 第二页必要头信息
- 待核实字段保留空白/明确提示
- 无 `undefined`/内部状态/debug 文案
- 不出现“冲稳保”

## Phase 7 — Human Regression Matrix

### 输入

- `东北大学`
- `东北大学 + 自动化`
- `东北大学 + 机械`
- `东北大学 + 0803`
- `东北大学 + 080301`
- `机械`
- `机`
- `计算机`
- `网络`
- `自动化`
- `测空技术与仪器`
- 快速键入/快速删除
- 中文 IME
- 粘贴

### 状态变化

- 选定学校后改学校。
- 选定专业后改专业。
- 输入中切换焦点。
- 请求未完成时继续编辑。
- 请求返回顺序反转。
- 刷新恢复。
- 排序/删除/家庭状态。

### 尺寸/浏览器

- Windows Chrome 1280+
- Android Chrome 390px
- Android Alook 390px
- Pad 竖屏/横屏
- 768px 中间宽度

## Phase 8 — CI / 断网续接 / Merge Gate

### 断网续接

`docs/dev-progress/simulation-report.md` 必须在每个阶段更新：

- 当前 branch
- PR number
- 当前 HEAD
- 基线 main SHA
- 当前版本/revision
- 已完成阶段
- 正在执行阶段
- 阻塞原因（如有）
- 最新 CI run/job
- 下一步唯一动作

任何新会话恢复时，先读取该文件、PR、branch HEAD、main HEAD、最新 CI；不得根据聊天记录推断完成状态。

### CI

新增/更新专用 v015 contract/browser regression，至少覆盖：

- static contract
- domain/state contract
- browser input
- school × major matching
- IME/rapid edit
- persistence
- PDF contract
- mobile/desktop selectors

CI 失败必须区分：

- 产品代码错误
- 测试错误
- 环境/网络错误
- CI 排队/基础设施问题

不得把 queued 当 passed，也不得因测试本身写错而修改产品逻辑。

### Merge Gate

严格执行：

1. PR 保持 Draft，直到所有实现阶段完成。
2. 每阶段先代码/静态测试，再 browser/regression。
3. Ready for Review 前必须保存最终 branch HEAD。
4. Preview 必须对应最终 HEAD SHA。
5. Ready 后重新跑/读取最终 HEAD 的专用 CI 和全站门禁。
6. 发现任何失败先修复，再重新验证最终 HEAD。
7. **未完成全部任务不得 merge。**
8. merge 时使用 expected head SHA，防止误合并其他版本。
9. merge 后重新读取 main SHA。
10. 重新核验 Cloudflare Preview/Production、custom domain、API health、关键数据 SHA parity。
11. 旧 SHA 的通过证据不能替代最终 merge SHA 证据。

## 明确禁止

- 不得 `git reset --hard`。
- 不得 `git checkout --` 覆盖用户改动。
- 不得为了通过测试写关键词特判（例如只给“机械”加 if）。
- 不得用全国专业目录伪造学校专业。
- 不得让异步 API 控制输入框生命周期。
- 不得通过不断增加 CSS/JS patch 掩盖双运行时架构问题。
- 不得恢复已经废弃的旧页面视觉结构，只为满足旧测试。
- 不得声称未验证的 CI/部署/生产状态为成功。

## Definition of Done

只有同时满足以下条件才允许合并 main：

- [ ] v015 domain/input architecture 完成。
- [ ] 学校/专业输入不卡顿。
- [ ] 宽泛专业有相关反馈。
- [ ] 学校 × 专业严格交集成立。
- [ ] 专业代码可逐级删除。
- [ ] 中文 IME/粘贴/快速输入正常。
- [ ] 请求竞态与网络失败隔离。
- [ ] 换学校/换专业不会残留旧确认。
- [ ] 家庭状态/排序/持久化无回归。
- [ ] URL 入站无冲突误导。
- [ ] PDF/打印多端回归通过。
- [ ] Alook/Chrome/Windows/Pad 回归通过。
- [ ] v015 专用 CI 全部通过或有明确、独立、可验证的基础设施阻塞记录；产品错误不得以环境理由放行。
- [ ] Preview 精确对应最终 HEAD。
- [ ] merge 后 main SHA 与生产部署/关键资源完成最终核验。
