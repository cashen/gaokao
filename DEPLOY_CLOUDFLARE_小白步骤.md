# v3.9 小白部署步骤

## 1. 放文件

解压后放到网站根目录，最终像这样：

```text
网站根目录/
  fenxi/
  ln-rank/
  functions/
    api/
      major-window.js
    _lib/
      fenxi-session.js
      fenxi-fetcher.js
      fenxi-manifest.js
      fenxi-normalizer.js
      major-window-engine.js
      status-engine.js
```

注意：`functions` 不要放进 `ln-rank`。

## 2. Cloudflare 配置 Secret

进入：

```text
Cloudflare → Workers & Pages → 你的项目 → Settings → Variables and Secrets
```

添加 Secret：

```text
LN_SESSION_SECRET = 和 /fenxi 现在使用的一样
```

如果你原来叫 `ACCESS_COOKIE_SECRET`，也可以继续用这个名字。

## 3. 先测试接口

打开：

```text
https://gaokao.powers.org.cn/api/major-window?candidateScore=520&viewScore=533
```

成功会看到 JSON，里面有：

```text
ok: true
counts
upper / near / lower
```

## 4. 再测试自检页

打开：

```text
https://gaokao.powers.org.cn/ln-rank/major-window-diagnostics.html
```

点击“开始自检”。

## 5. 最后打开主页面

```text
https://gaokao.powers.org.cn/ln-rank/
```

输入考生分数，拖动滑轨。
