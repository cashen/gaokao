# 神人高校网高校标签采集 v001

## 本阶段目标

先完成源站数据盘点并保存在本地 staging，不进入 Tongxue 生产数据层：

`神人高校网 → 标签全集 → 标签对应学校 → 专业目录 → 原始快照 → 源站关系审计`

本阶段禁止根据常识补齐关系，也禁止把社会称谓直接写入 `school-profile-center.js`、`school-display-tags.js` 或 Tongxue runtime。

## 已验证采集结果

2026-09-17 源站公开接口采集得到：

- 29 个学校标签；
- 839 条标签→学校关系；
- 1783 个专业目录实体；
- 源站当前 `/api/specialties` 为独立专业目录接口，给它追加 `tag=<学校标签>` 后仍返回统一专业目录（当前抽样接口响应 `total=1783`），因此 v001 **不把专业目录伪装成标签→专业关系**。

源站当前标签全集以 `/api/schools/filters/tags` 的实际响应为准，包括：

```text
101计划 / 211 / 985 / C9 / E9 / 七所海大 / 两电一邮 / 两财一贸 / 中坚九校 /
五院四系 / 八大美院 / 兵工七子 / 军地四医 / 军工六校 / 医药双雄 / 华东五虎 /
南北双药 / 双一流 / 双高 / 国防七子 / 师大六姐妹 / 建筑新八校 / 建筑老八校 /
强基 / 机械五虎 / 机械四小龙 / 电力部老六校 / 电气二龙 / 电气四虎
```

注意：截图中出现的“电力部老八校”并非当前源站标签接口的实际名称；当前接口返回的是 `电力部老六校`，后续以源站实际数据为准，不凭常识纠正源站。

## 采集范围

- `https://eo.srgaoxiao.com/schools`
- `https://eo.srgaoxiao.com/specialties`

主要源接口：

- `/api/schools/filters/tags`
- `/api/schools?tag=<label>&page=<n>&pageSize=<n>`
- `/api/specialties?sort=popularity&page=<n>&pageSize=<n>`
- `/api/specialties/categories`

学校接口已经验证会随 `tag` 返回不同学校集合；当前专业接口没有验证到对应学校标签的直接过滤关系，因此保持 fail-closed。

## 本地输出

CI artifact 默认包含：

```text
tmp/srgaoxiao-label-harvest-v001.json
tmp/srgaoxiao-label-source-probe-v001.json
tmp/raw/schools-initial.json
tmp/raw/schools-network.json
tmp/raw/specialties-initial.json
tmp/raw/specialties-first-page.json
tmp/raw/specialties-network.json
tmp/raw/schools-script-api-scan.json
tmp/raw/specialties-script-api-scan.json
```

这些文件是 staging 数据，不属于生产资源。

## 数据边界

标签关系 staging 记录：

- 标签原文；
- 标签对应的源站学校 id / 名称；
- 源站分页信息；
- 专业目录实体（独立目录）；
- 源站接口请求与探针结果。

不在 v001 做：

- 社会标签语义的官方化解释；
- canonical school/major 关系写入；
- UI 展示；
- 从“标签名称”推断专业关系；
- 从学校名称常识推断专业关系；
- 直接覆盖既有 985/211/双一流学校资料。

## 下一阶段入口

1. 标签全集去重与分类；
2. 标签→school entity 全量匹配率；
3. 标签→major 真实来源接口继续追踪；
4. school/major 一对多、多对多、歧义和未匹配清单；
5. 决定哪些关系进入 shared resources；
6. 再讨论 Tongxue 展示层。
