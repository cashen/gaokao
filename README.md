# ln-rank v3.9.3 · 辽宁物理类分数区间专业池版

## 主线

输入物理类考生分数，系统自动生成：

- 上探参考
- 主体参考
- 稳妥参考

并从 `/fenxi/data` 读取辽宁 2025 物理类专业数据，每条专业标注相对考生的状态。

## 部署结构

```text
网站根目录/
  fenxi/
  ln-rank/
  functions/
    api/
      major-bands.js
    _lib/
      ...
```

`functions` 必须在 Cloudflare Pages 项目根目录，不能放进 `ln-rank`。

## 必须配置

Cloudflare Pages 环境变量中配置：

```text
LN_SESSION_SECRET
```

或：

```text
ACCESS_COOKIE_SECRET
```

它必须和 `/fenxi/_middleware.js` 使用的 secret 一致。

## 测试

```text
/api/major-bands?candidateScore=520
/ln-rank/major-bands-diagnostics.html
```


---

# v3.9.4 兼容修复

修复 Cloudflare 编译时旧版 `major-window` 残留导致的导出错误：

- 补回 `rawScore`
- 补回 `rawLnArea`
- 补回 `rawSchool`
- 补回 `rawMajor`
- 补回 `hasFenxiSecret`
- 提供兼容版 `/api/major-window`

新版主页面仍然使用 `/api/major-bands`。


---

# v3.9.5 缓存修复说明

修复浏览器或 Cloudflare 缓存旧版 `major-pool-api.js` 导致的错误：

```text
does not provide an export named 'fetchMajorBands'
```

本版新增版本化文件：

```text
ln-rank/js/app.v395.js
ln-rank/js/feature/major-pool/major-bands-api.v395.js
```

并让 `index.html` 使用：

```text
./js/app.v395.js?v=395
```

这样可以绕过旧 JS 缓存。

如果线上仍报同样错误，说明 `/ln-rank/index.html` 没覆盖成功，仍在加载旧版 app.js。
