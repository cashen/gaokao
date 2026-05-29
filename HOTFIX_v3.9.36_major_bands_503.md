# v3.9.36 major-bands 503 稳定性修复

## 问题表现

部分查询 `/api/major-bands` 返回 503，但不是所有查询都失败。

典型例子：

```text
candidateScore=610
rangePreset=wide / standard
region=ln
majorKeyword=交通
```

## 判断

不是 AI 诊断问题，也不是知识库显示问题。  
问题在专业池接口：旧版接口每次请求都会一次性读取全部 chunks、全部 normalize、全部返回匹配 records。

当关键词较宽、地区筛选较复杂、并发请求较多或 Cloudflare 冷启动时，容易触发 Pages Functions 的 503。

## 修复

本版把 `/api/major-bands` 改为：

```text
分块读取
先用原始分数 + 原始关键词做预筛
只对候选记录 normalize
每个 band 默认最多返回 120 条 records
count 仍统计完整命中数量
避免 Promise.all 同时拉满 chunks
```

新增自检接口：

```text
/api/major-bands-health
```

用于检查 manifest 和第一块 chunk 是否可读。

## 可配置

Cloudflare 环境变量：

```text
MAJOR_BANDS_MAX_PER_BAND=120
```

可设为 80、120、180、240。
