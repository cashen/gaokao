# V3.0.0.alpha4.fix2｜Debug空数据自测降级与输入提示修正版

版本戳：v300alpha4fix2-20260512

## 修复目标

alpha4.fix1 在用户仅打开 debug 并点击“完整骨架自测”、尚未执行 Step1/Step2 的情况下，Step3 的 manualOnly 真实命中检查会被判为 FAIL。

这不是业务错误，而是测试前置条件不足：没有 Step1 位次数据，也没有 Step2 家庭底线池，Step3 不应强测真实命中收窄。

## 修复内容

1. Step3 debug 自测在 records=0 时，将 manualOnly 真实命中检查降级为等待提示，不再记为 FAIL。
2. 保留有 records 时的强校验：manualOnly=true 后，effectiveFilteredRows 应等于 matchedRows。
3. 完整骨架自测可以在“未跑主流程”的空状态下通过，用于检查壳、入口、Tab、Store、模块是否存在。
4. 完整业务链路仍需按 Step1 → Step2 → Step3 跑完后，再用 debug 查看数据水合和兴趣命中。

## 不变内容

- 不改旧 /fenxi/index.html。
- 不触发旧 compute 主链路。
- 不改 Step2 辽宁 hard 预览逻辑。
- 不改 Step3 兴趣命中 adapter 的业务预览逻辑。
