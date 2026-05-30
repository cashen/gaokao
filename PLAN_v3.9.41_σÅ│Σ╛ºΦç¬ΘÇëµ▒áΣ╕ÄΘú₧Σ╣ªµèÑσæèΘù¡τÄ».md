# V3.941 右侧自选池与飞书报告闭环

## 版本目标

把 V3.940 的“左侧默认工具抽屉”修正为符合家长使用习惯的“右侧轻入口志愿池”，并把报告动作从复制文本升级为一键生成飞书文档、默认共享并返回地址。

## 用户路径

1. 用户进入 `/ln-rank/`。
2. 页面只显示右侧小胶囊 `自选池 0`，默认不展开。
3. 用户查询专业卡片。
4. 点击“加入自选池”。
5. 按钮变为“已加入自选池”，右侧数字 +1，提示“已加入自选池，可点右侧整理”。
6. 用户继续浏览，不被抽屉打断。
7. 用户主动点击右侧自选池入口。
8. 打开右侧抽屉，查看冲稳保统计、当前排序、AI路径分析和飞书报告按钮。
9. 点击“整理排序”进入完整工作台。
10. 可直接“发送自选池到飞书”，也可“分析后发送飞书”。

## 前端调整

- `ln-rank/index.html` 升级到 V3.941，删除顶部自选池排序链接。
- `app.v3941.js` 使用 V3.941 自选池控制器和专业卡片渲染器。
- `selection-pool.v3941.css` 将自选池入口改为右侧小胶囊，PC 从右侧滑出，移动端从底部弹出。
- `selection-pool-controller.v3941.js` 保证默认关闭，加入自选池不自动打开，只更新数量和轻动效。
- `selection-pool.html` 改为完整排序工作台，删除复制报告、下载 JSON 等工具感入口。

## 飞书闭环

新增：

```text
POST /api/feishu-create-selection-pool-report
```

支持两种报告：

```json
{ "reportType": "selectionPoolOnly" }
{ "reportType": "selectionPoolWithAnalysis" }
```

返回：

```json
{
  "ok": true,
  "sharePublic": true,
  "title": "...",
  "documentId": "...",
  "url": "..."
}
```

底层复用现有：

- `feishu-auth.js`
- `feishu-docx.js`
- `feishu-permission.js`
- `feishu-link.js`

## 口径

数据来自 `/fenxi` 已接入的辽宁 2025 物理类专业池。`/ln-rank` 负责查询、筛选、自选池、排序、路径分析和报告生成。
