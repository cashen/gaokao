# V3.0.0.alpha4.fix3｜Step2继续动作兜底与点击诊断修正版

版本戳：v300alpha4fix3-20260512

## 修复背景

线上反馈：在 Step1 已加载位次数据、Step2 已完成底线预览后，点击“保存底线并继续”，页面仍停留在 Step2 底部，用户感觉没有反应。

## 修复内容

1. Step2 按钮事件增加捕获级事件委托，避免因局部重新渲染、旧节点或事件绑定丢失导致点击无效。
2. Step2 保存后先走标准 router.go('child')。
3. 如果标准路由失败，自动兜底 setActiveStep('child')，并主动 render + scrollToStepTop。
4. 跳转后 120ms 做状态复核，如果 activeStep 仍不是 child，则给出明确提示：底线已保存，可点底部“专业”继续。
5. 暴露 LN_V3_STEP_FAMILY.saveAndGoNext()，方便 debug 和后续 F12 诊断。

## 不变内容

- 不改旧 /fenxi/index.html。
- 不改 fix12 compute-pipeline。
- 不触发旧 compute 主链路。
- 只修 v3 Step2 继续动作、路由兜底和诊断能力。
