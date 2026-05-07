# 浙江高考专业投档与位次分析数据包

> 版本：`zj_2024_2025_v1`  
> 生成时间：`2026-05-07T02:02:48`  
> 数据源：`2024年(1).xml`、`2025年(1).xml`

这份数据包是为了复刻并升级“辽宁模式”：先保证数据不丢，再做分片、索引、对比，最后可以接 HTML、Cloudflare Pages、手机端页面、筛选器或报告生成器。

---

## 1. 数据有没有丢？

| 年份 | XML表格总行 | 表头 | 解析有效记录 | 状态 |
|---|---:|---:|---:|---|
| 2024 | 24974 | 1 | **24973** | PASS |
| 2025 | 23509 | 1 | **23508** | PASS |

主分析建议只看 **普通类平行投档**：

| 年份 | 普通类平行投档记录数 |
|---|---:|
| 2024 | **22226** |
| 2025 | **23508** |

2024 还包含提前批、艺术类、体育类。它们没有丢，但不应混进普通类 2024-2025 变化分析。

---

## 2. 文件结构

```text
zhejiang_data_package/
  manifest.json
  README.md

  audit/
    audit_2024.json
    audit_2025.json
    audit_summary.json

  raw/
    2024/zj_2024_part_001.json ...
    2025/zj_2025_part_001.json ...

  shards/
    2024/analysis/zj_2024_analysis_600_649.json ...
    2025/analysis/zj_2025_analysis_600_649.json ...
    2025/first_stage/zj_2025_first_stage_600_649.json ...
    2025/final/zj_2025_final_600_649.json ...

  index/
    schools_index.json
    majors_index.json
    province_index.json
    record_locator.json

  compare/
    compare_summary.json
    compare_exact_normal.json
    compare_added_2025.json
    compare_removed_2025.json
    compare_need_review.json
    top_harder_by_rank.json
    top_easier_by_rank.json
```

---

## 3. 每类文件干什么？

### `manifest.json`

总入口。前端或脚本先读它，知道各类文件在哪里、每个分片多少条、总数是否闭环。

### `audit/*.json`

审计文件。用来确认：

- XML 总行数
- 解析行数
- 批次分布
- 缺失字段数量
- raw 分片加总是否等于源文件有效记录数

### `raw/YYYY/*.json`

原始保真分片。每片最多 3000 条。  
原则：**不去重、不删除空值、不合并同名专业。**

### `shards/YYYY/*/*.json`

查询分片。按分数段拆，适合手机端/网页按需加载。

分数段包括：

```text
700_plus
650_699
600_649
550_599
500_549
450_499
400_449
under_400
missing
```

### `index/*.json`

索引文件：

| 文件 | 用途 |
|---|---|
| `schools_index.json` | 按学校查 |
| `majors_index.json` | 按专业名查 |
| `province_index.json` | 按院校所在省份/地区查 |
| `record_locator.json` | 通过 record_id 找 raw 分片 |

### `compare/*.json`

2024/2025 普通类平行投档对比。

| 文件 | 用途 |
|---|---|
| `compare_exact_normal.json` | 一对一精确匹配 |
| `compare_added_2025.json` | 2025新增或2024无法匹配 |
| `compare_removed_2025.json` | 2024有但2025无法匹配 |
| `compare_need_review.json` | 同校同专业多条，需要人工复核 |
| `top_harder_by_rank.json` | 竞争增强Top |
| `top_easier_by_rank.json` | 位次放宽Top |

---

## 4. 核心字段说明

一条记录就是一条投档记录，不是一个唯一专业名。

```json
{
  "record_id": "zj2025_00001",
  "source_row": 2,
  "year": 2025,
  "batch_code": "2",
  "batch_name": "普通类平行投档",
  "school_province": "浙江",
  "school_code": "0001",
  "school_name": "浙江大学",
  "major_name": "人工智能"
}
```

