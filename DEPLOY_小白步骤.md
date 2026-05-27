# v3.9.6 小白部署步骤

1. 解压 ZIP。
2. 把 `ln-rank/` 覆盖到网站根目录的 `ln-rank/`。
3. 把 `functions/` 放到网站根目录，和 `ln-rank/`、`fenxi/` 同级。
4. Cloudflare Pages 设置 Secret：`LN_SESSION_SECRET` 或 `ACCESS_COOKIE_SECRET`，值要和 `/fenxi` 使用的一样。
5. 先打开 `/ln-rank/VERSION.txt`，确认看到 v3.9.6。
6. 再打开 `/api/major-bands?candidateScore=520`，确认返回 JSON。
7. 再打开 `/ln-rank/major-bands-diagnostics.html` 自检。
8. 最后打开 `/ln-rank/`。

如果页面还是旧样式，优先检查是不是没有覆盖 `ln-rank/index.html`，然后清 Cloudflare 缓存。
