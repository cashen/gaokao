# V2.92RC1.engine-cleanup 开发包说明

本包基于原始 `V2.91RC0.rules-closure4.front2` 做工程闭环收口，不沿用 V3.0RC 实验逻辑。

## 本版目标

- 保留原始高考志愿业务逻辑、公式、场景原则、A/B/C 生成原则。
- 保留既有业务逻辑文件名与核心命名资产。
- 规范化 JS 引用、规则职责、数据计算、运行时最终函数来源。
- 将当前默认加载链不再使用的旧代码移动到 `pendingdel/2026-v292-engine-cleanup/`。
- 提供 `/fenxi/debug.html` 一键工程闭环日志。

## 新增文件

- `assets/ln-reference-map.v292rc.js`：JS 层级、职责、最终 owner 说明。
- `assets/ln-runtime-registry.v292rc.js`：被动观察 `applyFilters`、`renderPlanABC`、`planScoreV29475`、详情卡对象的最终来源和 wrapper 链。
- `assets/ln-state-adapter.v292rc.js`：统一读取 DOM 状态，输出 context/contextHash，仅用于 debug 和后续规范化。
- `assets/ln-refresh-controller.v292rc.js`：刷新机制后置接管器，保留旧补丁链的事件逻辑，但将 `applyFilters` 收口为 managed 单入口，业务仍调用 compute-pipeline。
- `assets/ln-debug-baseline.v292rc.js`：debug 共享工具。

## pendingdel 说明

`pendingdel/2026-v292-engine-cleanup/manifest.pendingdel.v292rc.json` 记录了本轮移动的文件、类别和原因。

`pendingdel` 是隔离区/回滚区，不是垃圾桶。正式生产包可排除 `pendingdel`，开发包建议保留。

## 一键 Debug

部署后打开：

```txt
/fenxi/debug.html
```

点击：

```txt
运行一键 Debug
```

然后点：

```txt
复制日志
```

把完整 JSON 发回即可快速定位：

- 资源是否缺失
- chunks 是否完整
- pendingdel 清单是否可读
- index 动态加载链是否正常
- `applyFilters` wrapper 层数
- `renderPlanABC` 最终来源
- `LN_DETAIL_CARD_UI_V2981` 最终来源
- 原始 SP 补丁链的工程风险

## 不做的事

- 不改 Cloudflare Functions。
- 不改数据结构。
- 不改业务公式。
- 不改 rules-closure4 的业务原则。
- 不引入 V3.0RC family-decision-engine 实验逻辑。

## V2.92RC1.engine-cleanup 继续收口说明

本轮不是业务升级，不改变：位次/分数公式、候选池规则、场景原则、A/B/C 业务含义、rules-closure4 结果、详情卡解释原则。

本轮核心改动：

1. `ln-refresh-controller.v292rc.js` 从观察器升级为后置接管器。
2. 页面仍按原始顺序加载 `app.v2983`、`interact-stability`、`interact-dedupe`，保留旧补丁的事件监听和指纹逻辑。
3. 等历史补丁完成 wrapper 后，refresh-controller 捕获旧链路，并把 `window.applyFilters` 收口成一个 managed 单入口。
4. managed 单入口内部仍调用 `LN_COMPUTE_PIPELINE_V2983.applyFilters`，所以业务计算没有改写。
5. debug.html 会显示：当前 applyFilters 层数、是否 managed、历史 capturedDepth、refreshController 统计。
6. 如果 debug 显示 `applyFilters层 = 1 / managed` 且 `历史捕获层 = 4`，说明旧 SP wrapper 已被后置收口，业务计算仍保真。

下一步如果继续精简，可以在确认两轮 debug 均 PASS 后，把 `interact-dedupe` 和 `interact-stability` 的 applyFilters wrapper 职责进一步并入 refresh-controller，只保留它们的 drawer/event 监听职责。
