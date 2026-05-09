# 辽宁物理类高考志愿初选工具

当前版本：**V2.9.5.4.fix3｜Pages Function 服务端访问保护版**

本版基于 `V2.9.5.4.fix2｜规则中心落地与场景保护修正版` 继续小步修订，核心目标是：

1. 保持现有 UI 和遮罩入口基本不变。
2. 将访问凭证从前端校验改为 Cloudflare Pages Functions 服务端校验。
3. 密码不写入前端 JS / HTML，而是放在 Cloudflare Pages 的变量/Secret 中。
4. 未通过访问凭证时，不加载 `data/` 内的 JSON 数据。

## 本版新增

- 新增 `functions/_middleware.js`
- 新增 `functions/fenxi/api/login.js`
- 新增 `functions/fenxi/api/logout.js`
- 新增 `functions/fenxi/api/session.js`
- 前端访问入口 UI 保留原样：输入访问凭证 → 进入工具。
- 前端不再本地比较 `ln2025`，而是提交到 `/fenxi/api/login`。
- 校验通过后由服务端写入 HttpOnly Cookie。
- `/fenxi/data/*` 和 `/data/*` 需要有效 Cookie 才能访问。

## Cloudflare Pages 需要配置的变量

在 Cloudflare Pages 项目中添加：

```text
LN_ACCESS_PASSWORD=你的访问凭证
LN_SESSION_SECRET=一段随机长字符串
LN_SESSION_DAYS=30
```

其中 `LN_SESSION_DAYS` 可不填，默认 30 天。

## 部署提醒

必须把本包根目录内容完整上传到 GitHub 仓库根目录，尤其不能漏掉：

```text
functions/
fenxi/
data/
assets/
```

如果 Cloudflare Pages 没识别到 `functions/`，通常是因为 `functions` 文件夹没有放在项目根目录。