| 字段 | 解释 |
|---|---|
| `record_id` | 本包唯一主键 |
| `source_row` | 原 XML 行号 |
| `school_code` | 院校代码，保留前导0 |
| `school_province` | 原表“投档分组”，这里按院校所在省份/地区理解 |
| `major_name_norm` | 标准化专业名，用于匹配，不用于展示 |

学校层次字段是三态：

```text
true  = 是
false = 否
null  = 原表为空，暂不判断
```

---

## 5. 分数字段说明

### 2024

```text
analysis_score = min_score（最低分）
```

### 2025

```text
analysis_score = first_stage_min_score（一段最低分）
如果一段最低分为空，则 fallback 到 min_score
final_score = min_score
```

这样做是为了避免把一段分析和二段/最终最低分混在一起。

---

## 6. 位次字段说明

```json
{
  "rank_raw": "005342",
  "rank": 5342,
  "has_rank": true
}
```

`rank_raw` 保留原始文本，`rank` 用于排序和计算。空位次保留为 `null`，不写成 0。

---

## 7. 怎么调用？

### 按分数查 2025 一段

用户输入 610 分，加载：

```text
shards/2025/analysis/zj_2025_analysis_600_649.json
```

再用前端筛：

```js
const result = data.filter(x =>
  x.score.analysis_score <= 620 &&
  x.score.analysis_score >= 580
);
```

### 按学校查

1. 读 `index/schools_index.json`
2. 找到学校，比如“浙江大学”
3. 拿到 `record_ids`
4. 用 `index/record_locator.json` 找对应 raw 分片
5. 加载 raw 分片取完整记录

### 看 2024-2025 变化

读：

```text
compare/compare_exact_normal.json
```

看：

```json
{
  "rank_change": -1527,
  "difficulty_change": "变难"
}
```

解释：

| rank_change | 含义 |
|---:|---|
| < 0 | 2025位次前移，变难 |
| > 0 | 2025位次后退，变容易 |
| 接近0 | 基本稳定 |

---

## 8. 当前审计摘要

### 2024 批次分布

```json
{
  "普通类提前录取": 184,
  "普通类平行投档": 22226,
  "艺术类平行投档": 2359,
  "体育类平行投档": 204
}
```

### 2025 批次分布

```json
{
  "普通类平行投档": 23508
}
```

### 缺失字段

2024：

```json
{
  "school_code": 0,
  "school_name": 0,
  "major_name": 0,
  "min_score": 13,
  "rank": 2270,
  "is_985": 0,
  "is_211": 0,
  "is_double_first_class": 0,
  "avg_score": 0
}
```

2025：

```json
{
  "school_code": 0,
  "school_name": 0,
  "major_name": 0,
  "min_score": 0,
  "rank": 1851,
  "is_985": 0,
  "is_211": 0,
  "is_double_first_class": 395,
  "first_stage_min_score": 5618
}
```

### 对比摘要

```json
{
  "normal_2024_records": 22226,
  "normal_2025_records": 23508,
  "exact_one_to_one_matches": 17932,
  "need_review_groups": 104,
  "added_2025_records": 5404,
  "removed_2024_records": 4129,
  "top_harder_file": "compare/top_harder_by_rank.json",
  "top_easier_file": "compare/top_easier_by_rank.json",
  "files": {
    "exact": "compare/compare_exact_normal.json",
    "need_review": "compare/compare_need_review.json",
    "added_2025": "compare/compare_added_2025.json",
    "removed_2025": "compare/compare_removed_2025.json"
  }
}
```

---

## 9. 下一步扩展方向

要真正超过辽宁版，建议继续补：

1. 浙江一分一段表：分数 ⇄ 位次。
2. 选科要求：浙江 3+3 必须做。
3. 招生计划数：判断位次变化是不是扩招/缩招造成。
4. 学费/中外合作/民办/公办。
5. 城市字段：杭州、宁波、上海、南京、苏州等。
6. 专业标签系统：计算机、电气、临床、师范、财经、法学等。

---

## 10. 核心原则

```text
先全量保真，再做清洗。
先 raw 分片，再做查询索引。
先普通类主分析，再处理提前批/艺术/体育。
先确保数量闭环，再做网页体验。
```
