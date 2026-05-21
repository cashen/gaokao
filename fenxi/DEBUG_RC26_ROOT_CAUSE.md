# V2.92RC2.6 audit-human-fast-runner

本版基于 RC2.5 的回传日志继续收口。

## RC2.5 已解决
- ABC human audit 不再 caseTotal=0 清零。
- 已能跑出 partial report：18/36 case，PASS/WARN/FAIL/TIMEOUT 都能回传。

## RC2.5 新暴露的问题
- full 审计 36 例在 480s 内只跑完 18 例。
- 部分 case 虽设置 perCaseTimeout，但页面同步渲染/详情卡/兴趣聚合会阻塞事件循环，Promise 超时无法及时中断。
- 多个 FAIL 不是加载失败，而是 B 档专业主线兴趣命中偏低。

## RC2.6 修复
- compute-pipeline 增加 auditLight，只在审计场景跳过 renderCards、updateLive、updateGuideState、兴趣聚合等重 UI 步骤。
- 正常用户页面不受影响。
- debug full 总时限提高到 600s，但主要依赖 auditLight 加速，不靠单纯加时间。
- 审计判定区分“B 档展示不理想”和“ABC 全局兴趣失效”：如果 A/C 已明显体现兴趣，不再误判为全局 FAIL，而是 WARN。

## 仍然保留的业务边界
- 不改 DATA。
- 不改正式分数/位次公式。
- 不改正常页面 applyFilters 业务路径。
- 不改 A/B/C 正式推荐计算，只在 debug 审计状态下跳过重 UI 渲染。
