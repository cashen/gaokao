# V3.0.0.rc1.fix6｜家庭路径解释透明化与并列推荐提示版

## 版本

- 版本：`V3.0.0.rc1.fix6｜家庭路径解释透明化与并列推荐提示版`
- 版本戳：`v300rc1fix6-20260512`
- 基线：`V3.0.0.rc1.fix5｜复核清单去技术味与条件变化文案修正版`
- 范围：只更新 `/fenxi/v3/`，不覆盖旧 `/fenxi/index.html`。

## 本次只解决一个问题

Step4 家庭路径卡原来只显示路径名、分数和“系统建议”。当“平台优先”和“强专业优先”分数接近或并列时，家长容易误以为系统已经明确压过另一条路径。

fix6 不改权重、不改 A/B/C 生成，只把“为什么这样建议”讲清楚。

## 新增能力

1. 路径卡显示匹配分。
2. 路径卡显示加分因素。
3. 路径卡显示扣分因素。
4. 路径卡显示对 A/B/C 的影响。
5. 路径卡显示为什么系统暂选这条。
6. 平台优先与强专业优先接近时，显示并列提醒：
   > 平台优先与强专业优先当前接近。系统因当前分数段更偏高分平台比较，暂建议先看平台优先；如果家庭更重视专业正主程度，也可以手动选择强专业优先。

## 新增文件

- `fenxi/v3/assets/js/adapters/path-explanation-adapter.v3.js`
- `fenxi/v3/assets/css/path-explanation.v3.css`
- `tools/validate-v300rc1fix6-release.js`

## 修改文件

- `fenxi/v3/assets/js/adapters/scenario-adapter.v3.js`
- `fenxi/v3/assets/js/steps/step-scenario.v3.js`
- `fenxi/v3/assets/js/version.v3.js`
- `fenxi/v3/index.html`
- `fenxi/v3/index.htm`
- `fenxi/v3/debug.html`
- `fenxi/v3/debug.htm`
- `fenxi/v3/debug/index.html`
- `fenxi/v3/VERSION.txt`

## 不动内容

- 不改旧 `/fenxi/` 正式入口。
- 不改 Step4 原始权重。
- 不改 Step5 A/B/C 生成。
- 不启用旧 compute 替换 V3 主链路。
- 不把技术词放进精简版报告。

## Debug 校验

一键总检会继续跑原有路径矩阵和主流程。fix6 通过在 Step4 矩阵中增加解释透明度断言，新增覆盖：

- 路径解释适配器存在
- 路径卡加减分因素存在
- 并列路径提示存在
- 不改变原推荐权重

