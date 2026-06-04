# v3.9.8.2-ln-rank-asset-integrity-and-report-stability-baseline

本版用于修复 v3.9.8.1 部署后出现的 CSS/JS 请求返回 HTML、ES module MIME 校验失败、页面无法启动问题。

## 重点

- 所有 `index.html` / `selection-pool.html` 入口引用统一升级到 `v3982`。
- 所有被入口模块 import 的 `v3982` JS 文件均随包提供。
- 所有 `v3982` CSS 文件均随包提供。
- 保留 v3.9.8.1 的产品成熟度能力：生命食品、动物医学/食品匹配策略、专业代码、家长文案、自选专业、报告文案。
- 飞书报告相关接口与前端报告模块继续保留，并纳入完整性检查。

## 发布检查

```bash
node tools/check-ln-rank-release.mjs
```

通过后再部署。

## 部署提醒

必须完整覆盖 `ln-rank/` 静态目录与 `functions/` 目录。不要只覆盖 HTML 或 functions。
