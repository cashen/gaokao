# ln-rank v3.9 · 物理类分数滑轨探索版

## 这版做什么

- 放弃历史类专业池逻辑，专注辽宁物理类。
- 以考生分数为 0 点。
- 滑轨左右查看附近分数带。
- 从 `/fenxi/data` 读取物理类历史院校专业数据。
- 每条专业按相对考生分数标注：超低、保底、稳妥、匹配、小冲、中冲、大冲、超冲。

## 部署结构

```text
网站根目录/
  fenxi/
  ln-rank/
  functions/
    api/major-window.js
    _lib/*.js
```

`functions` 必须和 `ln-rank`、`fenxi` 同级。

## Cloudflare 必须配置

在 Pages 项目里配置 Secret：

```text
LN_SESSION_SECRET = 与 /fenxi/_middleware.js 使用的同一个 secret
```

或继续使用：

```text
ACCESS_COOKIE_SECRET
```

## 测试

```text
/ln-rank/major-window-diagnostics.html
/api/major-window?candidateScore=520&viewScore=533
```

## 口径

本功能基于 `/fenxi` 已接入的辽宁 2025 物理类历史录取数据，用于形成可讨论专业池，不等同于录取预测。正式填报仍需结合当年位次、等位分/同位分、招生计划、专业要求等信息。


## v3.9.1 修复

增强 JSON/HTML 错误识别。如果接口或 /fenxi 数据路径返回 HTML，会显示更明确的原因，不再只出现 `Unexpected token '<'`。
---

# v3.9.2 路径修复说明

修复 `/fenxi/data/data/chunks/...` 的双 data 拼接问题。

原因：`/fenxi/data/manifest.json` 中的 chunk.file 可能已经是 `data/chunks/...`，旧版又拼接到 `/fenxi/data/` 后，导致实际请求路径错误。

v3.9.2 在 Cloudflare Function 里增加 `normalizeFenxiDataPath()`，统一把：

- `data/chunks/...`
- `/data/chunks/...`
- `fenxi/data/chunks/...`
- `/fenxi/data/chunks/...`

归一为：

- `chunks/...`
