# ln-rank v3.8.2 · Cloudflare cookie session 版

## 这版解决什么

你的 `/fenxi/data` 是由 Cloudflare Pages `_middleware.js` 保护的。  
保护方式不是 `?key=ln2026`，而是 `ln_gateway_session` cookie + HMAC secret。

因此本版改为：

```text
ln-rank 前端
→ /api/target-majors
→ Cloudflare Pages Function 后端生成临时 ln_gateway_session
→ 后端读取 /fenxi/data
→ 返回筛选后的目标分附近专业
```

## 必须配置

在 Cloudflare Pages 项目里配置 Secret：

```text
LN_SESSION_SECRET = 与 /fenxi 相同的 secret
```

或者使用：

```text
ACCESS_COOKIE_SECRET
```

## 不需要配置

```text
FENXI_ACCESS_KEY
FENXI_ACCESS_MODE
FENXI_ACCESS_QUERY
```

## 测试地址

```text
/api/target-majors?subject=physics&targetScore=500
/ln-rank/target-major-diagnostics.html
```
