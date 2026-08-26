# 导航缓存链收口 v005

## 背景

PR #219 已合并到 main（15bd2d1f56f1a6e9b088ef243066837e02c59ead），但生产正式域名仍执行缓存中的导航 v0.01：首页和专业初选入口虽然 HTML 已是 nav002，入口 JS 文件自身仍沿用 nav002 身份，导致旧内容继续命中。用户反馈的“位置错位”因此仍可见：桌面壳页面出现全局导航和插入内容流的 standalone 导航两层。

## 子任务

- NC5-01：远端核验：核对 main、开放 PR、分支、CI、Preview、Production 和既有 status；确认只从最新 main 继续。
- NC5-02：缓存链升级：仅升级导航相关 HTML/JS 入口及其 app→runtime→navigation import 的 query identity 到 nav003；保持 Tongxue controller/search-view 的 v=159-startup001 不变。
- NC5-03：静态合同与 PR 验证：运行导航合同、语法检查、CI、Preview，并核对 PC/Pad/Android 入口；不改变查询语义、返回路径或 major-bands。
- NC5-04：合并后生产验收：Ready 前后核对精确 head SHA；全部相关 checks 通过后合并；验证 main、Cloudflare Production、正式地址多页面 DOM，确认壳页面仅一层顶部导航，shell-less 页面仅保留自己的 standalone 导航；更新 status。

## 断网恢复规则

继续前必须重新读取本 plan/status 和最新远端 main、全部开放 PR、分支 exact SHA、PR base/head/draft/ready/merged、CI/checks、Preview/Production。任何写入若结果未知，先按精确标题/SHA查询，不得重复写入。每完成子任务更新 status；Ready 前后必须重核 exact head；只能合并当前 exact head 且相关 checks 全绿的 PR。合并后必须重新验证 main SHA、部署和正式地址。major-bands 的 503 与 bounded-fanout zero-job 是独立问题，不归因于本任务。

## 人类视角验收

一个页面只保留一个主导航层级：有全局 shell 的桌面/Pad 页面，导航固定在页面顶部，不插入进度卡或正文；窄屏只显示一个紧凑的“切换模块”入口。没有全局 shell 的页面，standalone 导航才是唯一导航，并保留模块根目录、返回上一模块和切换模块能力。
