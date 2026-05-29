# ln-rank v3.9.25 架构维护基线

## 版本定位

v3.9.25 不新增业务功能，目标是固定项目长期维护边界：

```text
/fenxi 数据读取
→ 标准 record 归一化
→ 专业池区间计算
→ 前端卡片展示
→ 飞书报告
→ AI诊断
```

后续新功能必须围绕标准 record 字段扩展，不能在前端或单个接口里临时猜字段。

---

## 一、主数据流

```text
/fenxi/data/manifest.json
/fenxi/data/chunks/*.json
        ↓
functions/_lib/fenxi-manifest.js
        ↓
functions/_lib/fenxi-normalizer.js
        ↓
history-score-engine.js
location-normalizer.js
school-geo-normalizer.js
school-display-tags.js
        ↓
functions/api/major-bands.js
        ↓
ln-rank/js/feature/major-pool/*
        ↓
专业卡片 / 飞书报告 / AI诊断
```

### 原则

```text
后端负责事实、规则、计算
前端只负责展示
AI只负责表达，不负责凭空补事实
```

---

## 二、标准 record 字段契约

所有后续功能优先读取这些字段：

```js
{
  id: "string",

  school: "学校原始显示名",
  major: "专业原始显示名",

  score: 598,
  rank: 14257,
  score2025: 598,
  rank2025: 14257,
  score2024: 591,
  rank2024: 15820,

  historyCompare: {
    has2024: true,
    scoreDelta25vs24: 7,
    rankDelta25vs24: -1563,
    scoreTrendLabel: "分数上升",
    rankTrendLabel: "位次前移",
    rankTrendText: "两年位次：前移约 1,563 位"
  },

  lnArea: "沈阳",
  region: "沈阳",
  province: "辽宁",
  city: "沈阳",
  displayLocation: "辽宁 · 沈阳",

  locationSource: "record-city | school-geo-db | campus-rule | alias | fuzzy | missing",
  locationConfidence: "high | medium | low",
  locationWarning: "",

  geoEntity: "东北大学秦皇岛分校",
  schoolCanonical: "东北大学秦皇岛分校",
  regionGroups: ["省外", "河北", "京津冀"],

  schoolTags: ["211", "双一流"],
  natureLabel: "公办",
  nature: "公办",
  flags: []
}
```

### 禁止事项

```text
不要在前端重新判断 211/985/地域/校区
不要在飞书报告里重新猜专业风险
不要在 AI prompt 里让模型自行判断学校重点学科
```

---

## 三、模块责任边界

### /fenxi 数据读取

```text
functions/_lib/fenxi-manifest.js
```

职责：

```text
读取 manifest.json
读取 chunks
处理路径和 Cloudflare 环境差异
```

不负责：

```text
专业判断
地域判断
AI诊断
```

---

### 字段归一化

```text
functions/_lib/fenxi-normalizer.js
```

职责：

```text
原始字段 → 标准 record
```

例如：

```text
最低分 / score / minScore / score2025 → score2025
最低位次 / rank / minRank / rank2025 → rank2025
```

---

### 历史成绩

```text
functions/_lib/history-score-engine.js
```

职责：

```text
抽取 2024/2025 分数位次
生成 historyCompare
```

不负责：

```text
预测 2026 录取
```

---

### 地域实体

```text
functions/_lib/school-geo-reference.generated.js
functions/_lib/school-geo-campus-overrides.js
functions/_lib/school-geo-normalizer.js
functions/_lib/location-normalizer.js
```

职责：

```text
学校主体地域
分校/校区/异地办学实体
地域可信度
校区核验提示
```

原则：

```text
校区/分校实体优先于学校主体
无法确认时显示“需核验”，不假装精准
```

---

### 专业池区间

```text
functions/_lib/band-engine.js
functions/api/major-bands.js
```

职责：

```text
根据考生分数生成上探、主体、稳妥区间
执行地域/学校/专业筛选
返回标准 bands 结构
```

---

### 飞书报告

```text
functions/_lib/feishu-report-builder.js
functions/api/feishu-create-report.js
```

职责：

```text
把当前专业池结果转成飞书 docx 报告
设置匿名可读
返回链接
```

不负责：

```text
重新计算专业池
重新判断地域
```

---

### AI诊断

```text
functions/api/card-diagnose.js
functions/_lib/ai-card-rules.js
functions/_lib/ai-card-prompt.js
functions/_lib/ai-card-output-schema.js
functions/_lib/ai-skills/*
```

职责：

```text
单张卡片解释
现实就业导向提示
AI额度用完时规则版兜底
```

AI诊断三层：

```text
规则层：稳定判断分差、标签、专业风险
知识库层：未来补学校/专业权威资料
AI表达层：把规则和知识库说成人话
```

---

## 四、后续路线建议

```text
v3.9.26：AI输出收口，去重复，压缩 summary / parentNote
v3.9.27：AI诊断缓存，减少 Neurons 消耗
v3.9.28：知识库模板，school_kb / major_kb
v3.9.29：知识库增强诊断，AI优先引用知识库
v4.0：稳定主线版
```
