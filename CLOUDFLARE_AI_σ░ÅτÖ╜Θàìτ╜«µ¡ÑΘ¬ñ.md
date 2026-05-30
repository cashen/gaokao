# Cloudflare Workers AI 小白配置步骤

## 1. 先部署 v3.9.20 ZIP

上传部署后先打开：

```text
/ln-rank/VERSION.txt
```

应显示：

```text
v3.9.20 ai-skill-card-diagnose
```

## 2. 绑定 Workers AI

进入 Cloudflare：

```text
Workers & Pages
→ 你的 Pages 项目
→ Settings
→ Bindings
→ Add
→ Workers AI
```

变量名必须填：

```text
AI
```

注意：必须是大写 `AI`。代码里读取的是 `context.env.AI`。

## 3. 设置模型名

进入：

```text
Settings
→ Variables and Secrets
```

新增普通变量：

```text
AI_CARD_MODEL = 你选择的 Cloudflare Workers AI 模型名
```

例如你自己选好的模型名就填在这里。  
如果不填，代码默认尝试：

```text
@cf/meta/llama-3.1-8b-instruct
```

## 4. 重新部署

绑定和变量保存后，重新部署一次 Pages。

## 5. 先测试 AI 自检页

打开：

```text
/ln-rank/ai-diagnostics.html
```

点击：

```text
测试 AI 诊断
```

如果显示：

```text
来源：workers-ai
```

说明 AI 绑定成功。

如果显示：

```text
来源：rules-only
```

说明页面能跑，但还没有检测到 Workers AI 绑定。通常是绑定名不是 `AI`，或者保存后没有重新部署。

## 6. 主页面使用

打开：

```text
/ln-rank/index.html?v=3920
```

输入分数，查询专业结果后，每张专业卡片会出现：

```text
现实诊断
```

点击后会展开：

```text
一句话判断
主要依据
现实提醒
需要核验
```

## 7. 注意

本功能只做解释诊断，不做录取概率，不说“稳了/必上/包录取”。  
它不会改变原始专业池排序，也不会改变上探、主体、稳妥状态。
