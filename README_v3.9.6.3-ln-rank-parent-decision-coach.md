# v3.9.6.3-ln-rank-parent-decision-coach

## 版本目标

在 v3.9.6.2 的“当前成绩可信口径”和“公办底线边界”基础上，新增“家长下一步私教面板”。

本版不是自动生成 112 志愿，也不替家长删除志愿，而是把当前成绩、自选池、底线条件、体检灯和 AI 解读整理成可执行的复核动作。

## 主要新增

- `functions/_lib/parent-decision-coach.js`
- `functions/_lib/parent-decision-coach-prompt.js`
- `functions/_lib/parent-decision-coach-validator.js`
- `ln-rank/js/feature/decision-coach/parent-decision-context.v3963.js`
- `ln-rank/js/feature/decision-coach/decision-coach-render.v3963.js`
- `ln-rank/js/feature/decision-coach/decision-coach-actions.v3963.js`
- `ln-rank/css/decision-coach.v3963.css`
- `ln-rank/js/selection-pool.v3963.js`

## 关键功能

1. 自选池诊断接口 `/api/path-analysis` 返回 `parentCoach`。
2. 自选池右侧新增“家长下一步”卡片。
3. 飞书诊断报告新增“家长下一步复核清单”。
4. 底线条件进入私教复核逻辑：
   - “只看公办普通”时，公办中外/高收费和民办/独立类项目会被提示复核。
   - “公办含中外/高收费”时，公办中外不判为违反底线，只提示核验费用、培养模式、毕业证书等。
5. 600 分附近的中外合作上探不作为前端按钮，只在 AI/报告中作为策略提醒。

## 不动内容

- 不包含 `/fenxi/`
- 不包含 `/fenxi/data/`
- 不包含 `functions/fenxi/`
- 不包含 `functions/_middleware.js`

## 产品边界

- AI 不说“必录、稳进、闭眼报、一定上岸”。
- AI 不自动删除志愿。
- 推免参考只是升学路径辅助，不作为硬排序指标。
- 本版继续保持公办底线菜单只在本科线至特控线之间显示。
