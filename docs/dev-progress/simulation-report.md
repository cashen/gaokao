# 模拟志愿填报单页开发进度

当前主线：`feat/simulation-workspace-v016-human-complete`
PR：#290
基线 main：`7873c939e3cfebc4bf3e48a230de09dadd930d60`
当前版本：`simulation-workspace-v016.9`
当前修订：`r099-final-regression`
当前 HEAD：以 GitHub PR #290 实时 HEAD 为准
阶段：final-regression / merge-gate

## 功能收口

- [x] 关闭 #287 / #288 / #289，旧 v014 修补线不再作为主方案。
- [x] Human Input 正式接管 `/ln-rank/simulation-report.html`。
- [x] 移除 v006 input bridge、v014 输入控制器对主输入链路的参与。
- [x] 学校输入/删除不等待网络；输入异步解析 debounce + AbortController + token。
- [x] 宽泛专业有相关反馈但不自动替用户拍板。
- [x] 已确认学校后，专业候选严格以学校实际 `/api/ai/major-history` 记录为边界。
- [x] 专业名称与专业代码同时存在时，最终确认要求双键一致。
- [x] 专业代码支持中间态连续 Backspace。
- [x] IME composition、paste、快速连续输入均有回归场景。
- [x] 学校/专业变化使旧确认失效；网络失败与无记录分开。
- [x] 同校+专业事实查询缓存；请求预算回归。
- [x] Legacy workbench 不再 500ms 周期 render；异步 Legacy 更新不能替换可见 Human Input 卡片。
- [x] URL inbound majorCode/majorName 冲突拦截与 duplicate 防重。
- [x] PDF 由 v016 独立层接管；“报考信息（待核实）”保留空白核对字段；后续页重复顶部考生信息；不使用旧家庭判断术语。
- [x] HTML cache-buster、manifest、contract、browser regression 已统一到 v016.9/r099。

## 当前 merge-gate 仍需证据

- [ ] v016.9 contract 实际 GitHub Actions PASS。
- [ ] 390/768/1280 browser regression 实际 GitHub Actions PASS。
- [ ] Windows Chrome / Android Chrome / Android Alook / Pad 实机核验。
- [ ] PDF 多页/第二页头信息/“待核实”字段真实浏览器核验。
- [ ] Cloudflare Preview 必须显示当前最终 HEAD SUCCESS，并记录 exact Preview URL。
- [ ] Production/custom-domain/API/data-SHA parity。
- [ ] exact-head merge 到 main。
- [ ] merge 后再次验证 main SHA 与线上部署。
- [ ] 清理旧 branch refs；当前 GitHub 工具无 branch-delete API，因此不会伪称已删除。

## 已知基础设施事实

对多个最终 HEAD 的 `fetch_commit_workflow_runs` 均得到 `workflow_runs: []`，commit status 为 `pending / total_count=0`。这不是测试失败；它意味着当前会话可用 GitHub 接口没有观察到 Actions run。当前 HEAD 的 Cloudflare deployment 已被识别并处于 Build in progress，不能把它当作 SUCCESS。

## Merge gate

只有最终 HEAD 所有可验证门禁满足后，才允许使用 expected head SHA merge。禁止使用旧 SHA 的测试或部署结果替代当前 HEAD。
