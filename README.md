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

---

# v3.9.7 修复说明

修复：

```text
renderBandTabs 未导出
```

原因通常是浏览器或 Cloudflare 缓存了旧版 `score-bands-render.js`。

本版新增版本化文件：

```text
ln-rank/js/app.v397.js
ln-rank/js/feature/score-bands/score-bands-render.v397.js
ln-rank/js/feature/major-pool/major-bands-api.v397.js
```

并且取消默认 520 分。页面初始不自动读取 `/fenxi` 数据，只有输入考生分数后才会读取专业列表。
---

# v3.9.8 修复说明

修复：

```text
major-pool-render.js does not provide an export named renderMajorResults
```

原因通常是浏览器或 Cloudflare 缓存了旧版 `major-pool-render.js`。  
本版改为版本化导入：

```text
app.v398.js
major-pool-render.v398.js
major-bands-api.v398.js
score-bands-render.v398.js
```

同时新增顶部状态提示点：

- 绿色：程序就绪 / 读取完成
- 黄色：正在读取
- 红色：读取异常

初始不读取数据，用户输入考生分数后才请求 `/api/major-bands`。
---

# v3.9.9 人类流程修复版

修复重点：

- 补齐并版本化 `fmt / toInt / REGION_OPTIONS / renderBandTabs / renderMajorResults / fetchMajorBands`
- 新增 `/ln-rank/module-health.html` 前端模块自检
- 初始状态不查询数据，显示“程序就绪”
- “重新读取”改为筛选区下方主按钮
- 按钮文案根据状态变化：
  - 请输入分数后查看
  - 查看符合条件的专业
  - 正在查询…
  - 更新结果
  - 重新尝试
- 地域选项本地加载，不依赖 API
