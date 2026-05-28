# 标准 Record 字段契约

## 目的

所有页面、飞书、AI、导出功能都必须围绕同一套 record 字段，不允许各模块自行猜字段。

---

## 必填字段

```js
{
  id: "string",
  school: "string",
  major: "string",
  score2025: 0,
  rank2025: 0,
  score: 0,
  rank: 0
}
```

说明：

```text
score / rank 保留为兼容字段，默认等同于 2025 主口径。
新代码优先读取 score2025 / rank2025。
```

---

## 推荐字段

```js
{
  score2024: 0,
  rank2024: 0,
  historyCompare: {},

  displayLocation: "辽宁 · 沈阳",
  geoEntity: "",
  locationWarning: "",
  locationConfidence: "high",

  schoolTags: [],
  natureLabel: "",
  flags: []
}
```

---

## AI诊断输入字段

`/api/card-diagnose` 只接受裁剪后的安全字段：

```js
{
  school,
  major,
  statusLabel,
  position,
  scoreDelta,
  score2025,
  rank2025,
  score2024,
  rank2024,
  historyCompare,
  displayLocation,
  geoEntity,
  locationWarning,
  natureLabel,
  schoolTags
}
```

禁止把整条原始 /fenxi record 原样传给 AI。

---

## 字段新增规则

新增字段必须满足：

```text
1. 先在 fenxi-normalizer 或专门 engine 中生成
2. 再在 RECORD_CONTRACT.md 中记录
3. 前端只消费，不重复计算
4. 飞书和 AI 如需使用，也读取同一字段
```

---

## 字段废弃规则

废弃字段时不要立即删除，先：

```text
1. 保留兼容 1-2 个小版本
2. README / ARCHITECTURE 记录替代字段
3. module-health 通过后再删除
```
