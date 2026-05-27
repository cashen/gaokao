# v3.9.3 小白部署步骤

1. 上传目录，保持结构：

```text
网站根目录/
  fenxi/
  ln-rank/
  functions/
```

2. Cloudflare Pages 设置 Secret：

```text
LN_SESSION_SECRET = 与 /fenxi 相同的 secret
```

3. 先测试 API：

```text
https://gaokao.powers.org.cn/api/major-bands?candidateScore=520
```

4. 再打开自检页：

```text
https://gaokao.powers.org.cn/ln-rank/major-bands-diagnostics.html
```

5. 最后打开主页面：

```text
https://gaokao.powers.org.cn/ln-rank/
```
