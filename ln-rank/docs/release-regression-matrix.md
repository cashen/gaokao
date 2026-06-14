# v3.9.35.1 回归矩阵

## 页面
/ln-rank/、/ln-rank/selection-pool.html、/ln-rank/211-mainline.html、/ln-rank/local-mainline.html、/ln-rank/major-trend-2025.html、/ln-rank/self-check.html。

## 状态
空、399、400、514、515、612、699、700、750、751、长专业关键词、长学校名、特殊项目显示、办学性质提醒、AI 诊断长文本、报告长清单。

## 功能
成绩查询、筛选、结果卡片、加入自选、自选池、报告、飞书入口、单卡诊断、AI 兜底、省内背景、211 背景、趋势、自测、API JSON、资产图。

## v3.9.39 门禁增量
- 报告固定六段：文字版与飞书样式块都必须按固定六段输出，不能出现“已选专业总览”“需要人工确认”等额外二级标题抢占结构。
- self-check：点击“运行自测”后只更新合同门禁结果区域，不能覆盖 body；API 失败必须显示人话提示。
- 版本合同：VERSION、active-assets、module-manifest、release-meta、HTML footer、self-check 文案、js/domain/version-contract.js、functions/_lib/release-contract.js、API health、report builder 均同步到当前版本。
- CSS 半径：active CSS 不允许 `[class*=card]`、`[class*=chip]`、`[class*=tag]`；移动端按钮和长文本仍需保留抗变形。
