# V3 Step1 位次输入与数据加载说明

版本：V3.0.0.alpha2｜Step1位次输入与数据加载状态版  
版本戳：v300alpha2-20260512

## 本版目标

在 alpha1.fix3 稳定骨架基础上，只开发第 1 步“位次输入”。

本版已经接入：

- `/fenxi/data/manifest.json`
- `/fenxi/data/rank_2025_physics.json`
- `/fenxi/data/chunks/*.json`

用于确认 v3 能按位次或分数读取相关分块数据，并把加载状态写入 `LN_V3_STORE.rank`。

## 本版不做什么

- 不接入 Step2 家庭底线筛选
- 不接入 compute-pipeline 主计算链路
- 不渲染正式 A/B/C 结果
- 不替换旧版 `/fenxi/index.html`

## Step1 状态字段

`LN_V3_STORE.rank` 新增或使用：

- `rank`
- `score`
- `mode`
- `loadedRows`
- `chunkIds`
- `chunkCount`
- `loadMs`
- `loadedAt`
- `rankSource`
- `sample`

`LN_V3_STORE.compute.waitDataMs` 记录本次分块等待/加载耗时。

## Debug

`/fenxi/v3/debug.html` 增加：

- Step1 位次加载自测
- adapter 存在性检查
- rank 状态字段检查
- 分块数据读取检查
- loadedRows / chunkIds / sample 检查
- 自测状态回滚检查

