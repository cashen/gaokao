# 模拟志愿填报单页开发进度

当前主线：`refactor/simulation-choice-contract-r157`
当前 main 基线：`b50e901e4a5b58bd9403cb7c6461e60f4453f646`
当前产品版本：`simulation-workspace-v016.67`
当前产品修订：`r157-simulation-choice-contract`
页面版本：`v1.3`
运行时 owner：`/ln-rank/js/simulation-runtime.js`
SimulationChoice owner：`/shared/resources/simulation/simulation-choice-contract.v001.js`

## r157 状态

- [x] 统一 `SimulationChoice` 数据模型。
- [x] `confirmedSchool` 与 school 显式确认状态保留在同一契约中。
- [x] `majorRecordId` 作为首要招生记录身份；`schoolCode2026 + majorCode2026` 仅作仓库无 record id 时的显式 fallback。
- [x] `majorQuery`、`major`、`majorCode2026`、`standardMajor*` 分层。
- [x] 三年历史跟随具体招生记录；年度 missing 与请求 error 分层。
- [x] URL/deep-link 统一带 `majorRecordId`；恢复时精确验证学校、专业和招生代码，不做模糊降级。
- [x] PDF service 直接消费 `SimulationChoice`，显示招生项目与 record id，不重新匹配。
- [x] 专业候选只来自当前确认学校的真实招生记录，并按完全匹配/前缀/包含排序。
- [x] familyNote/source/createdAt/updatedAt 与记录一起保存。
- [x] 390 / 768 / 1280 browser regression 纳入单一正式入口。
- [x] legacy r149/r152/r156 browser scripts 不再是正式 workflow 入口。
- [x] release contract、页面缓存串、runtime、PDF revision 升级到 r157。
- [ ] GitHub PR CI 通过。
- [ ] Preview exact head SHA 回归通过。
- [ ] PR final exact head SHA 二轮核验通过。
- [ ] merge main 后 SHA 核验通过。
- [ ] Cloudflare Production 部署与 resource/API baseline 核验通过。

## 已知外部发布风险

r156 main 的 production/resource-graph workflow 曾出现步骤本身 `ok:true`、但 artifact 上传因 GitHub Actions artifact storage quota 达到上限而失败的情况。本轮必须重新核验，不能把这个环境性失败误判为 simulation 代码失败，也不能在未重新验证前宣称生产通过。

Alook 当前无实机执行证据，必须保留“尚缺 Alook 实机回归”。
