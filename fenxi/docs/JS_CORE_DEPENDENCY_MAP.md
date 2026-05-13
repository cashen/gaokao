# V2.91RC0 JS Core 依赖清单

## 总体分层

当前主入口 JS 建议按以下层级理解：

1. foundation-core
2. qualification-core
3. rules-profile-core
4. rules-interest-core
5. rules-path-core
6. runtime-interest-core
7. ui-core
8. rules-decision-core
9. rules-detail-export-core
10. model-loader-core
11. engine-core
12. render-orchestrator-core
13. app-orchestrator-core
14. patch-core
15. debug-core

本清单用于后续安全收口，不代表 V2.91RC0 已经合并这些文件。

---

## foundation-core

建议包含：

- config inline / config.v297fix2.js
- interaction-policy.v297fix2.js
- perf-monitor.v297fix2.js
- debug-runtime.v2983.js
- candidate-cache.v297fix2.js
- state-snapshot.v297fix2.js
- refresh-scheduler.v297fix2.js
- drawer.v297fix2.js

对外能力：

- LN_CONFIG
- DATA_FILES
- LN_DEBUG_V2983
- LN_STATE_SNAPSHOT_V296
- LN_REFRESH_SCHEDULER_V296
- LN_DRAWER_V296

结论：底座层，必须靠前加载，不能延后。

---

## qualification-core

建议包含：

- qualification-gate-rules.v297fix2.js
- qualification-gate.v297fix2.js
- qualification-gate-ui.v297fix2.js

用途：资格型计划隐藏、专项/预科/民族班等入口保护。

结论：影响候选池入口安全，不放入普通 UI-core。

---

## rules-profile-core

建议包含：

- student-profile-rules.v2981.js
- profile-interest-bridge-rules.v2981.js
- student-profile-normalizer.v2981fix2.js

用途：学生画像规则、画像与兴趣桥接、画像状态规范化。

注意：保留 V2975 / V2976 / V298 / V2981 兼容别名。

---

## rules-interest-core

建议包含：

- interest-taxonomy.v298.js
- child-intent-translator.v298fix1.js
- child-intent-interest-map.v298.js
- catalog-interest-binding.v298.js
- candidate-catalog-normalizer.v298.js
- catalog-match-engine.v298.js
- interest-hit-summary.v298.js
- interest-weight-rules.v298.js
- intent-conflict-rules.v298.js

用途：兴趣方向、孩子口语意图、目录绑定、兴趣真实命中、兴趣权重、兴趣冲突。

安全合并要求：只按原顺序拼接，不改别名，不改逻辑。

---

## rules-path-core

建议包含：

- path-review-rules.v298.js
- major-misread-rules.v298.js
- score-rank-band-rules.v298.js
- path-scenario-rules.v298.js
- path-explain-engine.v298.js

用途：路径解释、易误读提醒、分数段解释、场景路径说明。

风险提示：score-rank-band-rules 涉及分段口径，只能原样合并，不能改。

---

## runtime-interest-core

建议包含：

- child-interest-runtime.v298fix1.js

用途：兴趣状态桥梁，连接 UI、规则、筛选和调度。

结论：不放入 rules-core，也不放入 UI-core，单独保留。

---

## ui-core

建议拆分：

### ui-form-step-core

- student-profile-ui.v2981.js
- child-interest-ui.v298fix1.js
- child-intent-ui.v2981.js
- scenario-ui.v298.js

### ui-interest-profile-core

- profile-interest-summary.v2981fix1.js
- profile-interest-summary.v2981fix2.js
- interest-interaction-lite.v2983fix3.js
- interest-drawer-slim.v2983fix4.js

### ui-result-card-core

- abc-view.v298.js
- candidate-card-view.v298.js
- candidate-tag-ui.v2981.js
- abc-decision-ui.v2981.js

### ui-detail-export-core

- detail-card-ui.v2981.js
- detail-card-lite-ui.v2981fix1.js
- detail-card-lite-ui.v2981fix2.js
- notice-compact-ui.v2981fix1.js
- notice-compact-ui.v2981fix2.js
- context-summary-ui.v2981fix1.js
- export.v2981.js

安全要求：第一版 UI-core 只合并，不延后，不改 DOM、id、class、data-action。

---

## rules-decision-core

建议包含：

- admission-safety-rules.v2981.js
- admission-evidence-rules.v2981.js
- candidate-decision-tags.v2981.js
- candidate-tradeoff-rules.v2981.js
- abc-decision-card-model.v2981.js
- detail-candidate-card-model.v2981.js
- export-decision-fields.v2981.js

用途：候选决策标签、A/B/C 解释、导出字段基础。

---

## rules-detail-export-core

建议包含：

- selection-context-summary.v2981fix1.js
- notice-compact-rules.v2981fix1.js
- decision-reminder-dedupe.v2981fix1.js
- campus-location-rules.v2981fix2.js
- parent-must-read-rules.v2981fix2.js
- export-decision-fields.v2981fix2.js
- decision-reminder-dedupe.v2981fix2.js
- detail-card-lite-model.v2981fix1.js
- detail-card-lite-model.v2981fix2.js
- decision-context-model.v2982.js

