# V3.0.0.alpha4.fix2｜Debug空数据自测降级与输入提示修正版

## 背景

alpha4 中 Step2 的“保存底线并继续”实际会调用路由进入 Step3，但页面仍停在 Step2 底部区域，用户容易误以为按钮没有反应。

## 修复

1. `wizard-shell.v3.js` 增加 `scrollToStepTop()`。
2. `tab-router.v3.js` 在路由切换并重新渲染 Step 后，自动滚动到 `v3StepRoot` 顶部。
3. `step-family.v3.js` 保存底线后更新提示为“家庭底线已保存，进入第 3 步：孩子专业偏好。”。
4. `debug-step-family.v3.js` 增加“Step2 保存继续可进入 Step3”自测项。

## 边界

本版不触发旧 compute 主链路，不生成正式 A/B/C 结果，只修 v3 Step2 到 Step3 的交互反馈和路由体验。
