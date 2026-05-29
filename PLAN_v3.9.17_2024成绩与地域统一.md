# v3.9.17 可执行计划：2024 历史成绩 + 地域口径统一

## 目标

在不改变 2025 主口径的前提下，为专业卡片补充：

- 2024 最低分 / 最低位次
- 两年位次变化提示
- 更准确的地域显示
- 地域来源与校区核验提示

## 改动原则

- 2025 仍是主判断口径；
- 2024 只作为历史参考，不做录取预测；
- 地域统一在后端归一化，前端和飞书报告只消费标准字段；
- 不把字段判断散落在 UI 模板里。

## 新增后端模块

```text
functions/_lib/history-score-engine.js
functions/_lib/location-normalizer.js
functions/_lib/school-location-map.js
```

## 修改后端模块

```text
functions/_lib/fenxi-normalizer.js
functions/_lib/school-display-tags.js
functions/_lib/feishu-report-builder.js
```

## 新增前端模块

```text
ln-rank/js/feature/major-pool/history-score-render.v3917.js
```

## 修改前端模块

```text
ln-rank/js/feature/major-pool/major-pool-render.v3917.js
ln-rank/js/app.v3917.js
```

## 验收方式

1. 打开 `/api/major-bands?candidateScore=590`；
2. 检查每条 record 是否出现：
   - `score2024`
   - `rank2024`
   - `score2025`
   - `rank2025`
   - `historyCompare`
   - `displayLocation`
   - `locationWarning`
3. 打开 `/ln-rank/index.html?v=3917`；
4. 查询专业后检查卡片是否显示“历史参考”；
5. 生成飞书报告，检查报告中是否包含 2024 参考和地域提示。
