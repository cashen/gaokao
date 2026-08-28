# 模块导航缓存链收口 v004

## 背景

PR #218 合并后，入口 HTML 已升级 nav002，但首页/专业初选的 family-home、app-runtime、selection-pool 内部仍 import family-shell nav001。正式域名因此继续执行 v001，重复 standalone 导航仍可见。

## 子任务

- **MC-01：生产链核验**：记录 main、PR #218 merge、CI/部署和正式 DOM，确认残留发生在内部 import 链。
- **MC-02：内部 import 统一**：将 family-home.v3990_2.js、app-runtime.v3990_2.js、selection-pool.v3990_2.js 的 family-shell import 统一升级为 nav002。
- **MC-03：合同/Preview/多终端**：静态合同、CI、Preview、PC/Pad/Android 入口行为验证。
- **MC-04：合并后生产收尾**：只合并 exact green head，验证 main、部署和正式 DOM 后更新 status。

## 断网恢复规则

继续前读取本 plan/status、最新 main、全部开放 PR、当前分支/PR exact base/head、CI/checks、Preview/Production。按精确 SHA/分支/标题确认已有写入，未知不得重复。每个子任务更新 status；Ready 前后重核 exact head；仅合并全部相关检查通过的 exact head；合并后重核 main、部署和正式 DOM。major-bands 503 与 bounded-fanout zero-job 独立，不归因导航。

## 边界

只修改导航缓存链；不修改 Tongxue 查询语义、目录加载、固定 controller/search-view 的 v=159-startup001、返回路径语义或业务数据。