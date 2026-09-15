# 模拟志愿填报单页开发进度

当前主线：`feat/simulation-workspace-v016-human-complete`
PR：#290
基线 main：`7873c939e3cfebc4bf3e48a230de09dadd930d60`
当前产品版本：`simulation-workspace-v016.17`
当前产品修订：`r107-duplicate-inbound-regression`
阶段：fixing contract gate → rerun exact-head CI

## 已完成

- [x] Human Input 主路径正式接入模拟志愿单页。
- [x] 学校输入/删除非阻塞，异步解析 debounce + AbortController + token。
- [x] 宽泛专业相关反馈、学校实际记录约束、名称+代码双键确认。
- [x] 专业代码中间态、连续 Backspace、IME、paste、rapid typing。
- [x] 学校/专业变化使旧确认失效；网络错误与无记录分离。
- [x] 请求缓存/预算、Legacy 500ms render 移除、异步 Legacy render guard。
- [x] URL inbound code/name 冲突防护。
- [x] URL inbound duplicate 检测已补入浏览器回归测试，要求“不新增志愿 + 明确提示已存在”。
- [x] 当前 PDF 输出层支持“报考信息（待核实）”空白字段，后续页重复顶部考生信息，当前输出不使用旧家庭判断术语。
- [x] v007 catalog resolver 使用 repo-root `shared/resources/majors/major-catalog-contract.js`。

## 本轮修复

- GitHub Actions v016 contract run `34947654997` 在 exact HEAD `c9843f11463477d23a58a9f88d3188cfac53ac8c` 已实际出队执行，不再是 runner queue 阻塞。
- contract 唯一失败断言为 browser regression 缺少 `duplicate` marker；因此 browser job 被 needs 链路正确跳过。
- 当前修订将 duplicate inbound 从“代码有保护但测试无覆盖”补成可执行 browser regression，并把版本递增到 `simulation-workspace-v016.17 / r107-duplicate-inbound-regression`。

## Merge Gate

必须重新取得新的 exact HEAD，并满足：v016 contract PASS → browser PASS → Cloudflare Pages Preview 对同一 exact HEAD SUCCESS → 必要多端/PDF核验 → 再次确认 PR head 未移动 → expected-head merge。

合并后：重新读取 main SHA，并核验 Cloudflare Production、custom domain、`/api/ai/*`、相关数据版本与 main SHA parity。

## 说明

旧 PR/旧 v014 线不作为本轮主方案。不能用旧 HEAD 的 CI、Preview 或部署证据替代本轮 exact HEAD。
