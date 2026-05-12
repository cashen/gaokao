# V3.0.0.beta6｜旧版正式计算链路接入预备版

## 版本定位

beta6 不是正式切换旧 compute 的版本，而是正式接入前的预备版。

本版目标是把以下能力先接好：

- 统一读取 V3 的位次、家庭底线、孩子兴趣、家庭路径、方案包和详细卡片上下文；
- 探测旧版正式 compute 入口是否已经存在；
- 生成双轨对比报告结构；
- 在 debug 一键总检里检查旧 compute 预备链路；
- 明确保护 V3 当前主链路，不自动替换候选结果。

## 安全原则

本版不做以下事情：

- 不主动调用旧版 `applyFilters()`；
- 不替换 Step5 / Step6 当前候选结果；
- 不改变 Step4 家庭路径权重；
- 不改变 A/B/C 方案包逻辑；
- 不改变详细卡片生成逻辑；
- 不覆盖旧 `/fenxi/index.html`。

## 新增文件

```text
fenxi/v3/assets/js/adapters/legacy-compute-adapter.v3.js
```

主要暴露：

```text
LN_V3_LEGACY_COMPUTE.getBridgeStatus()
LN_V3_LEGACY_COMPUTE.buildInputSnapshot()
LN_V3_LEGACY_COMPUTE.compare()
LN_V3_LEGACY_COMPUTE.staticPlan()
```

## Debug 新增检查

一键总检新增：

- 旧版正式计算预备适配器存在；
- 旧版计算接入预备策略存在；
- 旧版计算桥接默认不替换 V3 主链路；
- 旧版正式计算链路预备对比已生成；
- 旧版计算预备不替换当前 V3 候选结果。

## 下一步

beta6 通过后，下一步才考虑正式 compute 接入方案：

- 旧正式结果数量；
- V3 当前结果数量；
- 差异数量；
- 差异样本；
- 差异原因分类：地域、兴趣、费用、学校性质、分数段窗口等。
