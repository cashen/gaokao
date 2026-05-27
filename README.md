# ln-rank v3.9.6 · 上中下 TAB 区间版

## 主线

输入物理类考生分数，系统生成：上探参考、主体参考、稳妥参考。页面改为上中下结构：

1. 顶部：考生分数与查看范围
2. 中部：区间 TAB 与地域/学校/专业筛选
3. 下部：当前 TAB 对应的专业列表

## 新增能力

- 地域筛选扩展：辽宁省内、沈阳、大连、辽宁其他、省外、北京、天津、河北、山东、吉林、黑龙江、江浙沪、广东、华中、西南、西北
- 专业卡片展示：公办/民办/双非公办、985/211/双一流、地域精确到省市
- 区间 TAB 有轻微颜色提醒，结果卡片外框与当前区间颜色对应
- 每条专业卡左侧用状态颜色提醒：匹配、稳妥、小冲、中冲等

## 部署结构

```text
网站根目录/
  fenxi/
  ln-rank/
  functions/
```

`functions` 必须在 Cloudflare Pages 项目根目录。

## 必须配置

Cloudflare Pages Secret：

```text
LN_SESSION_SECRET
```

或：

```text
ACCESS_COOKIE_SECRET
```

必须与 `/fenxi/_middleware.js` 使用的 secret 一致。

## 测试

```text
/ln-rank/VERSION.txt
/api/major-bands?candidateScore=520
/ln-rank/major-bands-diagnostics.html
```
