# 模块地图

## functions/api

```text
major-bands.js              专业池主接口
card-diagnose.js            AI单卡诊断
feishu-create-report.js     飞书报告生成
school-geo-audit.js         学校地域自检
```

## functions/_lib

```text
fenxi-manifest.js           读取 /fenxi manifest/chunks
fenxi-normalizer.js         原始字段归一化
band-engine.js              分数区间计算
history-score-engine.js     2024/2025历史成绩
location-normalizer.js      地域归一化
school-geo-normalizer.js    学校/校区实体匹配
school-display-tags.js      学校标签整理
feishu-report-builder.js    飞书报告内容生成
feishu-docx.js              飞书 docx 写入
ai-card-rules.js            AI诊断规则层
ai-card-prompt.js           AI提示词构建
ai-card-output-schema.js    AI输出清洗
```

## ln-rank/js

```text
app.vXXXX.js                              主入口
feature/major-pool/*                      专业池渲染
feature/score-bands/*                     区间 tab 渲染
feature/feishu/*                          飞书按钮和报告状态
feature/diagnose/*                        AI诊断弹窗
```

## ln-rank/css

```text
tokens.css              变量
layout.css              主布局
topbar.css              顶部输入区
tabs.css                区间 tab
filters.css             筛选区
major-list.css          专业卡片
tags.css                标签
feishu.css              飞书报告
diagnose.css            AI诊断弹窗
responsive.css          终端适配
```
