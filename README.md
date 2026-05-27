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
