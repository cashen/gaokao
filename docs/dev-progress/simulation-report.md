# 模拟志愿填报单页开发进度

当前主线：`feat/simulation-workspace-v016-human-complete`
PR：#290
基线 main：`7873c939e3cfebc4bf3e48a230de09dadd930d60`
当前版本：`simulation-workspace-v016.2`
当前修订：`r092-real-ci-gate`
阶段：real-ci-gate

## 已完成

- [x] 关闭 #287 / #289，停止把旧 v014 补丁线继续当作主方案。
- [x] 从当前 main 建立干净 v016 分支。
- [x] 将 v015 Human Input 主路径真正接入 `/ln-rank/simulation-report.html`。
- [x] 页面停止加载 v006 input bridge / v014 input controller。
- [x] 学校输入 debounce、取消旧异步任务、清空立即失效。
- [x] 专业本地反馈即时、学校确认后严格收敛到学校实际记录。
- [x] 宽泛输入不自动拍板；目录候选明确不是学校事实。
- [x] 专业代码允许中间态逐级编辑。
- [x] IME compositionstart/update/end 生命周期。
- [x] paste/rapid typing/Backspace browser regression 场景。
- [x] AbortController + token + fact cache。
- [x] 学校/专业变化时旧确认失效。
- [x] v007 移除 500ms 周期性 render 并补 URL inbound code/name 冲突检查。
- [x] URL inbound conflict regression；版本/revision bump 到 v016.2/r092。

## 尚未宣称完成

- [ ] v016 contract 实际执行通过。
- [ ] 390/768/1280 browser 实际执行通过。
- [ ] Windows Chrome / Android Chrome / Android Alook / Pad 实机检查。
- [ ] PDF 多页、第二页头信息、待核实字段最终实测。
- [ ] GitHub v016 CI/legacy workflow 状态通过。
- [ ] Cloudflare Preview exact SHA。
- [ ] Production/custom-domain/API/data-SHA parity。
- [ ] 最终合并 main。

## 当前门禁观察

这一提交 intentionally 去掉 `[skip ci]`，用于取得最终 HEAD 的真实 workflow 证据。如果再次出现历史 v001-v014 大量 workflow fan-out，需把它归类为 CI trigger architecture 问题，不能当作产品代码失败，也不能把 queued 当 passed。

## 断网续接

恢复只认本文件、PR 实际 HEAD、main 实时 SHA、最新 CI/Preview/Production。旧 PR/旧 SHA 证据不得替代当前 HEAD。
