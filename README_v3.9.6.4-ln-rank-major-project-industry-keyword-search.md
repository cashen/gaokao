# v3.9.6.4-ln-rank-major-project-industry-keyword-search

本版升级“专业名称”为“专业 / 项目 / 行业关键词”，同时统一搜索页与自选池页版本号到 v3964。

## 核心能力

- 支持多关键词 OR：空格、/、逗号、顿号、分号、竖线。
- 原词永远参与搜索，防止土木、环境、材料、水产、测绘等非热门方向搜不到。
- 专业方向词：计算机、电气、土木、环境、材料、临床、护理、会计等。
- 项目属性词：中外、合作办学、高收费、公费师范、定向、校企合作等。
- 行业路径词：石油、交通、航天、航空、铁道、电力、邮电、海洋、地矿、农林、医药、财经、政法、师范等。
- 中外/高收费不绕过公办底线；只看公办普通时会提示冲突。
- 搜索使用预处理文本域与模块化词典，便于后续维护扩展。

## 发版一致性

- `ln-rank/index.html` 引用 `app.v3964.js`。
- `ln-rank/selection-pool.html` 引用 `selection-pool.v3964.js`。
- 新增 `ln-rank/js/shared/release-meta.v3964.js`。
- 新增 `tools/check-ln-rank-version.mjs`。

## 不包含

- 不包含 `/fenxi/` 静态目录。
- 不包含 `functions/fenxi/`。
- 不包含 `functions/_middleware.js`。
