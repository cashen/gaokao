# 模拟志愿填报打印单开发进度

分支：feat/simulation-report-a4-print
PR：#267
当前 HEAD：cdfbe2cf2b40c6935ad0a3ebc38ab16956b8133e
基线 main：bf20ddcaf51d343def945f6844e5111e92f41ff9

## 当前状态

- [x] 创建独立开发分支
- [x] 建立断网续接进度记录
- [x] 完成最新代码结构审计
- [x] 确认复用的数据接口
- [x] 页面开发
- [x] 志愿排序交互
- [x] 专业代码自动映射
- [x] 历史数据联动
- [x] A4打印优化
- [x] 添加可重复的源代码/打印契约校验
- [x] Node 20 syntax + simulation contract gate
- [x] Cloudflare branch preview deploy successful
- [x] main tree integrity gate successful
- [x] PR 已 Ready for Review
- [ ] 全站发布/runtime/resource/production gates全部完成
- [ ] exact-head merge
- [ ] merge后 main/Cloudflare/custom-domain/API/data-SHA 验证

## 已确认的数据与所有权

1. 专业代码与中文名称：复用 `shared/resources/majors/major-catalog-contract.js` + `ln-rank/kb/major-understanding/major-catalog-2026.generated.js`。
2. 2026/2025/2024专业历史记录：复用 `/api/ai/major-history` 及其现有历史证据合同，不复制招生事实。
3. 2026考生参考位次：新增轻量 `/api/simulation-rank`，内部直接调用现有 `functions/_lib/ln-2026-physics-score-rank.js`，不建立第二份位次数据。
4. 学校输入：复用 `tongxue/data/school-name-resolver-v150.js` 的学校实体解析。
5. 志愿状态：页面自身只负责家庭草案的排序/保存，不改变 `selection-pool` 的业务事实与家庭方案真源。

## 断网续接规则

每次继续工作先读取本文件、PR #267、分支 HEAD 与 main HEAD；以实际 SHA 和文件状态恢复，不根据记忆推断。

## 当前实现

- `ln-rank/simulation-report.html`
- `ln-rank/js/simulation-report.v001.js`
- `ln-rank/css/simulation-report.v001.css`
- `functions/api/simulation-rank.js`
- `tools/verify-simulation-report-v001.mjs`
- `.github/workflows/verify-simulation-report-v001.yml`

## 测试规则

- Node 20 语法检查。
- 模块契约检查。
- Cloudflare branch preview deploy。
- main tree integrity。
- 全站 release/runtime/resource gates 必须以最终 HEAD 为依据。
- exact-head merge 后重新核验 main SHA 与生产部署，不接受旧 SHA 的验证证据。
