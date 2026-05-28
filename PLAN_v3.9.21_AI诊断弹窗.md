# v3.9.21 AI诊断弹窗版

## 目标

v3.9.20 的诊断结果直接展开在专业卡片内部，会把卡片拉得很长。  
v3.9.21 改为弹窗诊断：

```text
点击“现实诊断”
→ 弹出诊断卡片
→ 可点击右上角 × 关闭
→ 可点击遮罩关闭
→ 可按 Esc 关闭
```

## 改动

新增：

```text
ln-rank/js/feature/diagnose/diagnose-render.v3921.js
ln-rank/js/feature/diagnose/diagnose-controller.v3921.js
ln-rank/js/feature/major-pool/major-pool-render.v3921.js
ln-rank/js/app.v3921.js
```

修改：

```text
ln-rank/css/diagnose.css
ln-rank/index.html
```

## 保留

```text
/api/card-diagnose
Cloudflare Workers AI
规则版 fallback
AI skill prompt
```

## 验收

1. 查询专业结果；
2. 点击某张卡片的“现实诊断”；
3. 页面出现弹窗；
4. 原卡片高度不再被诊断内容拉长；
5. 点击 × / 遮罩 / Esc 可以关闭。
