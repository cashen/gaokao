# v3.9.11-ln-rank-human-readable-ui-state-safe-full-with-fenxi-session

本版基于 v3.9.10rc，保持功能不变，重点修正：

1. 未输入专业/项目关键词时，搜索控制台右侧不再展开热度说明，避免狭窄竖排和空状态噪声。
2. 输入专业方向后才显示专业热度摘要。
3. PC/Pad 自选专业入口移到右下安全区，不遮挡搜索控制台；Android 保持底部整理条。
4. 页面、热度页、自测页、release-meta 统一为 v3.9.11 / v3911。
5. 保留 functions/_lib/fenxi-session.js，用于兼容当前仓库中仍存在的 fenxi 鉴权/中间件依赖，避免 Cloudflare Pages Functions 构建失败。

部署建议：完整覆盖 ln-rank/ 与 functions/_lib/fenxi-session.js；不要删除线上原有 functions/_middleware.js 与 functions/fenxi/，除非你明确改为 ln-rank 专用部署分支。
