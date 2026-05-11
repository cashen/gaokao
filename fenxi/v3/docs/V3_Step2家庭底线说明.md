# V3 Step2 家庭底线说明

版本：V3.0.0.alpha3｜Step2家庭底线与辽宁Hard预览版  
版本戳：v300alpha3-20260512

## 定位

Step2 位于位次输入之后、孩子专业偏好之前。目标不是替家长直接定方案，而是先把家庭明显不能接受的条件排除掉。

## 本版范围

本版只做 v3 家庭底线状态与预览：

- 地域模式：全国都可 / 优先考虑 / 只看指定地区
- 省份输入与快捷项：只看辽宁、优先东北、全国都可
- 预算：普通家庭 / 预算可弹性 / 预算严格
- 学费：先都看 / 排除高收费
- 不能接受项：高收费、民办独立或性质待核验
- 在 Step1 loadedRows 上做底线预览
- 记录 basePool / filteredPreview / removed.region / removed.highFee
- 辽宁 hard 预览中检查 unmatchedKept=0

## 不做的事

- 不触发旧 compute 主链路
- 不生成正式 A/B/C 方案
- 不改旧 /fenxi/index.html
- 不改 fix12 compute-pipeline、地域 hard 正式逻辑、manualOnly 快速预筛

## Debug

新增 `/fenxi/v3/debug.html` 中的“Step2 底线自测”。重点检查：

- family-filter-adapter 是否存在
- family 状态字段是否完整
- 是否可读取 Step1 已加载记录
- 辽宁 hard 预览是否可运行
- 辽宁 hard targetExists 是否为 true
- 辽宁 hard unmatchedKept 是否为 0
- 高收费排除预览是否可运行
- family 写入 store 是否成功
- compute.basePool / compute.filtered 是否记录底线预览
- 自测后状态是否回滚干净
