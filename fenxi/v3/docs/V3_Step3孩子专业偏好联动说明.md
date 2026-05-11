# V3.0.0.alpha4｜Step3孩子专业偏好与底线结果联动版

## 目标

在不触发旧 compute 主链路的前提下，让 Step3「孩子专业偏好」不再只是静态卡片，而是能基于 Step1 已加载分块数据与 Step2 家庭底线预览，给出兴趣命中数量和样例。

## 本版新增

- 新增 `adapters/child-interest-adapter.v3.js`
- Step3 选择大类/具体专业后，生成 `childPreference.preview`
- 显示当前底线池、兴趣命中数、后续有效池
- 默认模式：兴趣只影响提示和后续 B 方案权重，不硬排除
- manualOnly 模式：预览显示会收窄到真实命中兴趣方向
- debug Step3 自测增加兴趣预览、manualOnly 收窄、自测回滚检查

## 不做的事

- 不接入正式 A/B/C 方案
- 不调用旧 `compute-pipeline.v2983.js`
- 不替换旧 `/fenxi/index.html`
- 不改变 fix12 的正式地域 hard 与 manualOnly 快速预筛

## 关键状态

```js
childPreference.preview = {
  reason: 'v3-child-interest-preview-only',
  basePool: 7934,
  familyFilteredRows: 1597,
  matchedRows: 115,
  effectiveFilteredRows: 1597, // 默认模式
  manualOnly: false,
  groupHits: {},
  majorHits: {},
  sampleMatched: []
}
```

开启真实命中后：

```js
effectiveFilteredRows === matchedRows
```
