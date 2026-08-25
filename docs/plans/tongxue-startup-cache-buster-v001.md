# Tongxue 启动资源缓存身份修复计划 v001

## 背景

PR #208 已合并到 main，但合并后的生产核验发现：`/tongxue/` HTML 已包含启动状态位，固定的 `?v=159-major001` 控制器 URL 仍可能命中旧的 Cloudflare immutable 缓存；同一资源追加随机查询参数时才返回包含后台目录加载和提前查询队列的新控制器。这样会让部分 Android 用户仍执行旧启动逻辑。

## 必备执行步骤

1. **CB-01：确认生产证据**
   - 核对 main 合并 SHA、生产 HTML、固定资源 URL 和随机查询资源 URL。
   - 不把随机查询命中新内容视为固定入口已修复。
2. **CB-02：提升资源缓存身份**
   - 只更新 Tongxue controller/search-view 的 importmap 与内部依赖查询版本。
   - 不改变查询解析、专业单专业、地区、来源边界或评论分页语义。
3. **CB-03：验证**
   - 运行静态语法、启动状态合同、既有 Tongxue directory/scope/major 检查。
   - 等待 exact-head Preview 成功。
   - 等待 CI Chromium 回归和 production resource/release/API checks 全绿。
   - 生产固定资源 URL 必须包含新 cache identity，并暴露 `setTongxueIndexStatus`、后台目录加载和 `catalogLoading` 队列合同。
4. **CB-04：合并与收尾**
   - PR Ready 后用 expected head SHA squash merge 到 main。
   - 核对 main、生产 HTML、固定 controller/search-view 资源和 `/tongxue/` 200 响应。

## 断网续作规则

每次继续先读取本文件、`docs/status/tongxue-startup-cache-buster-v001-status.json`、本地 checkpoint，并核对 GitHub main、分支、PR、head、CI、Preview 和生产资源。写入结果未知时按 exact SHA/标题核对，不重复创建分支、commit、PR 或 merge。
