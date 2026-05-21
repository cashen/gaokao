# V2.93RC1 Formula Governance Stable

本版目标：一次性收口公式治理，不做 fixfixfix。

## 原则

A 保底但不能侮辱；B 主线但不能保守；C 机会但不能忽悠。
高分不浪费，中分讲取舍，低分先避坑。兴趣要听，但不能盲从；预算和拒绝项是硬约束，不是装饰。

## 主干边界

- compute-pipeline：只负责上下文与候选池，不负责 A/B/C 公式。
- rules-decision-core：定义 LN_ABC_FORMULA_GOVERNANCE_V293RC1，总口径与阈值。
- plan-engine：执行 role score 与 bucket guard。
- ln-abc-policy-audit：只验证主干公式，工程失败和策略失败分开统计。
- debug：默认一次 full 36，FAIL 不再被外层降级成 WARN。

## 验收

caseTotal=36，completed=36，TIMEOUT=0，FAIL=0。
HardRejectInAB=0，DataEmptyCase=0，LowCFantasyCount=0，BOverSafe 明显下降。
