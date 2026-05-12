# V3.0.0.alpha6｜Step5方案预览与一键主流测试版

## 目标

在 alpha5 已跑通 Step1 → Step2 → Step3 → Step4 的基础上，接入 Step5 A/B/C 方案预览。

本版仍不触发旧版正式 compute 主链路，不替代 fix12 主结果；只在 v3 预览层验证家长是否能看懂三类方案结构。

## 新增能力

- 新增 `plans-adapter.v3.js`
- Step5 根据当前位次、家庭底线、孩子兴趣、manualOnly 与场景，生成 A/B/C 三类预览
- A：少量冲击观察
- B：稳妥主方案，重点承接孩子兴趣与场景解释
- C：保底安全，不为兴趣牺牲安全垫
- debug 新增 Step5 方案自测
- 一键主流程自测扩展到 Step5

## 主流程标准样例

- 位次：56548
- 分数：500
- 地域：只看辽宁
- 专业：电气能源与自动化 + 电气工程及其自动化
- manualOnly：true
- 场景：电网 / 体制内倾向

预期：

- Step1 loadedRows 约 7934
- Step2 约 7934 → 1597
- Step3 兴趣命中约 116
- Step4 推荐 grid
- Step5 A/B/C 均生成样例

## 注意

本版仍为 v3 preview-only，不改旧 `/fenxi/index.html`，不改 `compute-pipeline.v2983.js`。
