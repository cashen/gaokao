# 模块导航入口缓存身份收口 v003

## 背景

PR #217 已合并并修复了导航生命周期，但正式域名实测显示：独立页已经加载 v002，而首页、专业初选和部分 Tongxue 入口仍加载旧 nav001 consumer，导致不同页面行为不一致，截图中的重复导航继续出现。

## 子任务

- **MC-01：生产回归确认**：记录 merge SHA、main、开放 PR、CI/部署和正式 DOM；确认 v002 已在部分页面生效、nav001 残留在哪些入口。
- **MC-02：入口链统一**：将所有仍引用 nav001 的 family shell consumer/Tongxue wrapper/direct shell entry 升为 nav002；不修改业务语义。
- **MC-03：合同与终端验证**：静态合同、脚本、CI、Preview；PC/Pad/Android 和首页/专业初选/Tongxue/独立页验证只出现正确的一组导航。
- **MC-04：合并后生产收尾**：只合并 exact green head；重核 main、Pages、Production、正式 DOM；更新 status。

## 人类视角规则

- 带全站壳层的页面：只有顶部一组全站模块导航，临时 standalone 必须消失。
- 无全站壳层的独立页面：保留一组位于正文之前的 standalone 导航。
- 窄屏：只显示一条“切换模块”栏；Pad 不出现重复或横向溢出。
- 返回只在存在真实跨模块历史时出现，并保留完整 pathname/search/hash。

## 断网恢复规则

任何继续动作前读取本 plan/status、最新 main、所有开放 PR、当前分支/PR exact base/head、CI/checks、Preview/Production。按精确 SHA、分支、标题确认已有写入，未知不得重复创建或合并。每个子任务更新 status；Ready 前后重核 exact head；仅合并全部相关检查通过的 exact head；合并后重核 main、部署和正式 DOM。独立 major-bands 503 与 bounded-fanout zero-job 不归因于导航。

## 边界

保留 Tongxue controller 与 search-view 固定 /tongxue/app/tongxue-runtime-controller-v159.js?v=159-startup001 和 /tongxue/app/tongxue-runtime-search-view-v159.js?v=159-startup001；不改变目录加载、查询语义或数据。