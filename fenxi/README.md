# 辽宁物理类高考志愿初选工具 V2.9.2｜多终端体验重构版

## 本版核心
在 V2.8 分块数据引擎基础上，整合 major_taxonomy_v1.1：

- 原始招生专业名 → 标准专业/专业类
- 本科口径：学科门类 / 专业类 / 标准专业
- 一级学科参考：代码 / 名称 / 置信度
- 学科群筛选
- 一级学科关键词筛选
- 学科可信度筛选
- 卡片中展示“学科归属”和“一级学科参考”
- 详情中展示专业清洗说明和风险提醒

## taxonomy 构建统计
- 投档记录：13145
- 原始专业名：3003
- 清洗后标准专业/专业类：850
- 已匹配本科目录参考：292
- 已映射一级学科参考：292
- 仍需人工确认：558

## 部署结构
你的目录/
├── index.html
├── assets/
│   ├── app.v292.css
│   └── app.v292.js
└── data/
    ├── manifest.json
    ├── rank_2025_physics.json
    ├── school_nature.json
    ├── chunks/
    ├── taxonomy/
    └── taxonomy_runtime/

## 注意
这次必须上传 index.html、assets/、data/taxonomy_runtime/。
如果线上已有 V2.8 的 data/chunks，可以保留，但建议完整覆盖 data/。
访问码：ln2025


V2.9.2新增：移动端防横向溢出、顶部瘦身、结果过多收窄提示、A/B/C移动端横滑、导出弹层、?debug=1自检面板。
