# UI 工程师接入 Checklist｜v3.9.36

## 开工前必须读取

1. `docs/product-intent-map.md`
2. `docs/release-review-roles.md`
3. `docs/ui-state-contract.md`
4. `docs/bug-rule-registry.md`
5. `docs/code-maintainability-contract.md`
6. `docs/release-regression-matrix.md`

## 交付必须包含

- UI 改动说明
- 产品意图保真检查
- 功能入口快照
- 语义字段快照
- 核验项快照
- CSS selector 影响范围
- 移动端状态矩阵
- 12 角色 checklist
- 功能回归矩阵
- 版本合同同步报告

## 一票否决

- 删除或隐藏到不可发现的主流程入口
- 删除核验清单或数据边界
- 使用大范围选择器误伤 chip/card/button
- 页面可见版本与 release-meta/version-contract 不一致
- 低分/高分/长文本状态导致横向溢出或竖排
- 家长正文出现工程状态或录取承诺
