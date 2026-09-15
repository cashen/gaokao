# 模拟志愿填报单页开发进度

当前主线：`feat/simulation-workspace-v016-human-complete`
PR：#290
基线 main：`a96a7d15190b1f8737501985a92b4c5ab09e4978`
当前产品版本：`simulation-workspace-v016.18`
当前产品修订：`r108-browser-school-wait`
阶段：fixing browser regression → rerun exact-head CI

## 已完成

- [x] Human Input 主路径正式接入模拟志愿单页。
- [x] 学校输入/删除非阻塞，异步解析 debounce + AbortController + token。
- [x] 宽泛专业相关反馈、学校实际记录约束、名称+代码双键确认。
- [x] 专业代码中间态、连续 Backspace、IME、paste、rapid typing。
- [x] 学校/专业变化使旧确认失效；网络错误与无记录分离。
- [x] 请求缓存/预算、Legacy 500ms render 移除、异步 Legacy render guard。
- [x] URL inbound code/name 冲突防护与 duplicate 检测。
- [x] PDF 输出层支持“待核实”与后续页顶部考生信息重复，移除旧家庭判断/冲稳保措辞。
- [x] v007 catalog resolver 使用 repo-root `shared/resources/majors/major-catalog-contract.js`。

## 本轮已定位并修复

- exact HEAD `c9843f...` 的 contract 失败原因是 browser 回归缺少 `duplicate` marker；已补为真实 duplicate inbound 浏览器场景。
- exact HEAD `51ac604...` 的 browser 失败不是产品逻辑错误，而是测试把学校异步解析错误地假设为固定 500ms 内完成；Android 390px 下出现候选按钮尚未可见。
- v016.18 将该断言改为等待 `[data-v015-school-choice]` 首个按钮在最多 5 秒内实际可见，保持有界，不等待无限网络。

## 当前门禁

- v016 contract：`51ac604...` 已 PASS；v016.18 新 HEAD 提交后需重新取得最新 exact-head PASS。
- Cloudflare Pages：`51ac604...` exact-head Preview 已 SUCCESS；v016.18 新 HEAD 必须重新取得 exact-head SUCCESS。
- browser：`51ac604...` 失败，已由 v016.18 修复并等待新 run。
- 另有 bounded-fanout workflow 在 `51ac604...` 出现 push failure 且无 jobs；当前 workflow 定义为 PR/manual only，该异常需继续归因，但不能替代 v016 专用门禁。

## Merge Gate

必须满足：新 exact HEAD 的 v016 contract PASS → browser PASS → Cloudflare Preview exact HEAD SUCCESS → 多端/PDF必要核验 → 再次确认 PR head 未移动 → expected-head merge。

合并后：重新读取 main SHA，并核验 Cloudflare Production、custom domain、`/api/ai/*` 与相关数据版本/SHA parity。

禁止使用旧 HEAD 的 CI、Preview、部署或聊天记录作为最终通过依据。
