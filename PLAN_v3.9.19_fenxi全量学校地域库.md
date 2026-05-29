# v3.9.19 可执行计划：基于 fenxi 全量学校地域模型接入 ln-rank

## 已完成

从在线版 fenxi 包中的学校地域模型读取：

```text
fenxi/data/school_geo_model/school_geo_reference_v29471.json
fenxi/data/school_geo_model/school_name_alias_v29471.json
fenxi/data/school_geo_model/school_geo_quality_report_v29471.json
```

生成到 ln-rank 后端：

```text
functions/_lib/school-geo-reference.generated.js
functions/_lib/school-geo-campus-overrides.js
functions/_lib/school-geo-db.js
functions/_lib/school-alias-map.js
functions/_lib/school-geo-normalizer.js
```

## 数据规模

```text
学校地域记录：944 条
原始模型版本：V2.9.4.7.1.fix
官方来源：2293393229.xls（全国普通高等学校名单，截至2025年6月20日）
未匹配数量：0
```

## 关键修正

官方高校名单对部分分校/校区按主校名归并，ln-rank 运行时做校区实体修正：

```text
东北大学秦皇岛分校 → 河北 · 秦皇岛
北京交通大学(威海校区) → 山东 · 威海
北京师范大学(珠海校区) → 广东 · 珠海
大连理工大学(盘锦校区) → 辽宁 · 盘锦
```

## 验收

```text
/ln-rank/school-geo-audit.html
```

搜索：

```text
东北大学
北京交通大学
北京师范大学
大连理工大学
```

检查地域是否落到实际校区城市。
