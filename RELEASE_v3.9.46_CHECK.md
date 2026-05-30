# RELEASE v3.9.46 检查项

## 文件入口
- /ln-rank/index.html 引用 app.v3946.js 与 selection-pool.v3946.css。
- /ln-rank/selection-pool.html 引用 selection-pool.v3946.js 与 selection-pool.v3946.css。
- VERSION.txt 已更新为 V3.946。

## 关键验证
- 自选池从 v3.9.45 localStorage key 自动迁移到 v3.9.46 key。
- 拖拽、上移、下移、置顶、上移 5 位、移到第 N 位、下移 5 位、置底、按冲稳保整理后，userOrder 都会重新编号。
- 检查当前排序后，如继续调整排序或修改分数，旧诊断不会继续被当作新诊断发送。
- 发送当前排序到飞书读取当前 getPoolItems() 顺序。
- 发送诊断报告到飞书会先保证诊断与当前排序一致。
- 飞书报告 builder 版本为 v3.9.46，并写入口径说明：按整理页当前最终顺序写入。
