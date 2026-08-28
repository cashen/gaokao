# pendingdel 退役观察区

版本：V2.91RC0.package-slim1｜历史残留文件 pendingdel 退役版

基线：V2.91RC0.coordinator1

本目录用于存放“判断为可从正式运行路径剔除、但暂不永久删除”的历史残留文件。

本次只移动：

- 不在 `fenxi/index.html` 当前主线加载；
- 不在 rules/ui 回退队列；
- 不在 `fenxi/debug.html` / `fenxi/diagnostics.html` 引用；
- 不影响 `LN_RULES_BUNDLE_OPT=false`、`LN_UI_BUNDLE_OPT=false` 回退能力。

统计：

- JS：62 个
- CSS：5 个
- 合计：67 个文件

如发现异常，可按 `fenxi/pendingdel/pendingdel-manifest.json` 的 `from` / `to` 路径还原。
