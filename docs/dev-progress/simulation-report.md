# 模拟志愿填报单页开发进度

当前主线：`feat/simulation-workspace-v016-human-complete`
PR：#290
基线 main：`7873c939e3cfebc4bf3e48a230de09dadd930d60`
当前版本：`simulation-workspace-v016.9`
当前修订：`r099-final-regression`
阶段：final-regression

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
- [x] 隐藏 Legacy 数据同步不再触发可见工作台重绘；异步 Legacy 更新也被 render guard 隔离。
- [x] 当前 PDF 由 v016 独立接管；字段标明“待核实”，后续页面重复顶部考生信息，不使用旧家庭判断术语。
- [x] HTML cache-buster、manifest、contract、browser regression 统一到 `v016.9/r099`。

## 尚未宣称完成

- [ ] v016.9 contract 实际执行通过。
- [ ] 390/768/1280 browser 实际执行通过。
- [ ] Windows Chrome / Android Chrome / Android Alook / Pad 实机检查。
- [ ] PDF 多页、第二页头信息、待核实字段最终浏览器实测。
- [ ] GitHub v016 workflow 在当前最终 HEAD 真正启动并完成。
- [ ] Cloudflare Preview 精确对应最终 HEAD 且构建完成。
- [ ] Production/custom-domain/API/data-SHA parity。
- [ ] 使用 exact final head merge 到 main。
- [ ] 清理已废弃 branch refs（当前工具无 delete branch ref 操作）。

## 当前门禁

必须把 `main`、PR、最新 HEAD、Actions、Cloudflare、生产逐层核验。任何旧 SHA 证据都不能替代当前最终 HEAD。
