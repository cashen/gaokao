# v3.9.7.2-ln-rank-keyword-preset-visual-note

本版只修“更多方向”关键词区域的视觉备注，不改搜索后端逻辑、不改公办底线、不动 `/fenxi`。

## 目标

- 保持前端短路径：默认常用词 + 一个“更多方向”面板。
- 用低饱和、轻提示的颜色区分方向类别。
- 对“中外 / 高收费 / 公费师范 / 定向”等项目属性词做轻备注，避免家长误以为它们是标准专业名。
- 不做彩色标签墙，不做多级专业目录树。

## 主要变化

1. 默认常用词保持统一浅绿色风格，首页不跳色。
2. 更多方向展开后按分组轻微上色：
   - 工科技术：淡蓝绿
   - 医学健康：淡绿
   - 财经文法：淡米橙
   - 行业项目：淡灰蓝
3. 项目属性词使用浅杏色，并附小角标“项目”。
4. 展开区底部新增说明：
   “中外 / 高收费 / 公费师范 / 定向”属于项目或招生属性，不是标准专业名，系统会按备注、收费和招生类型一起搜索。

## 新增 / 升级文件

- `ln-rank/js/feature/major-pool/keyword-preset-policy.v3972.js`
- `ln-rank/js/feature/major-pool/keyword-chip-render.v3972.js`
- `ln-rank/css/keyword-preset.v3972.css`
- `ln-rank/js/app.v3972.js`
- `ln-rank/js/selection-pool.v3972.js`
- `ln-rank/js/shared/release-meta.v3972.js`

## 不变

- 不改 `/api/major-bands` 搜索逻辑。
- 不改关键词原词保留规则。
- 不改 AI 诊断。
- 不改自选池入口规则。
- 不包含 `/fenxi/`、`functions/fenxi/`、`functions/_middleware.js`。
