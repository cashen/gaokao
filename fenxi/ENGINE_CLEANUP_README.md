# V2.92RC.engine-cleanup 开发包说明

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
- `assets/ln-refresh-controller.v292rc.js`：刷新机制观察器，当前不接管业务，只记录。
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
