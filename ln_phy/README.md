# 辽宁物理类高考志愿初选工具 V1

这是基于 2024/2025 辽宁物理类普通本科批投档最低分全量数据、一分一段累计位次、重点学科提醒和风险标签制作的静态前端工具。

## 快速使用

1. 打开 `web/index.html`
2. 输入访问码：`ln2025`
3. 输入 2025 分数或位次
4. 点击“生成初选”
5. 搜索、筛选、加入候选清单、导出 CSV

## 数据文件

- `data/records_compare_full_ranked.json`：2024—2025 全专业对比库
- `data/admissions_2024_full_ranked.json`：2024 年全量库
- `data/admissions_2025_full_ranked.json`：2025 年全量库
- `data/rank_2024_physics.json`：2024 一分一段累计位次
- `data/rank_2025_physics.json`：2025 一分一段累计位次
- `data/run_manifest.json`：数据构建统计

## 注意

- 本工具用于初选和核验，不替代正式志愿填报系统。
- 冲稳保模型是经验区间，不等于录取概率。
- 学费字段当前保留为“待核验”，建议后续接入学校招生计划/招生章程来源。
