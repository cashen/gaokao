# v3.9.24 AI额度用完提示与规则版兜底

## 目标

Cloudflare Workers AI 免费额度达到每日 10,000 Neurons 后，不让用户看到技术报错。

## 逻辑

当 `/api/card-diagnose` 调用 Workers AI 失败，并检测到以下特征：

```text
3036
429
Account limited
daily free allocation
10,000 neurons
free allocation
```

后端返回：

```text
source = rules-only-quota
message = 今日 Cloudflare AI 免费额度已用完，已自动切换为规则版诊断。
```

前端弹窗显示：

```text
额度已用完 · 规则版
今日 Cloudflare AI 免费额度已用完，系统已自动切换为规则版诊断。
```

## 好处

- 免费额度用完后页面不崩；
- 用户仍能看到规则版诊断；
- 小白不用看英文技术错误；
- 第二天额度恢复后自动继续使用 AI。
