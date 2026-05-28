# v3.9.18 可执行计划：学校地理实体层

## 目标

把 ln-rank 的地域从“字段拼接”升级为“学校/校区实体匹配”。

重点解决：

```text
东北大学秦皇岛分校 → 河北 · 秦皇岛
哈尔滨工业大学(深圳) → 广东 · 深圳
山东大学威海校区 → 山东 · 威海
```

而不是按学校主体误判。

## 新增模块

```text
functions/_lib/school-geo-db.js
functions/_lib/school-alias-map.js
functions/_lib/school-geo-normalizer.js
functions/api/school-geo-audit.js
ln-rank/school-geo-audit.html
```

## 运行逻辑

1. 从 /fenxi 原始记录读取 school / major；
2. 优先按校区规则识别分校、异地校区；
3. 再按别名表匹配；
4. 再做谨慎 fuzzy 匹配；
5. 最后才回退到原始省市字段；
6. 统一输出：
   - `geoEntity`
   - `displayLocation`
   - `locationSource`
   - `locationConfidence`
   - `locationWarning`
   - `regionGroups`

## 验收

1. 打开 `/ln-rank/school-geo-audit.html`；
2. 搜索 `东北大学`；
3. 确认 `东北大学秦皇岛分校` 或相关写法显示为 `河北 · 秦皇岛`；
4. 打开主页面查询结果；
5. 卡片地域标签应显示实际地域；
6. 飞书报告中应输出办学实体与地域提示。
