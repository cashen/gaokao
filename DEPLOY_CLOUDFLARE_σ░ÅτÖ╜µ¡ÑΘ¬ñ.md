# ln-rank v3.8.1 Cloudflare 安全部署步骤（小白版）

## 这版解决什么问题

原来 v3.8 让前端浏览器直接读取：

```text
/fenxi/data/manifest.json
/fenxi/data/chunks/*.json
```

但你的 `/fenxi` 数据由 Cloudflare 环境变量控制，所以浏览器直接读不到。

v3.8.1 改成：

```text
ln-rank 前端
  ↓
/api/target-majors
  ↓ Cloudflare Pages Function 读取环境变量
/fenxi/data
  ↓
返回筛选后的“目标分附近专业”
```

这样前端不会包含密码或环境变量。

---

## 目录怎么放

这个 ZIP 解压后有两个关键目录：

```text
ln-rank/       放到网站的 /ln-rank 路径
functions/     放到 Cloudflare Pages 项目根目录
```

注意：`functions` 不能放进 `ln-rank` 里面。它必须在 Cloudflare Pages 项目根目录。

---

## 你需要设置的环境变量

在 Cloudflare Pages 项目里设置：

```text
FENXI_DATA_BASE
FENXI_ACCESS_KEY
FENXI_ACCESS_MODE
```

推荐值：

```text
FENXI_DATA_BASE = https://gaokao.powers.org.cn/fenxi/data
FENXI_ACCESS_KEY = 你自己的值，例如 ln2026
FENXI_ACCESS_MODE = query
```

如果你的 `/fenxi` 是用 query 参数验证，一般用：

```text
FENXI_ACCESS_MODE = query
FENXI_ACCESS_QUERY = key
```

最终访问会类似：

```text
https://gaokao.powers.org.cn/fenxi/data/manifest.json?key=你的密钥
```

如果你的 `/fenxi` 是用请求头验证，改成：

```text
FENXI_ACCESS_MODE = header
FENXI_ACCESS_HEADER = x-fenxi-access-key
```

如果你的 `/fenxi` 是 Bearer Token，改成：

```text
FENXI_ACCESS_MODE = bearer
```

---

## Cloudflare 后台操作步骤

1. 打开 Cloudflare 控制台。
2. 进入 `Workers & Pages`。
3. 找到你的网站 Pages 项目。
4. 点 `Settings`。
5. 找到 `Environment variables` 或 `Variables and Secrets`。
6. 添加变量：

```text
FENXI_DATA_BASE = https://gaokao.powers.org.cn/fenxi/data
FENXI_ACCESS_MODE = query
FENXI_ACCESS_QUERY = key
```

7. 添加 Secret：

```text
FENXI_ACCESS_KEY = 你的访问值
```

8. 保存后重新部署 Pages。

---

## 部署后怎么测试

部署完成后，先打开：

```text
https://gaokao.powers.org.cn/ln-rank/target-major-diagnostics.html
```

点击“开始自检”。

如果看到：

```text
✓ 物理类数据查询可用
✓ 目标分 500，475-510 分附近共 XX 条
```

说明成功。

如果失败，直接打开：

```text
https://gaokao.powers.org.cn/api/target-majors?subject=physics&targetScore=500
```

看返回的错误提示。

---

## 常见错误

### 1. 404 Not Found

说明 `functions` 没有放到 Cloudflare Pages 项目根目录，或者 Pages Functions 没启用。

### 2. 读取 /fenxi 数据失败 403

说明环境变量密钥不对，或 `/fenxi` 那边不是用当前这种验证方式。

先确认：

```text
FENXI_ACCESS_MODE=query
FENXI_ACCESS_QUERY=key
FENXI_ACCESS_KEY=你的值
```

### 3. 前端页面能打开，但专业列表读不到

先跑：

```text
/ln-rank/target-major-diagnostics.html
```

再跑：

```text
/api/target-majors?subject=physics&targetScore=500
```

看具体错误。

---

## 重要原则

不要把 `FENXI_ACCESS_KEY` 写进前端 JS。

前端用户只能看到：

```text
/api/target-majors
```

看不到真正的环境变量。

