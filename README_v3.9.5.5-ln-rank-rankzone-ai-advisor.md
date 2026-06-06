# v3.9.5.5-ln-rank-rankzone-ai-advisor

## 本包边界

- 不包含 `/fenxi/` 静态目录。
- 不修改 `/fenxi/data`。
- 主线只围绕 `ln-rank` 自选池诊断、特控线锚点、位次功能区和 Cloudflare Worker AI 解读。
- `functions/api/path-analysis.js` 已升级为“规则先算，AI再解释；AI失败自动兜底规则版”。

## 新增能力

1. `functions/_lib/exam-year-config.js`
   - 统一管理辽宁物理类年份、特控线和数据口径。
   - 2026 出特控线和一分一段后，优先从这里更新配置。

2. `functions/_lib/rank-zone-engine.js`
   - 用考生分数换算 2025 位次。
   - 用特控线换算特控线对应位次。
   - 计算相对特控线分差、位次差、同分/上5分/下5分人数。
   - 输出位次功能区。

3. `functions/_lib/rank-zone-policy.js`
   - 将短视频分数段经验改造成动态功能区规则：
     - 特控线边缘区 / 公办质量守门区
     - 应用型技术本科主体区
     - 行业入口选择区
     - 特色行业院校选择区
     - 平台与专业博弈区

4. `functions/_lib/path-ai-prompt.js` 和 `path-ai-output-schema.js`
   - AI 只读取结构化摘要。
   - AI 只负责解释，不直接筛专业、不预测录取概率。

5. `ln-rank/selection-pool.html` + `selection-pool.v3955.js/css`
   - 自选池增加“位次功能区”和“AI高报师解读”展示。

## Cloudflare AI 配置

推荐 Pages/Workers 绑定：

- `AI`：Workers AI binding
- `AI_PATH_MODEL`：可选，默认 `@cf/meta/llama-3.1-8b-instruct`

未绑定 AI 或额度用完时，系统返回 `source = rules-only / rules-only-quota / rules-only-error`，前端和飞书报告仍可正常使用。

## 验收样例

- 520 分：应识别为特控线边缘区 / 公办质量守门区。
- 535 分：应识别为应用型技术本科主体区。
- 580 分：应识别为特色行业院校选择区。
- 未绑定 AI：自选池诊断和飞书报告正常降级为规则版。

## 注意

本版本仍以辽宁 2025 物理类一分一段和专业数据为历史参照。2026 正式填报必须更新 2026 一分一段、特控线、招生计划，并逐条核验选科、体检、学费、校区、中外合作/专项/高收费等信息。
