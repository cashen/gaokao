# V2.91RC0 基线说明

## 当前生产基线

- 对外版本：V2.91RC0｜工程化基线与安全收口预备版
- 版本戳：291rc0-20260513
- 内部来源：V2.9.8.3.fix12 + V2.9RC.fix-safeperf1 + V2.9RC.fix-interact1 + V2.9RC.fix-interact2
- 生产入口：`/fenxi/index.html`
- 诊断入口：`/fenxi/debug.html`
- 禁止参考：V3 / v3 目录 / V3 Store / V3 Wizard / V3 compute

## 本版定位

本版不是公式调整版，不是筛选规则调整版，也不是 JS 大合并版。

本版只做三件事：

1. 统一页面、debug、自测报告的版本口径为 V2.91RC0。
2. 补齐工程化文档：基线、回退、测试矩阵、性能预算、JS 分层依赖清单。
3. 增加 V2.91RC0 发布验证脚本。

## 保留的已验证补丁层

- safeperf1：`safeperf.v29rc1.js`
- interact1：`interact-stability.v29rc1.js`
- interact2：`interact-dedupe.v29rc2.js`

## 严格不变范围

- 不改公式
- 不改筛选规则
- 不改 A/B/C 推荐逻辑
- 不改兴趣真实命中
- 不改地域 hard 规则
- 不改 compute-pipeline
- 不改 plan-engine
- 不改 filter-engine
- 不合并 engine
- 不删除旧 JS 源文件

## 后续工程化路线

1. rules-core 收口
2. ui-core 收口
3. app-coordinator 门面
4. engine-facade 审计
5. 发布包瘦身
6. 大候选池性能专项

V2.91RC0 是上述路线的安全起点。


---

## V2.91RC0.rules-core1 补充说明

- 基线：V2.91RC0。
- 本版只做规则类脚本按真实加载顺序的安全分段合并。
- 新增回退开关：`LN_RULES_BUNDLE_OPT`。
- 不改 `compute-pipeline`、`filter-engine`、`plan-engine`、`render`、`app`、`safeperf`、`interact1/interact2`。
- debug deep 自测新增“rules-core1 分段规则包加载与导出检查”。

---

## V2.91RC0.ui-core1 补充说明

- 基线：V2.91RC0.rules-core1。
- 本版只做部分 UI / 交互展示类脚本按真实加载顺序的安全分段合并。
- 新增回退开关：`LN_UI_BUNDLE_OPT`。
- 不改 DOM 结构、不改点击含义、不改 `compute-pipeline`、`filter-engine`、`plan-engine`、`render`、`app`、`safeperf`、`interact1/interact2`。
- debug deep 自测新增“ui-core1 分段 UI 包加载与导出检查”。


## V2.91RC0.coordinator1 补充说明

V2.91RC0.coordinator1 基于 V2.91RC0.ui-core1，新增协调层门面 `LN_APP_COORDINATOR` 与 debug 记录。

该版本不迁移旧调用，不改公式、不改计算链路，只作为后续统一调度、engine-facade 和补丁收口的安全入口。
