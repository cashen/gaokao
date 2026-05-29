# V3.941 发布检查

## 已完成

- [x] 首页引用 `app.v3941.js` 和 `selection-pool.v3941.css`。
- [x] 首页版本号显示 V3.941。
- [x] 首页顶部不再显示“自选池排序”链接。
- [x] 自选池入口改为右侧小胶囊。
- [x] 自选池默认不展开。
- [x] 加入专业后不自动展开抽屉，只更新数量与轻提示。
- [x] 移动端使用右下角入口与底部抽屉。
- [x] 完整排序页移除“复制报告”和“下载 JSON”主流程。
- [x] 新增“发送自选池到飞书”和“分析后发送飞书”。
- [x] 新增 `/api/feishu-create-selection-pool-report`。
- [x] 新增自选池飞书报告 builder。

## 部署后重点验证

1. `/ln-rank/VERSION.txt` 应显示 V3.941。
2. `/ln-rank/` 首页右侧应只显示小胶囊，不应默认打开抽屉。
3. 加入第一条专业后，右侧数字应从 0 变 1，抽屉不应自动弹出。
4. 点击右侧自选池入口后，PC 应从右侧滑出；手机应从底部弹出。
5. `/ln-rank/selection-pool.html` 可从抽屉“整理排序”进入。
6. `/api/path-analysis` POST 应返回 JSON。
7. `/api/feishu-create-selection-pool-report` 需要 Cloudflare Secrets 和飞书权限，成功后返回 URL。

## 口径

`/ln-rank` 使用 `/fenxi` 已接入的辽宁 2025 物理类专业数据；本工具用于专业池讨论、自选池排序和路径分析，不等同于录取预测。
