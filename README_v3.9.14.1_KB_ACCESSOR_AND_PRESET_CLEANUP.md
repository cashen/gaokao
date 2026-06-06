# v3.9.14.1 ln-rank KB accessor and search preset cleanup

本版基于 v3.9.14，不改搜索排序、不改历史录取数据、不动 /fenxi 静态目录。

## 修复

1. 修复单卡 AI 诊断在动物医学、食品、药学、园艺等体检敏感专业触发时读取旧 KB 字段导致的 `Cannot read properties of undefined (reading 'aiCopy')`。
2. `knowledge-context-builder` 改为通过 `career-path-accessor` 与 `getPhysicalExamReviewHints` 安全读取 KB，不再直接读体检 KB 深层旧字段。
3. 搜索快捷入口与更多方向中移除“定向”“公费师范”。
4. 内部项目属性识别仍保留“定向”“公费师范”，历史条目自身包含这些字样时仍会进入招生章程/履约复核点。
5. self-check 增加 KB accessor 与前端预置词清理检查。

## 保留

- 保留 `functions/_lib/fenxi-session.js`，兼容当前 Cloudflare 项目中的 /fenxi 鉴权链路。
- 不包含 `/fenxi/`、`functions/fenxi/`、`functions/_middleware.js`。
