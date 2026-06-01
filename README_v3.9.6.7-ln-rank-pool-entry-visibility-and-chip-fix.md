# v3.9.6.7-ln-rank-pool-entry-visibility-and-chip-fix

本版只做搜索页自选池入口和常用词修复：

- 修复自选池浮动入口在 PC/手机端变白、文字不可见的问题。
- 自选池入口使用独立 `.pool-entry-direct` 样式，避免被旧 `selection-pool` CSS 覆盖。
- 加入自选池后同时触发 `lnrank:pool-updated` 与旧事件，确保数量立即刷新。
- 常用词移除“土木”，改为“机械”。
- 搜索逻辑、关键词后端、公办底线、AI 诊断、飞书报告均不改变。
- 不包含 /fenxi、functions/fenxi、functions/_middleware.js。
