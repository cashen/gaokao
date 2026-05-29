# Cloudflare 报 rawScore / hasFenxiSecret 未导出的原因

这不是 /fenxi 数据坏了。

原因通常是：GitHub 或 Cloudflare 项目里还残留了旧版文件，例如：

```text
functions/api/major-window.js
functions/_lib/major-window-engine.js
```

v3.9.3 新主线已经改用：

```text
/api/major-bands
```

但 Cloudflare Pages 会编译 `functions/` 下的所有函数。  
只要旧文件还在，它仍然会被编译，于是就会报：

```text
fenxi-normalizer.js 没有导出 rawScore / rawLnArea / rawSchool / rawMajor
fenxi-session.js 没有导出 hasFenxiSecret
```

v3.9.4 做了两件事：

1. 给 `fenxi-normalizer.js` 补回兼容导出；
2. 给 `fenxi-session.js` 补回 `hasFenxiSecret`；
3. 同时提供兼容版 `/api/major-window`，避免旧文件残留导致 Cloudflare 编译失败。

## 最推荐做法

如果你能删除旧文件，建议直接删除：

```text
functions/api/major-window.js
functions/_lib/major-window-engine.js
ln-rank/major-window-diagnostics.html
```

只保留新版：

```text
functions/api/major-bands.js
ln-rank/major-bands-diagnostics.html
```

如果你不方便删除，直接部署 v3.9.4，也可以兼容通过。
