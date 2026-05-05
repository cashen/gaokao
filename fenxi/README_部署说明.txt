辽宁物理类高考志愿初选工具 V2.8｜分块数据引擎版

上传结构：
你的目录/
├── index.html
├── assets/
│   ├── app.v28.css
│   └── app.v28.js
└── data/
    ├── manifest.json
    ├── rank_2025_physics.json
    ├── school_nature.json
    └── chunks/
        ├── rank_00000_10000.json
        ├── rank_10000_20000.json
        ├── rank_20000_30000.json
        ├── rank_30000_50000.json
        ├── rank_50000_80000.json
        └── rank_80000_plus.json

这次必须上传 assets/ 和 data/chunks/。
旧的 records_compare_full_ranked.json 可以保留，也可以不上传；V2.8 不依赖它。

建议访问：你的目录/?v=28
访问码：ln2025

【v2.8.1 更新：导出结果摘要图】
1. 已在“详细候选 - 高级筛选”按钮区新增“导出摘要图”。
2. 导出图为 PNG，包含考生条件、筛选逻辑、结果总览、前 8 条优先结果、下一步核验提醒。
3. 原 CSV 导出保留，文件名已更新为 V28。
4. 新增文件：assets/export-summary.css、assets/export-summary.js。
5. 导出图片依赖浏览器端 html2canvas，组件会自动从 CDN 加载；微信内置浏览器会以预览方式提示长按保存。
