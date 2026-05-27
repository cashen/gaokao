# ln-rank v3.8.2 部署步骤（Cloudflare cookie session 版）

这版适配你现有 `/fenxi/_middleware.js` 的保护方式：  
`/fenxi/data` 不是用 `?key=ln2026` 访问，而是用 `ln_gateway_session` 这个 cookie 做 HMAC 验证。

所以这版做法是：

1. 用户访问 `ln-rank`；
2. 前端请求 `/api/target-majors`；
3. Cloudflare Pages Function 在后端读取 `LN_SESSION_SECRET` 或 `ACCESS_COOKIE_SECRET`；
4. 后端临时签一个 `ln_gateway_session`；
5. 后端带 cookie 读取 `/fenxi/data/manifest.json` 和 chunks；
6. 前端只拿到筛选后的专业列表，看不到 secret。

---

## 1. 文件放哪里

解压后有：

```text
ln-rank-span-tool-v3.8.2-cloudflare-cookie-session/
  ln-rank/
  functions/
  DEPLOY_CLOUDFLARE_小白步骤.md
```

上传到网站根目录后，结构应是：

```text
网站根目录/
  fenxi/
  ln-rank/
  functions/
    api/
      target-majors.js
```

注意：

`functions` 必须和 `ln-rank`、`fenxi` 同级，不能放到 `ln-rank` 里面。

---

## 2. Cloudflare 后台环境变量

进入：

```text
Cloudflare
→ Workers & Pages
→ 你的网站项目
→ Settings
→ Variables and Secrets
```

添加下面这个 Secret：

```text
LN_SESSION_SECRET = 你 /fenxi 正在使用的同一个 secret
```

如果你原来叫：

```text
ACCESS_COOKIE_SECRET
```

也可以继续用这个名字。  
这版 API 会按顺序读取：

```text
LN_SESSION_SECRET
ACCESS_COOKIE_SECRET
FENXI_SESSION_SECRET
```

三者有一个即可，但必须和 `/fenxi/_middleware.js` 的 secret 一致。

---

## 3. FENXI_DATA_BASE 要不要填？

通常不用填。

默认读取：

```text
https://你的域名/fenxi/data
```

也就是同站：

```text
/fenxi/data
```

如果你以后把数据放到别的域名，再加：

```text
FENXI_DATA_BASE = https://gaokao.powers.org.cn/fenxi/data
```

现在可以先不配。

---

## 4. 不需要再配置这些

这一版不需要：

```text
FENXI_ACCESS_KEY
FENXI_ACCESS_MODE
FENXI_ACCESS_QUERY
FENXI_ACCESS_HEADER
```

因为你现有 `_middleware.js` 不是 query key 模式，而是 cookie session 模式。

---

## 5. 部署后先测试 API

打开：

```text
https://gaokao.powers.org.cn/api/target-majors?subject=physics&targetScore=500
```

成功时会看到 JSON，里面有：

```text
ok: true
groups.upper
groups.near
groups.lower
```

如果失败：

- 401：secret 不一致，或者 API 没有带上正确 cookie；
- 500：看返回里的 message 和 hint；
- 404：functions 没放到 Cloudflare Pages 根目录。

---

## 6. 再打开自检页

```text
https://gaokao.powers.org.cn/ln-rank/target-major-diagnostics.html
```

点击“开始自检”。

成功会看到：

```text
✓ 物理类数据查询可用
✓ 目标分 500，475-510 分附近共 XX 条
```

---

## 7. 最后打开主页面

```text
https://gaokao.powers.org.cn/ln-rank/
```

点击“读取专业数据”。

---

## 8. 常见问题

### Q：我还需要用户输入密码吗？

不需要。  
用户只访问 `ln-rank`，后端函数内部用 secret 读取数据。

### Q：secret 会不会暴露到前端？

不会。  
secret 只在 Cloudflare Pages Function 里使用，前端 JS 看不到。

### Q：那 /fenxi/data 还受保护吗？

是的。  
`/fenxi/data` 仍然由你的 `_middleware.js` 保护。  
这版只是后端函数自己签一个临时 cookie 去读数据，不让用户直接读全量数据。
