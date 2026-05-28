# v3.9.28 AI输出收口版

## 目标

解决 AI诊断容易出现的：

```text
summary 太长
realityReminder 和 parentNote 重复
checks 混入专业评价
basis 混入建议判断
同一句话重复出现
```

## 改动

```text
summary 不超过45字
basis 严格3条事实依据
realityReminder 不写核验事项
checks 只写核验事项
parentNote 与 realityReminder 去重
riskTags 短标签化
不再返回 rawModelText
max_tokens 700 → 420
temperature 0.2 → 0.1
```

## 不变

```text
专业池
地域匹配
飞书报告
知识库基座
Cloudflare 配置
```
