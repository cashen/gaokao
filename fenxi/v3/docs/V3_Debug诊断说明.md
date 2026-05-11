# V3 Debug 诊断说明

入口：`/fenxi/v3/debug.html`

Debug 页面同样需要输入访问码 `ln2026`。

## 当前诊断项

- 版本号
- 版本戳
- body class
- 访问码状态
- Tab 数量
- 向导步骤数量
- Store 快照
- Step3 孩子专业偏好结构化写入
- selectedGroups / selectedMajors / weights / summary

## 自测按钮

- 快速体检
- Step3 专业偏好自测
- 完整骨架自测
- 复制报告

## 判断口径

alpha1 的重点不是业务计算耗时，而是 v3 壳是否启动、状态是否写入、Step3 是否能形成结构化偏好数据。


## alpha1.fix2 路由兼容

本版同时保留 `/fenxi/v3/debug.html`、`/fenxi/v3/debug.htm` 与 `/fenxi/v3/debug/`，避免线上输入 `/fenxi/v3/debug` 时出现空白。
