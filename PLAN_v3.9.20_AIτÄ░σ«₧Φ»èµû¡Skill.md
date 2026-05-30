# v3.9.20 AI现实诊断 Skill 接入计划

## 已接入的 skill 逻辑

- 普通家庭优先看确定性；
- 看中位数毕业生去向，不看天才案例；
- 2026入学、2030毕业，要考虑AI冲击；
- 院校判断同时看学校层次、城市资源、学科/执照门槛；
- 高风险专业必须提示现实代价；
- 大学阶段给出可执行核验和准备建议。

## 后端新增

```text
functions/api/card-diagnose.js
functions/_lib/ai-card-prompt.js
functions/_lib/ai-card-rules.js
functions/_lib/ai-card-output-schema.js
functions/_lib/ai-skills/realistic-career-skill.js
functions/_lib/ai-skills/major-risk-rules.js
```

## 前端新增

```text
ln-rank/js/feature/diagnose/diagnose-api.v3920.js
ln-rank/js/feature/diagnose/diagnose-controller.v3920.js
ln-rank/js/feature/diagnose/diagnose-render.v3920.js
ln-rank/css/diagnose.css
ln-rank/ai-diagnostics.html
```

## 验收

1. `/ln-rank/module-health.html` 前端模块正常；
2. `/ln-rank/ai-diagnostics.html` 返回诊断；
3. 主页面查询后，卡片显示“现实诊断”按钮；
4. 点击后能展开诊断内容；
5. 未绑定 Workers AI 时返回规则版，不影响主页面。
