# V2.91RC0 测试矩阵

## smoke 测试

目标：30 秒内确认页面没炸。

- 自动访问凭证登录
- 输入 600 分或等价位次
- 地域选择辽宁 hard
- A/B/C 出现
- 兴趣抽屉打开与关闭
- 高级筛选入口存在
- 导出入口存在

## standard 测试

目标：覆盖家庭常用路径。

- 625 分 / 全国 / 平台优先
- 600 分 / 辽宁 / 稳就业
- 500 分 / 辽宁 / 普通家庭 / 兴趣真实命中

每组核对：

- 有效候选数量
- A/B/C 推荐是否出现
- 候选前 10 是否正常
- 兴趣命中数量是否正常
- 地域 hard 结果是否正常

## deep 测试

目标：正式发版前验证。

使用 `/fenxi/debug.html` 的“深度矩阵自测”。

标准：

- 总步骤全部 PASS
- 失败 0
- hard 辽宁无异常外省保留
- manualOnly=true 时 interestFastFilter 出现
- safePerf / interact1 / interact2 标记存在

## 重点性能预算

- 辽宁 hard + manualOnly=true：applyFilters 建议 ≤ 100ms
- 辽宁 hard + manualOnly=false：applyFilters 建议 ≤ 800ms
- 抽屉关闭无变化：不应触发 applyFilters
- 同一筛选控件 change：不应触发两次 applyFilters
- 全国 / 东北 / manualOnly=false：允许慢，属于大候选池专项，不在 V2.91RC0 修复范围


---

## V2.91RC0.rules-core1 补充说明

- 基线：V2.91RC0。
- 本版只做规则类脚本按真实加载顺序的安全分段合并。
- 新增回退开关：`LN_RULES_BUNDLE_OPT`。
- 不改 `compute-pipeline`、`filter-engine`、`plan-engine`、`render`、`app`、`safeperf`、`interact1/interact2`。
- debug deep 自测新增“rules-core1 分段规则包加载与导出检查”。
