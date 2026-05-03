# 辽宁物理类志愿初选助手：最后版前端

这版按“家长最终使用”重构：

1. 第一屏只做输入位次，减少说明文字。
2. 输入后先显示可冲、匹配、稳妥、保底区间。
3. 列表改成移动端友好的卡片。
4. 每张卡片增加“高报师判断”。
5. 学费核验、风险标签、候选清单、导出清单全部保留。
6. 前端访问码保留为 `ln2025`，用于开启位次初筛。

## 部署到 Cloudflare Pages

把 `index.html` 放到你的 GitHub 项目对应页面目录里即可。

如果你原来的数据是 JSON，推荐在同目录放一个：

- `records.json`

页面会自动尝试读取以下文件：

- `records.json`
- `data.json`
- `liaoning_records.json`
- `ln2025.json`

如果你原来的数据是 JS 变量，也可以在 `index.html` 前面注入：

```html
<script>
window.LN_RECORDS = [
  {"school":"沈阳工业大学","discipline":"电气工程","score2025":598,"rank2025":11780}
]
</script>
```

页面也兼容这些全局变量名：

- `window.LN_RECORDS`
- `window.LIAONING_DATA`
- `window.__LN_RECORDS__`
- `window.records`
- `window.DATA`
- `window.liaoningRecords`

## 字段兼容

页面会自动识别常见中英文字段，例如：

- 学校：`school`、`学校`、`院校名称`
- 学科：`discipline`、`一级学科`、`学科名称`
- 专业：`majors`、`专业`、`匹配专业`
- 2025分数：`score2025`、`2025最低分`
- 2025位次：`rank2025`、`2025位次`
- 学费状态：`feeStatus`、`学费核验`
- 标签：`tags`、`提示标签`

## 注意

当前文件内置了 6 条样例数据。部署后，如果同目录存在真实 `records.json`，会优先读取真实数据。

## 访问码

前端访问码：`ln2025`。这只适合做轻量隐藏，不等同于安全认证；正式限制访问仍建议使用 Cloudflare Access。
