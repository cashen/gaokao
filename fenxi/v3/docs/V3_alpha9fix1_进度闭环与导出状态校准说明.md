# V3.0.0.beta2｜家长端阅读节奏与决策摘要栏版

本版基于 `V3.0.0.alpha9`，不重写 Step1-Step7 业务逻辑，只修正进度状态闭环。

## 修正点

- 新增 `LN_V3_STORE.markCompleteThrough(stepId)` 与 `isCompleteThrough(stepId)`。
- 人工点击“下一步”时，完成状态会按顺序补齐，不再只标记当前步骤。
- Debug 一键总检在 Step7 生成报告后，检查 `rank/family/child/scenario/plans/candidates/export` 是否全部进入 completedSteps。
- 导出报告生成后会标记 export 已完成，底部 Tab 与上方进度条状态保持一致。

## 不变范围

- 不改旧 `/fenxi/index.html`。
- 不改 Step4 家庭路径权重。
- 不改 Step5 A/B/C 方案包逻辑。
- 不改 Step6 详细卡片、反事实比较、自选池逻辑。
- 不接旧 compute 主链路。

## 测试方式

部署后打开 `/fenxi/v3/debug.html`，点击：

- 一键总检：路径矩阵 + 主流程
- 复制报告

重点查看：

- 一键总检是否 0 失败
- Step7 进度闭环完整是否 PASS
- 主流程最终是否停在导出页