用途：详情卡、导出报告、家长必读、校区位置、提醒去重。

---

## model-loader-core

建议保持独立：

- major-name-model.v2946.js
- confusable-major-model.v29462.js
- safeperf.v29rc1.js 作为 patch-safeperf，不与 data-engine 混合

原因：safeperf 已经包裹模型加载，混入 data-engine 会模糊边界。

---

## engine-core

暂不合并，只审计。

### engine-data-core

- data-engine.v297fix2.js

### engine-filter-core

- filter-engine.v298fix1.js
- region-filter-rules.v2983fix5.js

### engine-compute-core

- compute-pipeline.v2983.js

### engine-plan-core

- plan-engine.v297fix2.js

### render-orchestrator-core

- render.v2981.js
- selection.v297fix2.js

结论：engine 层高风险，先做 facade 和审计，不做实际合并。

---

## app-orchestrator / coordinator

当前相关：

- app.v2981.js
- app.v2983.js
- refresh-scheduler.v297fix2.js
- drawer.v297fix2.js
- safeperf.v29rc1.js
- interact-stability.v29rc1.js
- interact-dedupe.v29rc2.js

后续建议新增：

- app-coordinator.v29rc.js

用途：统一 dispatch、requestApply、drawer 生命周期、debug 归因。

---

## patch-core

当前 patch：

- safeperf.v29rc1.js
- interaction-stability.v2982.js
- scroll-lock-guard.v2982fix2.js
- abc-light-ui.v2983fix3.js
- interest-interaction-lite.v2983fix3.js
- interest-drawer-slim.v2983fix4.js
- module-step-priority.v2983fix3.js
- app.v2983.js
- interact-stability.v29rc1.js
- interact-dedupe.v29rc2.js

要求：patch-core 必须靠后加载，不提前，不混入 rules-core / engine-core。

---

## 最安全收口顺序

1. rules-profile-core + rules-interest-core + rules-path-core
2. rules-decision-core + rules-detail-export-core
3. ui-form-step-core + ui-interest-profile-core
4. ui-result-card-core + ui-detail-export-core
5. app-coordinator 门面
6. engine-facade 审计
7. 发布包瘦身


---

## V2.91RC0.rules-core1 补充说明

- 基线：V2.91RC0。
- 本版只做规则类脚本按真实加载顺序的安全分段合并。
- 新增回退开关：`LN_RULES_BUNDLE_OPT`。
- 不改 `compute-pipeline`、`filter-engine`、`plan-engine`、`render`、`app`、`safeperf`、`interact1/interact2`。
- debug deep 自测新增“rules-core1 分段规则包加载与导出检查”。

---

## V2.91RC0.ui-core1 分段 UI 包

本版在 rules-core1 基线之上新增 6 个 UI 分段包。原则：按当前 `index.html` 的真实连续加载片段原样拼接，不重排、不删旧文件、不改 DOM 与点击语义。

### ui-form-step-core

- `child-interest-ui.v298fix1.js`
- `child-intent-ui.v2981.js`
- `scenario-ui.v298.js`

### ui-result-basic-core

- `abc-view.v298.js`
- `candidate-card-view.v298.js`

### ui-candidate-detail-early-core

- `candidate-tag-ui.v2981.js`
- `detail-card-ui.v2981.js`

### ui-notice-profile-early-core

- `notice-compact-ui.v2981fix1.js`
- `profile-interest-summary.v2981fix1.js`

### ui-detail-notice-late-core

- `detail-card-lite-ui.v2981fix2.js`
- `notice-compact-ui.v2981fix2.js`

### ui-late-interaction-core

- `abc-light-ui.v2983fix3.js`
- `interest-interaction-lite.v2983fix3.js`
- `interest-drawer-slim.v2983fix4.js`
- `module-step-priority.v2983fix3.js`

### 安全边界

- 不合并 `compute-pipeline`、`filter-engine`、`plan-engine`、`data-engine`。
- 不合并 `app.v2981.js` / `app.v2983.js`。
- 不修改 UI 文件内部逻辑，只做边界注释拼接。
- 可通过 `LN_UI_BUNDLE_OPT=false` 回退到旧 UI 单文件加载队列。


## V2.91RC0.coordinator1 协调层

新增文件：

- `assets/app-coordinator.v291rc0coord1.js`

导出：

- `LN_APP_COORDINATOR`
- `LN_APP_COORDINATOR_OPT`
- `LN_APP_COORDINATOR_VERSION`

职责：

- 统一事件/刷新/渲染请求的门面入口
- 提供 `snapshot()` 与 `fingerprint()`
- 提供 `requestApply()` / `requestRender()` 的 dry-run/显式执行接口
- 提供 `drawer.open/close/markDirty` 状态记录
- 写入 `LN_DEBUG_V2983` 的 `appCoordinator` 标记

边界：

- 不替换 `applyFilters`
- 不替换 `renderCards`
- 不迁移 `app.v2981` / `app.v2983`
- 不改 engine
