# v3.9.13 飞书报告部署步骤

## 1. 先处理密钥

你之前已经把 App Secret 发出来过，建议在飞书开放平台重置一次。  
新的 App Secret 不要写进前端，不要提交 GitHub。

## 2. Cloudflare Pages 配置 Secrets

进入：

```text
Cloudflare → Workers & Pages → 你的网站 → Settings → Variables and Secrets
```

添加：

```text
FEISHU_APP_ID = cli_xxx
FEISHU_APP_SECRET = 新重置后的 secret
FEISHU_DOC_HOST = https://my.feishu.cn
```

其中 `FEISHU_APP_SECRET` 必须用 Secret。

## 3. 继续保留原有变量

原来的专业池仍需要：

```text
LN_SESSION_SECRET
```

或：

```text
ACCESS_COOKIE_SECRET
```

用于服务端读取 `/fenxi/data`。

## 4. 部署文件结构

正确结构：

```text
网站根目录/
  ln-rank/
  functions/
    api/
      major-bands.js
      feishu-create-report.js
    _lib/
      ...
  fenxi/
```

`functions` 必须在项目根目录，不要放进 `ln-rank/`。

## 5. 测试顺序

先测前端模块：

```text
/ln-rank/module-health.html
```

再测专业池：

```text
/ln-rank/major-bands-diagnostics.html
```

再测飞书报告：

```text
/ln-rank/feishu-diagnostics.html
```

最后打开主页面：

```text
/ln-rank/index.html?v=3913
```

输入分数 → 查看专业 → 点击“生成飞书报告”。

## 6. 页面效果

未生成前：

```text
生成飞书报告
```

生成中：

```text
正在生成飞书报告…
```

成功后：

```text
飞书报告已生成
打开飞书报告
复制链接
```
## 7. 默认匿名分享说明

v3.9.14 会在生成飞书文档后自动调用云文档权限接口，尝试设置为：

```text
互联网上获得链接的人可阅读
```

一般不需要额外配置。如果你想关闭这个行为，可以在 Cloudflare 中设置：

```text
FEISHU_PUBLIC_SHARE = false
```

如果某些租户要求显式文档类型，可设置：

```text
FEISHU_PERMISSION_TYPE = docx
```

如果生成成功但匿名分享失败，页面仍会返回文档链接，并提示权限设置失败原因。
