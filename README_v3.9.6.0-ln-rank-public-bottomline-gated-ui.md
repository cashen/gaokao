# v3.9.6.0-ln-rank-public-bottomline-gated-ui

## 本版目标

在 v3.9.5.9 可信闭环基础上，新增“办学性质底线”的前端门控筛选：

- 未输入分数时不显示。
- 仅在当前分数处于 2025 辽宁物理类特控线以下/边缘分段时显示。
- 600 分左右不显示该前端选项；公办中外上探平台只由 AI 诊断/报告作为策略提醒，不做筛选按钮。
- 保留原有“地域 / 学校 / 专业”三个查询入口。
- 查询范围继续独立，不和办学性质底线混在一起。

## 前端底线模式

本版前端只开放 4 个模式：

1. 全部院校：不过滤办学性质与费用类型。
2. 公办优先：公办普通优先排序，不隐藏其他候选。
3. 只看公办普通：只保留公办普通收费项目，排除民办、独立学院、公办中外合作和高收费。
4. 公办含中外/高收费：只保留公办学校项目，但允许公办中外合作或高收费专业。

明确不开放为前端按钮：

- 公办中外上探平台。
- 接受民办/高收费兜底。

这两类只进入 AI 和报告策略解释，避免前端复杂化。

## 关键文件

新增：

- functions/_lib/bottomline-policy.js
- ln-rank/css/bottomline.v3960.css
- ln-rank/js/app.v3960.js
- ln-rank/js/feature/major-pool/major-pool-render.v3960.js
- ln-rank/js/selection-pool.v3960.js

修改：

- ln-rank/index.html
- ln-rank/selection-pool.html
- ln-rank/js/state/app-state.js
- ln-rank/js/feature/major-pool/major-bands-api.v3912.js
- functions/api/major-bands.js
- functions/api/path-analysis.js
- functions/_lib/school-display-tags.js
- functions/_lib/advisor-fact-builder.js
- functions/_lib/advisor-ai-prompt.js
- functions/_lib/advisor-fallback-writer.js
- ln-rank/js/feature/selection-pool/selection-pool-store.v3955.js

## 不动范围

本包不包含也不修改：

- /fenxi/
- /fenxi/data/
- /functions/fenxi/
- functions/_middleware.js

## 验收点

1. 未输入成绩时，不显示“办学性质底线”。
2. 输入 515 或以下分数时，显示“办学性质底线”。
3. 输入 600 分左右，不显示该前端选项。
4. 选择“只看公办普通”时，接口会排除公办中外/高收费、民办/独立。
5. 选择“公办含中外/高收费”时，保留公办学校项目，允许公办中外/高收费，排除民办。
6. 选择“公办优先”时，不硬过滤，只改变排序倾向。
7. 空结果时有解释，不让用户误以为程序异常。
8. 自选池和 AI 诊断可以识别当前底线模式，但不会把 600 分附近中外合作上探作为前端按钮。
