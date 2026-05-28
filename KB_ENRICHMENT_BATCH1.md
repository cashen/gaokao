# v3.9.29 知识库增强 Batch 1

## 本版新增什么

在 v3.9.28 的知识库基座上，继续增强：

```text
A1：985 / 211 / 双一流硬标签结构化
A2：医学强校线索结构化
A3：行业特色线索结构化
辽宁省内 32 所高校第四轮学科评估 C 类及以上整理数据
学校官网简介 / 招生章程校区说明 / 就业质量报告证据槽位
```

## 第五轮学科评估处理原则

第五轮学科评估没有采用非官方全量汇总。  
除非学校官网、信息公开页或官方新闻逐条披露，否则本知识库不把“第五轮结果”作为可引用证据。

当前可稳定引用：

```text
第四轮学科评估公开结果
第二轮双一流建设高校及建设学科
985 / 211 历史标签名单
辽宁最低分底稿专业池事实
```

## sourceSlots 证据槽

每所学校都有这些字段：

```text
officialProfileSummary
profileSourceTitle
profileSourceUrl
profileSourceYear
needOfficialProfile

admissionCampusSummary
admissionSourceTitle
admissionSourceUrl
admissionYear
needAdmissionCampus

employmentSummary
employmentSourceTitle
employmentSourceUrl
employmentYear
needEmployment
```

如果没有官方来源，字段保持空，不让 AI 自行编造。

## 自检页面

```text
/ln-rank/kb-layer-diagnostics.html
```

可看：

```text
A1硬标签
A2医学线索
A3行业特色
第四轮学科评估
官网/章程/就业报告证据槽
```
