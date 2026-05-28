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
---

# v3.9.10 查看入口强化版

解决“我不知道在哪里查看”的问题：

- 查看按钮固定放在筛选条件下面；
- 文案改为“查看符合条件的专业 / 更新结果 / 重新尝试”；
- 输入分数后按钮会变为可点击；
- 如果浏览器自动保留了分数，也会在启动时读取，避免按钮仍然灰；
- 点击按钮后自动滚动到结果区；
- 按 Enter 也可以查询；
- 初始不自动请求 `/fenxi` 数据。
---

# v3.9.11 按钮可点击修复

修复“手动输入 520 后查看按钮仍然灰色、无法点击”的问题：

- 查看按钮不再因为未识别分数而禁用；
- 点击按钮时会重新读取输入框当前值；
- 监听 input / change / keyup / paste / compositionend / blur；
- 输入分数后按钮应显示“查看符合条件的专业”；
- 即使事件没触发，点击按钮也会再次解析分数；
- 按 Enter 仍可查询。
---

# v3.9.12 分数边界提示版

新增分数输入边界：

- `<400`：提示当前专业池主要覆盖 400 分以上区间，建议专科批、职业本科、民办和当年计划单独分析；
- `400-699`：正常查询；
- `700-750`：高分段提示，可继续查询，但提醒重点看位次、专业方向、城市偏好和计划变化；
- `>750`：提示超过常规满分范围，请检查是否输入错了。

页面初始仍不自动查询，用户输入有效分数后点击查看。
---

# v3.9.13 飞书报告版

新增：

- 结果区“一键生成飞书报告”
- 成功后显示“打开飞书报告 / 复制链接”
- 前端不包含 App Secret
- Cloudflare 后端读取 `FEISHU_APP_ID / FEISHU_APP_SECRET`
- 后端重新基于 `/fenxi` 数据生成当前 TAB 报告
- 报告第一版只生成当前 TAB 前 20 条，避免过长
- 使用飞书 Markdown/HTML 转文档块接口，失败时降级为基础 docx blocks

新增自检：

```text
/ln-rank/feishu-diagnostics.html
```
---

# v3.9.14 飞书匿名分享版

新增：

- 生成飞书 docx 报告后，自动调用 Drive 权限接口；
- 默认设置为“互联网上获得链接的人可阅读”；
- 成功后页面显示“已设置为获得链接的人可阅读”；
- 如果权限设置失败，仍返回文档链接，并展示 `permissionWarning`。

新增后端模块：

```text
functions/_lib/feishu-permission.js
```

可选环境变量：

```text
FEISHU_PUBLIC_SHARE=false      # 关闭自动匿名分享
FEISHU_PERMISSION_TYPE=docx    # 强制指定权限对象类型，默认先尝试 docx
```
---

# v3.9.15 飞书指定文件夹版

新增独立配置模块：

```text
functions/_lib/feishu-folder-config.js
```

默认 Folder Token：

```text
Bpl6f4yh5lt3TcdHBCScuxRmnyc
```

创建飞书文档时会把 `folder_token` 传给飞书文档创建接口，新报告默认进入：

```text
https://my.feishu.cn/drive/folder/Bpl6f4yh5lt3TcdHBCScuxRmnyc
```

环境变量 `FEISHU_DOC_FOLDER_TOKEN` 仍然可用，并且优先级高于内置默认值。
---

# v3.9.16 飞书无指定文件夹版

移除指定文件夹保存功能：

- 删除 `functions/_lib/feishu-folder-config.js`
- 创建飞书文档时不再传 `folder_token`
- 不再读取 `FEISHU_DOC_FOLDER_TOKEN`
- 避免因为文件夹未给应用权限而出现 `no folder permission`

仍然保留：

- 生成飞书 docx 报告
- 打开飞书报告 / 复制链接
- 自动设置匿名可读
---

# v3.9.17 2024 历史成绩与地域统一版

新增：

- 2024 最低分 / 最低位次字段探测；
- `historyCompare` 两年对比；
- 卡片显示“历史参考”；
- 飞书报告同步输出 2024 参考；
- 新增 `location-normalizer.js`，统一地域显示；
- 新增 `school-location-map.js`，对常见辽宁院校做城市兜底；
- 校区不确定时输出 `locationWarning`，避免假精确。

注意：2025 仍是主口径，2024 只作为历史参考，不等同于 2026 预测。
---

# v3.9.18 学校地理实体层

新增：

- `school-geo-db.js`：学校/分校/校区地理库；
- `school-alias-map.js`：学校别名归一；
- `school-geo-normalizer.js`：校区优先匹配逻辑；
- `/api/school-geo-audit`：从 /fenxi 数据抽取学校并检查匹配情况；
- `/ln-rank/school-geo-audit.html`：小白可看的地域匹配自检页。

重点修复：

- 东北大学秦皇岛分校 → 河北 · 秦皇岛；
- 哈尔滨工业大学(深圳) → 广东 · 深圳；
- 山东大学威海校区 → 山东 · 威海；
- 北京交通大学威海校区 → 山东 · 威海。

原则：

- 校区/分校实体优先于学校主体；
- 不能确认时显示“需核验”，不假装精准；
- 网页卡片、地域筛选、飞书报告统一使用同一套地理字段。
---

# v3.9.19 fenxi 全量学校地域库接入版

这版不再只用手写种子库，而是接入在线版 `/fenxi` 包中的学校地域模型：

```text
fenxi/data/school_geo_model/school_geo_reference_v29471.json
```

生成：

```text
functions/_lib/school-geo-reference.generated.js
```

数据规模：

```text
944 条学校地域记录
```

同时保留独立可维护的校区修正：

```text
functions/_lib/school-geo-campus-overrides.js
```

重点修正：

```text
东北大学秦皇岛分校 → 河北 · 秦皇岛
北京交通大学(威海校区) → 山东 · 威海
北京师范大学(珠海校区) → 广东 · 珠海
大连理工大学(盘锦校区) → 辽宁 · 盘锦
```

自检页：

```text
/ln-rank/school-geo-audit.html
```
---

# v3.9.20 AI现实诊断 Skill 版

新增：

- 单张专业卡片“现实诊断”按钮；
- Cloudflare Workers AI 后端接口 `/api/card-diagnose`；
- 用户上传的高报 skill 规则工程化写入后端 prompt；
- 未绑定 Workers AI 时自动降级为规则版诊断；
- 新增 `/ln-rank/ai-diagnostics.html` 自检页；
- 输出固定为：一句话判断、主要依据、现实提醒、需要核验。

Cloudflare 需要：

```text
Workers AI Binding 名称：AI
AI_CARD_MODEL = 你选择的模型名
```

该功能不做录取概率，不承诺“稳了/必上”，不改变原始专业池排序。
---

# v3.9.21 AI诊断弹窗版

调整：

- “现实诊断”不再在卡片内展开；
- 点击后弹出独立诊断卡片；
- 支持右上角关闭、点击遮罩关闭、Esc 关闭；
- 保留 Cloudflare Workers AI 和规则版 fallback。
---

# v3.9.22 AI诊断多终端弹窗版

优化：

- PC：居中弹窗；
- 平板：居中大卡片；
- 手机：底部抽屉式弹层；
- 支持安全区、移动端 `dvh`、内部滚动；
- 增加底部“阅读完成，关闭”按钮；
- 打开弹窗时锁定背后页面滚动。
