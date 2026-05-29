# 后续路线建议

## v3.9.26 AI输出收口

目标：

```text
summary 更短
parentNote 不重复
riskTags 标签化
前端不显示 rawModelText
```

## v3.9.27 AI诊断缓存

目标：

```text
同一模型 + 同一 prompt版本 + 同一卡片 + 同一分数
命中缓存后不再消耗 Neurons
```

建议缓存：

```text
Cloudflare Cache API 或 KV
TTL 7-30天
```

## v3.9.28 知识库模板

新增：

```text
school_kb_template.csv
major_kb_template.csv
functions/_lib/kb/kb-retriever.js
functions/_lib/kb/school-kb.generated.js
functions/_lib/kb/major-kb.generated.js
```

## v3.9.29 知识库增强诊断

目标：

```text
AI诊断优先引用你的学校/专业知识库
没有知识库依据时说“需核验”
不让模型自行编学校优势和就业结论
```

## v4.0 稳定主线

目标：

```text
专业池 + 地域 + 2024/2025 + 飞书 + AI + 知识库
形成稳定闭环
```
