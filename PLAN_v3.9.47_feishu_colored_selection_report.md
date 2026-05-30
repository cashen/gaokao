# v3.9.47 飞书彩色分区报告

## 目标

在不破坏 v3.9.46 自选池排序一致性和飞书接口稳定性的前提下，把 `selection-pool` 的飞书输出从普通 Markdown 清单升级为结构化 Docx blocks：章节标题加粗，冲/稳/保标签和相对分差使用克制颜色提醒。

## 完成内容

1. 保留 `/ln-rank/` 主工具结构，`/fenxi/data` 仍只是专业数据来源。
2. 保留关键接口：
   - `/api/major-bands`
   - `/api/path-analysis`
   - `/api/feishu-create-selection-pool-report`
3. 新增飞书样式与结构化报告：
   - `functions/_lib/feishu-selection-style-map.js`
   - `functions/_lib/feishu-selection-pool-styled-builder.js`
4. 扩展 `functions/_lib/feishu-block-builder.js`，支持多段富文本 runs、加粗、文字颜色、背景色。
5. 修改 `functions/_lib/feishu-docx.js` 写入顺序：
   - 优先 `styled-blocks`
   - 失败自动走 `markdown-convert`
   - 再失败走 `fallback-blocks`
6. `selection-pool` 两类飞书报告均支持彩色结构：
   - 发送当前排序到飞书
   - 发送诊断报告到飞书
7. v3.9.47 前端文件与缓存版本已切换：
   - `app.v3947.js`
   - `selection-pool.v3947.js`
   - `selection-pool-store.v3947.js`
   - `selection-pool-controller.v3947.js`
   - `selection-pool.v3947.css`
8. v3.9.47 会迁移 v3.9.46 的自选池和考生分数 localStorage。

## 飞书报告视觉原则

- 不做花哨后台风。
- 冲刺区使用红/橙提醒。
- 匹配/稳妥区使用绿提醒。
- 保底区使用蓝/灰提醒。
- 颜色只标重点标签和相对分差，不整段大面积染色。
- 报告内明确提示：颜色仅辅助阅读，不代表录取承诺。
