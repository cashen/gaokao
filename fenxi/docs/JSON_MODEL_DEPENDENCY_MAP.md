# V2.91RC0.model-audit1｜JSON 模型依赖审计
## 1. 版本定位
- 基线：V2.91RC0.package-slim1
- 本版只登记 JSON 模型依赖，不改数据内容、不改加载逻辑、不做分片、不延后加载、不改公式。
## 2. 总览
- data JSON 总数：67 个
- data JSON 原始解压体积：73.77 MB
- 标记为运行期关键/会加载：37 个，约 53.37 MB
## 3. 大文件 Top15
| 文件 | 大小 | 类别 | 阶段 | 风险 | 作用 |
|---|---:|---|---|---|---|
| `data/major_name_model/admission_entry_major_index_v2944.json` | 10232.1 KB | major-name-model | model-load | medium | 招生名校准、目录映射、详情/导出解释 |
| `data/confusable_major_model/confusable_major_detected_pairs_v29462.json` | 9600.2 KB | confusable-model | model-load | medium-high | 易混提醒、候选/详情复核说明 |
| `data/confusable_major_model/confusable_major_detected_pairs_v2946.json` | 7119.3 KB | confusable-report | debug-or-review | low | 质量复核/模型说明 |
| `data/major_name_model/admission_to_catalog_map_v2944.json` | 6374.4 KB | major-name-model | model-load | high | 招生名校准、目录映射、详情/导出解释 |
| `data/taxonomy/admission_major_review_v2942.json` | 5327.7 KB | taxonomy-source | source-or-legacy | low | 源数据/构建留存 |
| `data/major_name_model/admission_major_raw_v2944.json` | 4407.7 KB | major-name-model | model-load | high | 招生名校准、目录映射、详情/导出解释 |
| `data/taxonomy_runtime/admission_major_review_v2942.json` | 3844.5 KB | taxonomy-runtime | boot-model | high | 专业归类、招生名复核、兴趣/详情解释 |
| `data/chunks/rank_50000_80000.json` | 3341.9 KB | candidate-chunks | rank-input | high | 候选池生成 |
| `data/taxonomy/major_taxonomy.json` | 2892.7 KB | taxonomy-source | source-or-legacy | low | 源数据/构建留存 |
| `data/chunks/rank_30000_50000.json` | 2045.4 KB | candidate-chunks | rank-input | high | 候选池生成 |
| `data/taxonomy_runtime/major_taxonomy.json` | 1996.9 KB | taxonomy-runtime | boot-model | high | 专业归类、招生名复核、兴趣/详情解释 |
| `data/confusable_major_model/confusable_major_record_index_v29462.json` | 1964.1 KB | confusable-model | model-load | medium-high | 易混提醒、候选/详情复核说明 |
| `data/chunks/rank_10000_20000.json` | 1761.8 KB | candidate-chunks | rank-input | high | 候选池生成 |
| `data/confusable_major_model/confusable_major_record_index_v2946.json` | 1659.3 KB | confusable-report | debug-or-review | low | 质量复核/模型说明 |
| `data/chunks/rank_00000_10000.json` | 1623.7 KB | candidate-chunks | rank-input | high | 候选池生成 |

## 4. 类别汇总
| 类别 | 文件数 | 大小 |
|---|---:|---:|
| candidate-chunks | 6 | 11654.4 KB |
| confusable-manifest | 2 | 1.4 KB |
| confusable-model | 9 | 12005.2 KB |
| confusable-report | 4 | 8785.8 KB |
| data-manifest | 1 | 1.4 KB |
| major-name-manifest | 1 | 1.1 KB |
| major-name-model | 5 | 22626.2 KB |
| major-name-report | 2 | 5.4 KB |
| official-catalog-source | 1 | 973.9 KB |
| parent-interest-model | 3 | 4.9 KB |
| rank-map | 1 | 5.2 KB |
| school-geo-model | 3 | 876.3 KB |
| school-geo-report | 2 | 8.7 KB |
| school-static | 2 | 14.4 KB |
| student-profile-model | 1 | 5.1 KB |
| student-profile-report | 2 | 0.4 KB |
| taxonomy-report | 3 | 106.2 KB |
| taxonomy-runtime | 7 | 7463.1 KB |
| taxonomy-source | 12 | 11004.5 KB |

## 5. 审计结论
- 专业名模型、易混专业模型是当前 JSON 大头，但都是可信度资产，不能粗暴删除。
- 首屏是否必须、候选池是否必须、详情/导出是否才需要，应在后续 model-lazy/model-shard 前继续验证。
- 本版不改变任何加载策略，只为后续分级加载提供证据。
