# 模块导航生产缓存身份恢复 v001

## 背景

PR #215（merge SHA `36bf68d80d64cfbece0018ac774bc433647e2ef4`）的 Preview 已呈现模块导航，但正式域名实测仍返回旧 Tongxue wrapper：`tongxue-runtime-v159-r3968.js?v=3968_0` 命中旧缓存。因此生产 HTML 虽已更新，导航 JS 没有执行。此任务只修复入口资源的 query cache identity，不改变任何查询、数据、Tongxue v159 固定 controller/search-view 身份或业务语义。

## 子任务

- **MC-01：恢复核验**
  - 读取最新 main、开放 PR、PR #215、module-navigation plan/status、CI、Pages 和生产实测。
  - 精确记录生产 HTML 已更新而旧 wrapper 未更新的证据。
- **MC-02：更新入口 cache identity**
  - 为本次改动过的 family shell consumer、Tongxue wrapper 和直接 shell 页面使用新的 query identity。
  - 不修改稳定资源路径的业务内容；不恢复旧 `v=159-major001`。
  - 保留 Tongxue controller/search-view 的 `?v=159-startup001`。
- **MC-03：静态合同与 PR 验证**
  - 验证语法、HTML 入口映射、导航合同、Tongxue fixed resource identity。
  - PR Ready 前后核对 exact base/head；等待 CI、Preview、PC/Pad/Android browser checks 全绿。
- **MC-04：合并和生产收尾**
  - 只合并 exact green head。
  - 合并后核对 main、Cloudflare Pages/Production deployment、正式域名实际 DOM。
  - 验证从专业筛选带分数/锚点进入 Tongxue 后，返回链接保留完整路径；直达 Tongxue 无历史时不伪造返回。
  - 完成后更新主 status，记录 PR/merge SHA、部署和生产实测。

## 断网恢复规则

继续前先读取本 plan、`docs/status/module-navigation-return-v001-status.json`、最新 main、所有开放 PR、该分支和 PR 的精确 head/base、CI jobs/checks、Preview/生产状态。按精确 SHA、分支和标题确认已有写入；未知结果不得重复创建 branch、commit、PR 或 merge。每完成 MC 子任务更新 status。Ready 前后必须重新核对精确 head；所有相关检查通过后才合并。合并后重新核对 main、部署和正式地址；任何生产 DOM 与 CI 不一致都保持未完成，不把 CI 绿灯当作线上生效。