辽宁物理类高考志愿初选工具 V2.3｜规则解释透明版

上传到 GitHub / Cloudflare Pages 时，只需要：
- index.html
- data/records_compare_full_ranked.json
- data/rank_2025_physics.json

仓库根目录应为：
你的仓库/
├── index.html
└── data/
    ├── records_compare_full_ranked.json
    └── rank_2025_physics.json

Cloudflare Pages：
Build command 留空
Build output directory 留空或填 /
访问码：ln2025

本地测试：
python -m http.server 8000
然后打开 http://127.0.0.1:8000