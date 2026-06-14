# Bug 规则注册表 v3.9.35.1

| Bug | 规则集 | 影响范围 | 修复方式 | 新增审计 | 一票否决 |
|---|---|---|---|---|---|
| 当前查看摘要被压成竖排 | 查询摘要抗变形合同 | 查询页 PC/Pad/Android | chip 内不拆字，summary-action 单列安全布局 | audit-query-page-score-state-layout, audit-chip-nowrap-contract | 是 |
| 399/750/751 分数状态布局变形 | 分数边界状态合同 | 查询页 | scoreState + 独立 score guard notice | audit-query-page-score-state-layout | 是 |
| 全局 [class*=chip] 误伤短标签 | CSS 选择器爆炸半径合同 | 查询、趋势、211、省内、自选 | 收窄为组件级 class | audit-css-selector-blast-radius | 是 |
| 长学校/专业/AI 文案撑爆卡片 | 长文本抗变形合同 | 结果卡片、报告、诊断 | 正文 break-word，标签 keep-all | audit-ui-long-text-stress | 是 |
| 按钮组移动端挤压 | 按钮组移动端合同 | 自选池、报告、单卡诊断、查询 | 小屏单列，min-height 44px | audit-button-group-mobile-contract | 是 |

## v3.9.39 新增门禁规则

| Bug | 规则集 | 影响范围 | 修复方式 | 新增审计 | 一票否决 |
|---|---|---|---|---|---|
| 报告二级标题随 AI/无 AI 动态变号，不能稳定复核 | 报告六段结构合同 | 文字版报告、飞书样式块、self-check API | 固定六段：一、概要判断；二、当前方案怎么看；三、前中后段快速确认；四、最终排序清单；五、本方案确认清单；六、数据和使用边界 | v3.9.39-report-six-section-contract-audit | 是 |
| self-check 脚本找不到 selfCheckResult 时覆盖整个 body | 自测页挂载点合同 | self-check 工程自查页 | 增加独立结果容器；按钮点击后运行；失败写入错误区，不覆盖页面骨架 | v3.9.39-self-check-contract-audit | 是 |
| functions / report builder 深层版本仍返回旧版本 | 深层版本合同 | runtime-health、kb-health、ln-rank-self-check、report builder | 增加 functions/_lib/release-contract.js，API 与报告 builder 统一读取当前 release contract | v3.9.39-version-contract-sync-audit | 是 |
| `[class*=card]` 跨页误伤组件 | CSS 选择器爆炸半径合同 | 查询页、自选池、趋势、省内、211、自测页 | active CSS 改为页面/组件作用域选择器，保留长文本抗变形但不扫全局 | v3.9.39-css-blast-radius-audit | 是 |
