# v3.9.13 ln-rank 资产清理与一键分析版

本版基于 v3.9.12，不改搜索排序、不改历史录取数据、不动 /fenxi 静态目录。

## 重点

- 新增 `tools/analyze-ln-rank-assets-v3913.mjs`，一键分析当前入口 HTML 与 JS import 链。
- 清理当前入口不可达的历史 JS/CSS 文件。
- 保留仍被当前入口 import 的旧版本号功能模块，避免凭版本号误删。
- 保留 `functions/_lib/fenxi-session.js`，兼容当前 Cloudflare 项目中可能存在的旧 fenxi 鉴权链路。

## 核验命令

```bash
node tools/analyze-ln-rank-assets-v3913.mjs --write
node tools/check-ln-rank-release-v3913.mjs
node tools/check-standard-major-catalog-2026-full.mjs
```

## 当前资产状态

- JS：50 个 active，0 个 orphan。
- CSS：27 个 active，0 个 orphan。
- 旧版本号但仍在使用的文件会在 `reports/ln-rank-asset-analysis-v3913.md` 中列出，不要按版本号直接删除。
