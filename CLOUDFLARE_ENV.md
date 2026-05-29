# Cloudflare 环境变量与绑定说明

## 必需部署位置

本项目部署在 Cloudflare Pages。`functions` 目录必须在项目根目录。

---

## /fenxi 数据读取相关

至少需要保证线上存在：

```text
/fenxi/data/manifest.json
/fenxi/data/chunks/*.json
```

如果 `/fenxi` 数据受访问控制，需要配置你当前项目使用的访问口令变量：

```text
LN_SESSION_SECRET
```

或历史兼容变量：

```text
ACCESS_COOKIE_SECRET
```

实际使用哪个以当前 functions/_lib/fenxi-session.js 为准。

---

## 飞书报告相关

```text
FEISHU_APP_ID
FEISHU_APP_SECRET
```

说明：

```text
v3.9.16 起已移除指定文件夹保存，不再读取 FEISHU_DOC_FOLDER_TOKEN。
```

---

## Cloudflare Workers AI 相关

### 绑定

路径：

```text
Workers & Pages
→ 你的 Pages 项目
→ Settings
→ Bindings
→ Add
→ Workers AI
```

绑定变量名必须是：

```text
AI
```

代码读取：

```js
context.env.AI
```

### 模型变量

路径：

```text
Settings
→ Variables and Secrets
```

变量名：

```text
AI_CARD_MODEL
```

推荐当前值：

```text
@cf/meta/llama-3.1-8b-instruct
```

也可以换成其他 Cloudflare Workers AI 支持的 `@cf/...` 模型。

---

## AI额度用完

Cloudflare Workers AI 免费额度为每天 10,000 Neurons。

v3.9.24 起，如果额度用完，系统会：

```text
自动切换规则版诊断
弹窗显示“额度已用完 · 规则版”
不直接暴露 429 / 3036 / Account limited 英文错误
```

---

## 修改变量后必须重新部署

Cloudflare 修改 Bindings 或 Variables 后，建议重新部署 Pages，否则线上函数可能仍使用旧配置。

---

## 部署后检查

```text
/ln-rank/VERSION.txt
/ln-rank/module-health.html
/ln-rank/ai-diagnostics.html
/ln-rank/feishu-diagnostics.html
/ln-rank/school-geo-audit.html
```
