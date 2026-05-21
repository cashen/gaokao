# V2.93RC2 Boot Loader Stable

本版只修 RC1 的工程加载链，不继续调整 A/B/C 公式权重。

## 根因
RC1 full debug 中 runtime iframe 只加载 47/67 个 active JS，后续 `ln-abc-policy-audit.v292rc2.js` 未加载，导致 `LN_ABC_POLICY_AUDIT_V292RC2 not loaded`、`caseTotal=0`。

## 修正
- index loader 增加单脚本 DOM 加载超时。
- DOM script 超时后改用 fetch-inline 兜底加载。
- 非核心 UI 资源失败可记录并继续；核心计算、渲染、审计资源失败才终止。
- boot 完成后写入 `__LN_BOOT_COMPLETE__`，并派发 `ln:boot-complete`。

## 不改
- 不改 DATA。
- 不改 A/B/C 公式权重。
- 不改 plan-engine 的公式治理逻辑。
- 不调松 audit 判定。
