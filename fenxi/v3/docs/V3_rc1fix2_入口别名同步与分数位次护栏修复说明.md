# V3.0.0.rc1.fix3｜资格型计划默认过滤与入口同步版

本版只修入口同步问题：`/fenxi/v3/debug`、`/fenxi/v3/debug.htm`、`/fenxi/v3/index.htm` 可能命中旧 HTML，导致线上仍显示旧版本戳。

## 修复

- `debug.html`、`debug.htm`、`debug/index.html` 全部统一到 `v300rc1fix3-20260512`。
- `index.html`、`index.htm` 全部统一到 `v300rc1fix3-20260512`。
- 保留 rc1.fix1 的分数/位次一致性护栏。

## 不变

- 不改 Step4 家庭路径权重。
- 不改 A/B/C 方案包。
- 不改详细候选生成规则。
- 不启用旧 compute 替换。
- 不覆盖旧 `/fenxi/index.html`。
