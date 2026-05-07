# 浙江高考专业投档与位次分析 V1

这是一个**浙江版静态网页工具**，基于 `zhejiang_data_package_v2` 数据底座开发。

它的目标不是简单复制辽宁版，而是把辽宁版的卡片式体验和查询思路，重构成适合浙江数据口径的版本。

## 1. 这个工具能做什么

当前 V1 支持：

- 按学校名称查询
- 按专业名称查询
- 按学校 + 专业精确查询
- 按分数段查询
- 过滤学校所在省份
- 显示 2024 / 2025 分数和位次
- 显示 2024-2025 一对一匹配专业的变化
- 支持 2025 的“一段最低分 / 最终最低分”双口径
- 显示数据核验数量，避免误以为数据丢失

暂时不做：自动冲稳保、选科匹配、学费、招生计划、专业代码补全。这些字段已经预留，后续可以扩展。

---

## 2. 怎么打开

不要直接双击 `index.html`，因为浏览器会限制本地 JSON 读取。

请在本目录运行：

```bash
python -m http.server 8000
```

然后浏览器打开：

```text
http://localhost:8000/
```

---

## 3. 目录结构

```text
zhejiang_gaokao_tool_v1/
  index.html                 # 主页面
  README.md                  # 当前说明文档

  assets/
    app.zj.v1.js             # 浙江版前端逻辑
    app.zj.v1.css            # 浙江版样式

  data/
    manifest.json            # 数据总索引，记录数量、分片位置、对比文件位置

    audit/
      audit_2024.json        # 2024 数据审计
      audit_2025.json        # 2025 数据审计
      audit_summary.json     # 两年汇总审计

    raw/
      2024/                  # 2024 全量 raw 分片
      2025/                  # 2025 全量 raw 分片

    shards/
      2024/analysis/         # 2024 按分析分数拆分
      2025/analysis/         # 2025 默认口径分片：一段优先
      2025/first_stage/      # 2025 一段最低分分片
      2025/final/            # 2025 最终最低分分片

    index/
      schools_index.json     # 学校索引：学校名 -> record_id 列表
      majors_index.json      # 专业索引：专业名 -> record_id 列表
      province_index.json    # 学校省份索引
      record_locator.json    # record_id -> raw 分片路径

    compare/
      compare_summary.json         # 对比汇总
      compare_exact_normal.json    # 普通类一对一精确匹配
      compare_need_review.json     # 需要复核的重复/冲突组
      compare_added_2025.json      # 2025 新增或未匹配记录
      compare_removed_2025.json    # 2024 有但 2025 未匹配记录
      top_harder_by_rank.json      # 位次前移较多
      top_easier_by_rank.json      # 位次后退较多

  docs/
    数据口径说明.md
    字段说明.md
    调用说明.md

  tools/
    verify_package.py        # 数据完整性测试脚本

  TEST_REPORT.json           # 本次打包前生成的测试报告
```

---

## 4. 关键字段解释

### 4.1 record_id

每一条投档记录的唯一编号。

例：

```json
"record_id": "zj2025_05743"
```

注意：不能用“学校 + 专业”当唯一键，因为同一个学校同一个专业可能出现多条记录。

---

### 4.2 school_code

院校代码。

例：

```json
"school_code": "2133"
```

前导 0 会保留，比如浙江大学是 `0001`。

---

### 4.3 major_code

当前原始 XML 没有专业代码字段。

所以网页显示：

```text
源数据未提供
```

后续可以从招生计划表或官方专业目录补充。

---

### 4.4 score

2024 和 2025 字段不完全一样，所以统一放到 `score` 对象里。

2024 示例：

```json
"score": {
  "avg_score": 533.3,
  "min_score": 487,
  "first_stage_min_score": null,
  "analysis_score": 487,
  "analysis_score_source": "min_score"
}
```

2025 示例：

```json
"score": {
  "avg_score": null,
  "min_score": 487,
  "first_stage_min_score": 555,
  "analysis_score": 555,
  "analysis_score_source": "first_stage_min_score",
  "final_score": 487
}
```

---

## 5. 2025 为什么有两个分数

2025 文件里有：

```text
最低分
一段最低分
```

所以浙江版不能只看一个分数。

本工具设置了三个口径：

| 口径 | 前端选项 | 用途 |
|---|---|---|
| 默认一段优先 | analysis | 正常志愿参考，默认使用 |
| 一段最低分 | first_stage | 明确只看一段投档门槛 |
| 最终最低分 | final | 看最终低分进入或二段场景 |

正常家长查志愿，建议先看默认口径。

---

## 6. 前端怎么调用数据

### 6.1 查询学校 + 专业

流程：

```text
输入学校/专业
  ↓
读取 schools_index.json / majors_index.json
  ↓
得到 record_id
  ↓
通过 record_locator.json 找到 raw 分片
  ↓
读取 raw/2024 或 raw/2025 对应 JSON
  ↓
渲染结果
```

### 6.2 按分数查

流程：

```text
输入分数
  ↓
判断分数段，比如 550-599
  ↓
读取 shards/2025/analysis/zj_2025_analysis_550_599.json
  ↓
筛出附近分数
  ↓
渲染结果
```

### 6.3 2024-2025 对比

流程：

```text
得到查询结果
  ↓
取 compare_key_exact
  ↓
读取 compare/compare_exact_normal.json
  ↓
显示 2024 分数位次、2025 分数位次、变化方向
```

---

## 7. 本包数据完整性

打包前已测试：

```text
2024 raw：24973 条
2025 raw：23508 条
总记录：48481 条
record_locator：48481 条
2024 source_row 连续：2-24974
2025 source_row 连续：2-23509
辽宁科技大学 通信工程样例：通过
ZIP 完整性：通过
```

详情见：

```text
TEST_REPORT.json
```

---

## 8. 已知边界

- 目前没有专业代码，显示“源数据未提供”。
- 目前没有选科要求，后续应补 `subject_requirement`。
- 目前没有招生计划数，位次变化暂不能区分“热度变化”还是“扩招/缩招影响”。
- 目前没有学费、城市、中外合作字段，这些适合 V1.1 扩展。

---

## 9. 部署到 Cloudflare Pages

把整个目录上传到 GitHub 仓库，然后 Cloudflare Pages 选择该仓库即可。

构建命令留空，输出目录留根目录或 `/`。

只要 `index.html`、`assets/`、`data/` 在同一级目录，就能正常运行。
