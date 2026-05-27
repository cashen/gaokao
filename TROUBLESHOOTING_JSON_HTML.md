# 解决 Unexpected token '<', '<html lang' is not valid JSON

这个错误的意思是：代码本来要读取 JSON，但实际拿到的是一个 HTML 页面。

常见原因有两个：

## 1. /api/major-window 没有命中 Cloudflare Function

浏览器打开：

```text
https://gaokao.powers.org.cn/api/major-window?candidateScore=520&viewScore=533
```

如果看到的是网页 HTML，而不是 JSON，说明：

- `functions/` 目录没有放在 Cloudflare Pages 项目根目录；
- 或者部署没有生效；
- 或者你把 `functions` 放进了 `ln-rank/` 里面。

正确结构：

```text
网站根目录/
  fenxi/
  ln-rank/
  functions/
    api/
      major-window.js
```

## 2. /fenxi/data/manifest.json 返回了 HTML

如果 `/api/major-window` 返回 JSON，但 JSON 里提示 `/fenxi 数据返回 HTML`，说明后端 Function 工作了，但它去读 `/fenxi/data/manifest.json` 时读到的不是数据文件。

检查：

- `/fenxi/data/manifest.json` 是否真实部署；
- `FENXI_DATA_BASE` 是否错误；
- 如果不确定，先不要配置 `FENXI_DATA_BASE`，让它默认读同站 `/fenxi/data`；
- Cloudflare Pages 是否把缺失路径重定向到了 `index.html`。

## 3. Secret 检查

Cloudflare Pages 项目里必须配置和 `/fenxi/_middleware.js` 相同的 Secret：

```text
LN_SESSION_SECRET
```

或：

```text
ACCESS_COOKIE_SECRET
```

## 4. 推荐测试顺序

1. 打开 `/api/major-window?candidateScore=520&viewScore=533`
2. 打开 `/ln-rank/major-window-diagnostics.html`
3. 再打开 `/ln-rank/`

不要先看主页面，先让 API 和自检通过。


---

# v3.9.2 修复：/fenxi/data/data/chunks 双 data 问题

如果你看到：

```text
/fenxi/data/data/chunks/rank_50000_80000.json
```

这说明 `manifest.json` 里的 chunk 路径本身已经带了 `data/chunks/...`，而旧版 fetcher 又把它拼到了 `/fenxi/data/` 后面，导致路径变成双 data。

v3.9.2 已修复路径归一化：

```text
data/chunks/rank_x.json      → chunks/rank_x.json
/fenxi/data/chunks/rank_x    → chunks/rank_x
chunks/rank_x.json           → chunks/rank_x.json
```

部署 v3.9.2 后，实际请求应该变成：

```text
https://gaokao.powers.org.cn/fenxi/data/chunks/rank_50000_80000.json
```

而不是：

```text
https://gaokao.powers.org.cn/fenxi/data/data/chunks/rank_50000_80000.json
```
