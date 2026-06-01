# v3.9.5.9-ln-rank-trust-baseline

本包用于 ln-rank 可信闭环：

- 不包含 /fenxi 静态目录
- 不包含 functions/fenxi
- 不包含 functions/_middleware.js
- 自选池按当前成绩统一重算
- 后端 path-analysis 重新计算 scoreDelta/rankGap，不信任前端旧字段
- 新增方案体检灯 healthLights
- 新增报告快照 reportSnapshot
- AI 输出继续限定为人话 narrative，不展示 JSON

验收重点：输入 550，专业最低分 578，应显示 +28；改成 560 应显示 +18；飞书报告必须写清计算口径与生成时间。
