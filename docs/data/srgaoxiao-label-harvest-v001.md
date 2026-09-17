# 神人高校网高校标签采集 v001

## 本阶段目标

先做源站数据盘点，不进入 Tongxue 生产数据层：

`神人高校网 → 标签全集 → 标签对应学校 → 标签对应专业 → 原始快照 → 本地审计`

本阶段禁止根据常识补齐关系，也禁止把社会称谓直接写入 `school-profile-center.js`、`school-display-tags.js` 或 Tongxue runtime。

## 采集范围

- `https://eo.srgaoxiao.com/schools`
- `https://eo.srgaoxiao.com/specialties`

采集器首先发现源站实际展示的标签控件，然后逐标签筛选并抓取对应学校/专业链接；同时保存初始 HTML/正文以及 XHR/fetch URL 清单，便于后续反查源站真实数据接口。

## 本地输出

默认输出：

```text
tmp/srgaoxiao-label-harvest-v001.json
tmp/raw/schools-initial.json
tmp/raw/schools-network.json
tmp/raw/specialties-initial.json
tmp/raw/specialties-network.json
```

这些文件是 staging 数据，不属于生产资源。

## 数据边界

每个标签目前只记录：

- 标签原文
- 源站筛选后 URL
- 标签对应学校链接
- 标签对应专业链接
- 采集页数
- 原始 source URL

不在 v001 做：

- 社会标签语义的官方化解释
- canonical school/major 关系写入
- UI 展示
- 自动猜测遗漏关系
- 直接覆盖既有 985/211/双一流学校资料

## 下一阶段入口

得到完整 staging 数据后，再做：

1. 标签全集去重与分类；
2. school entity 全量匹配率；
3. major code/name 全量匹配率；
4. 一对多、多对多、歧义和未匹配清单；
5. 决定哪些关系进入 shared resources；
6. 再讨论 Tongxue 展示层。
