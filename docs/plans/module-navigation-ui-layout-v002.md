# 模块导航布局修复 v002

## 背景

生产地址已经部署了 v001 模块导航，但 live browser 发现桌面宽度也出现了 mobile/standalone 模块条：全站壳层异步挂载前创建的 standalone 条没有在壳层出现后移除，且 CSS 强制其在桌面端显示。结果是同一组模块入口重复出现、位置插入内容流，违背家长用户对“顶部导航”的直觉。

## 人类视角目标

- 桌面 PC：顶部只保留一组全站模块入口；当前模块明确高亮；跨模块返回作为同一导航中的辅助入口。
- Pad：保持顶部一组可用的核心模块入口，不出现重复条或横向溢出。
- Android/窄屏：全站壳层的桌面导航收起为一条紧凑“切换模块”栏；只保留一条，不与异步壳层重复。
- 壳层异步挂载期间创建的临时 standalone 条，在正式全站壳层出现后必须自动移除。
- 直达页面没有真实跨模块历史时，不伪造返回。

## 子任务

- **ML-01：恢复核验**：读取最新 main、开放 PR、PR #216 merge、CI/部署和正式 DOM 截图证据。
- **ML-02：布局和异步挂载修复**：standalone 桌面默认隐藏；全站壳层出现后删除临时 standalone；窄屏只显示一条紧凑模块栏。
- **ML-03：资源缓存身份和静态合同**：导航 JS/CSS 使用 nav002 query identity；更新静态合同与局部脚本合同；保留 Tongxue controller/search-view 的 v=159-startup001。
- **ML-04：PR/Preview/多终端验证**：exact base/head、CI、Preview；PC/Pad/Android 验证顶部位置、唯一性、模块根入口、当前态和跨模块完整路径返回。
- **ML-05：合并后生产收尾**：只合并 exact green head；重新核对 main、Cloudflare Pages/Production、正式地址 DOM；更新状态文件。

## 断网恢复规则

任何继续动作前先重新读取本 plan、对应 status、最新 main、全部开放 PR、当前分支与 PR 的精确 base/head、CI/checks、Preview/Production 状态。按精确 SHA、分支和标题确认已有结果；未知结果不得重复创建 branch、commit、PR 或 merge。每完成子任务更新 status。Ready 前后重新核对 exact head；只有所有相关检查通过才合并。合并后重新验证 main SHA、部署和正式 DOM；若 CI 绿色但正式 DOM 仍重复或位置错误，保持未完成并继续修复。不得触碰 Tongxue 查询语义、固定启动资源身份或 major-bands 独立问题。

## 验收

- 桌面截图不再出现“模块 去哪里”条插入内容流。
- PC 只有一组顶部模块入口。
- Pad 没有重复模块条，核心模块入口可见。
- Android 只有一条紧凑模块切换栏，当前态和返回可读。
- 跨模块返回保留完整 pathname/search/hash；同模块内部跳转不覆盖返回点；直达页面无伪造返回。
- 静态合同、脚本、CI、Preview、生产部署和正式地址验证均有真实结果记录。