# v3.9.7.4-ln-rank-standard-major-code-mapping

本版在 v3.9.7.3 匹配可信度基础上，新增“本科专业代码 / 标准专业目录映射层”。

## 关键原则

- `/fenxi` 原始招生条目中的字段前端继续显示为：**专业代码**。
- `080601` 这类教育部本科专业目录代码单独显示为：**本科专业代码**。
- 两套代码分字段保存，避免混淆。
- 所有代码均按字符串处理，前导 0 不丢失。
- 只做 `ln-rank` 和 `functions`，不包含、不修改 `/fenxi`。

## 新增能力

- `functions/_lib/standard-major-catalog.js`：可维护本科专业目录映射源。
- `functions/_lib/standard-major-mapper.js`：按专业名、别名、专业类做标准专业映射。
- `functions/_lib/fenxi-code-normalizer.js`：从原始招生条目透传 `/fenxi` 专业代码。
- 专业卡片展示：`专业代码` 与 `本科专业代码`。
- 自选池与飞书/Markdown 报告保留代码字段。

## 注意

当前 catalog 已覆盖 ln-rank 当前默认词、更多方向词、高频物理类专业和匹配策略相关专业。后续若要补齐或修正教育部完整本科目录，只增改 `standard-major-catalog.js`，不改搜索主流程。
