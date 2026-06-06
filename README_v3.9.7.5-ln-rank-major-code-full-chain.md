# v3.9.7.5-ln-rank-major-code-full-chain

本版在 v3.9.7.4 基础上，把“专业代码”做成完整链路能力。

## 核心收口

- ln-rank 前端统一显示：`专业代码：080601｜电气工程及其自动化`。
- “专业代码”统一指 ln-rank 根据本科专业目录映射出的专业代码，不再在前端混用 /fenxi 原始条目号。
- /fenxi 原始条目号如存在，仅保留在内部 `rawFenxiMajorCode`，不作为卡片专业代码展示。

## 显示范围

- 搜索结果卡片显示专业代码或专业类。
- 加入自选池后保存 `standardMajor`。
- 自选池 list 显示专业代码或专业类。
- 飞书 / Markdown 报告条目中输出专业代码。

## 映射规则

- `exact / alias`：显示 `专业代码：080601｜电气工程及其自动化`。
- `category`：显示 `专业类：0806｜电气类`。
- `ambiguous / unmapped`：默认不显示，避免误导。

## 维护方式

- 标准专业目录维护入口：`functions/_lib/standard-major-catalog.js`。
- 专业名清洗：`functions/_lib/standard-major-normalizer.js`。
- 映射器：`functions/_lib/standard-major-mapper.js`。
- 业务主流程只调用 `mapStandardMajor()`，不在 matcher 和 render 主逻辑里写死专业名。

## 不包含

- 不包含 `/fenxi/` 静态目录。
- 不包含 `functions/fenxi/`。
- 不包含 `functions/_middleware.js`。
