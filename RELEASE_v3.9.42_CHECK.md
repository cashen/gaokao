# V3.942 发布检查

## 静态文件

- [x] `/ln-rank/index.html` 引用 `app.v3942.js` 与 `selection-pool.v3942.css`。
- [x] `/ln-rank/selection-pool.html` 引用 `selection-pool.v3942.js` 与 `selection-pool.v3942.css`。
- [x] `/ln-rank/VERSION.txt` 显示 V3.942。

## 自选池工作台

- [x] 左侧列表为紧凑排序行，不再使用大卡片。
- [x] 左侧按钮为“发送当前排序到飞书”和“清空”。
- [x] 右侧按钮为“检查当前排序”和“发送诊断报告到飞书”。
- [x] 空状态文案说明冲稳保、稳妥承接和保底是否够用。

## 飞书接口

- [x] `/api/feishu-create-selection-pool-report` 保持可用。
- [x] `selectionPoolOnly` 生成当前排序清单。
- [x] `selectionPoolWithAnalysis` 生成诊断报告。
- [x] 报告 builder 版本更新为 v3.9.42。

## 上线后重点测试

1. `/ln-rank/VERSION.txt`
2. `/ln-rank/`
3. `/ln-rank/selection-pool.html`
4. `/api/path-analysis`
5. `/api/feishu-create-selection-pool-report`

## 口径

`/ln-rank` 使用 `/fenxi` 已接入的辽宁 2025 物理类专业数据；本工具用于专业池讨论、自选池排序和排序诊断，不等同于录取预测。
