# 模拟志愿填报单页开发进度

当前主线：`feat/simulation-workspace-v016-human-complete`
PR：#290
基线 main：`7873c939e3cfebc4bf3e48a230de09dadd930d60`
当前版本：`simulation-workspace-v016.6`
当前修订：`r096-final-compat-sync-pdf`
阶段：final-regression-awaiting-ci

## 已完成

- [x] 关闭 #287 / #289，停止旧 v014 补丁线继续作为主方案。
- [x] 从当前 main 建立干净 v016 分支。
- [x] Human Input 正式接入 `/ln-rank/simulation-report.html`。
- [x] 页面停止加载 v006 input bridge / v014 input controller。
- [x] 学校输入/删除不等待网络；异步解析有 debounce、AbortController、token。
- [x] 宽泛专业有相关反馈但不自动拍板；学校确认后候选严格来自学校实际记录。
- [x] 最终确认要求学校、专业名称、专业代码一致，避免同名不同代码误确认。
- [x] 专业代码支持中间态和连续 Backspace。
- [x] IME composition、paste、快速输入纳入统一输入生命周期。
- [x] 学校/专业变化使旧确认失效；网络错误与数据未命中分开。
- [x] fact cache + 请求预算控制。
- [x] v007 移除正常运行期间 500ms 周期 render。
- [x] URL inbound majorCode/majorName 冲突拦截与重复检测。
- [x] 隐藏 Legacy 数据同步不再触发可见工作台重绘；避免输入失焦/抢焦点，同时保留既有历史、排序、家庭状态数据链路。
- [x] 当前 PDF 输出单独由 v016 层接管：字段标明“待核实”，后续页面重复顶部考生信息，移除旧家庭判断术语。
- [x] 当前 HTML cache-buster 与 v016.6/r096 统一。
- [x] 版本/revision 已 bump 到 `v016.6/r096`。

## 尚未宣称完成

- [ ] v016.6 contract 实际执行通过。
- [ ] 390/768/1280 browser 实际执行通过。
- [ ] Windows Chrome / Android Chrome / Android Alook / Pad 实机检查。
- [ ] PDF 多页、第二页头信息、待核实字段最终浏览器实测。
- [ ] GitHub v016 workflow 在当前 HEAD 真正启动并完成。
- [ ] Cloudflare Preview 精确对应最终 HEAD。
- [ ] Production/custom-domain/API/data-SHA parity。
- [ ] 关闭已废弃分支 refs（当前工具没有 delete branch ref 能力）。
- [ ] 最终合并 main。

## CI 现状

此前最终 HEAD 出现 `pending / total_count=0`，说明不是产品测试失败，而是 Actions 触发层没有产生 run。当前提交已取消 `[skip ci]`；必须重新核验最新 HEAD 是否实际产生 v016 workflow。queued/pending/unknown 均不得视为 passed。

## 断网续接

恢复只认本文件、PR 实际 HEAD、main 实时 SHA、最新 CI/Preview/Production。旧 PR/旧 SHA 证据不得替代当前 HEAD。

## Merge Gate

只有最终 HEAD 的 contract/browser/多端/PDF/Preview 证据均满足，并确认生产 parity 后，才能使用 exact expected head merge 到 `main`；merge 后必须再次读取 main SHA 并验证线上。
