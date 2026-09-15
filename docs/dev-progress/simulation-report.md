# 模拟志愿填报单页开发进度

当前主线：`feat/simulation-workspace-v016-human-complete`
PR：#290
基线 main：`7873c939e3cfebc4bf3e48a230de09dadd930d60`
最终候选 HEAD：`e95be9c208514a2a1c10a30816cf0ee698fea08d`
产品版本：`simulation-workspace-v016.10`
产品修订：`r100-final-ci-gate`
阶段：merge-gate / CI runner blocked

## 已完成

- [x] #287 / #288 / #289 / #286 已关闭，旧线不再作为功能主方案。
- [x] Human Input 主路径正式接入模拟志愿单页。
- [x] 学校输入/删除非阻塞，异步解析 debounce + AbortController + token。
- [x] 宽泛专业相关反馈、学校实际记录约束、名称+代码双键确认。
- [x] 专业代码中间态、连续 Backspace、IME、paste、rapid typing。
- [x] 学校/专业变化使旧确认失效；网络错误与无记录分离。
- [x] 请求缓存/预算、Legacy 500ms render 移除、异步 Legacy render guard。
- [x] URL inbound code/name 冲突与 duplicate 防护。
- [x] 当前 PDF 输出层支持“报考信息（待核实）”空白字段，后续页重复顶部考生信息，当前输出不使用旧家庭判断术语。
- [x] HTML cache-buster、manifest、contract/browser regression 与 v016.10/r100 对齐。
- [x] v016 workflow 已覆盖 input/PDF/guard/progress 的必要触发路径。

## Merge Gate 当前状态

- GitHub Actions v016 `contract` 已创建：run `34945171756`，job `104302747116`，当前 `queued`，尚无 conclusion。
- browser job 尚未执行，必须等待 contract 成功后再运行。
- Cloudflare Pages 对同一最终 HEAD `e95be9c...` 已创建 deployment，当前 `in_progress`，尚未 SUCCESS。
- 本地环境无法访问 GitHub 网络，不能以本地 clone 代替 GitHub Actions。

## 禁止 merge 条件

当前不满足 merge gate。不得把 queued/pending 当 passed，也不得使用更早 HEAD 的 Preview 或测试结果替代 `e95be9c...`。

## 合并后的要求

完成 contract PASS、browser PASS、Cloudflare exact HEAD SUCCESS、必要多端/PDF核验后，再用 exact expected head merge；merge 后重新读取 main SHA，并核验 Production/custom-domain/API/data-SHA parity。

## 分支清理

旧 PR 已关闭。当前工具没有 branch-delete ref 操作，不能伪称旧 branch refs 已删除。
