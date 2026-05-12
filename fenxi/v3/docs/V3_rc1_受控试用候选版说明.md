# V3.0.0.rc1｜受控试用候选版

本版基于 beta10，不改变家庭路径、A/B/C、详细候选、证据等级、导出报告和旧 compute 双轨对比逻辑。

## 新增

- `release-readiness-adapter.v3.js`
- Debug 一键总检增加发布候选护栏检查

## 目的

确认 V3 当前链路已经具备受控试用条件，但仍不替换旧 `/fenxi/` 主入口。

## 护栏

- 可作为 `/fenxi/v3/` 受控试用入口
- 不覆盖旧 `/fenxi/index.html`
- 旧 compute 仍保持只读/预备对比，不替换当前 V3 结果
- 若一键总检失败，不进入试用推荐
