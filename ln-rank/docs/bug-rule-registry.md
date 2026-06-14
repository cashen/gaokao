# Bug 规则注册表 v3.9.35.1

| Bug | 规则集 | 影响范围 | 修复方式 | 新增审计 | 一票否决 |
|---|---|---|---|---|---|
| 当前查看摘要被压成竖排 | 查询摘要抗变形合同 | 查询页 PC/Pad/Android | chip 内不拆字，summary-action 单列安全布局 | audit-query-page-score-state-layout, audit-chip-nowrap-contract | 是 |
| 399/750/751 分数状态布局变形 | 分数边界状态合同 | 查询页 | scoreState + 独立 score guard notice | audit-query-page-score-state-layout | 是 |
| 全局 [class*=chip] 误伤短标签 | CSS 选择器爆炸半径合同 | 查询、趋势、211、省内、自选 | 收窄为组件级 class | audit-css-selector-blast-radius | 是 |
| 长学校/专业/AI 文案撑爆卡片 | 长文本抗变形合同 | 结果卡片、报告、诊断 | 正文 break-word，标签 keep-all | audit-ui-long-text-stress | 是 |
| 按钮组移动端挤压 | 按钮组移动端合同 | 自选池、报告、单卡诊断、查询 | 小屏单列，min-height 44px | audit-button-group-mobile-contract | 是 |
