# 模拟志愿填报单页开发进度

当前主线：`feat/simulation-workspace-v016-human-complete`
PR：#290
基线 main：`a96a7d15190b1f8737501985a92b4c5ab09e4978`
当前产品版本：`simulation-workspace-v016.30`
当前产品修订：`r120-responsive-input-main-thread-clean`
阶段：fast-path fix → exact-head CI verification

## 本轮已完成

- [x] 活跃 HTML 输入运行时切换为 `simulation-report-v017-responsive-input.js`；v015 仅保留兼容文件，不再被页面主路径加载。
- [x] 学校搜索 resolver 在 Web Worker 中预热，避免首个学校输入触发主线程重型目录初始化。
- [x] 学校候选搜索与严格学校确认分离；候选先出，确认后建立 `confirmedSchool`。
- [x] `confirmedSchool` 持久化并作为专业事实核验的行级依赖，避免重复解析学校实体。
- [x] 专业目录候选本地立即反馈；事实核验采用单次有界多 `major` 查询和内存过滤，移除串行补查。
- [x] 新专业输入会立即取消旧事实请求，减少快速输入时的网络竞争。
- [x] 学校切换会清理旧上下文和旧事实，避免旧学校结果回流。
- [x] 390px Android 性能门禁与学校×专业一致性场景已增强。
- [x] v016.30/r120 版本与 URL cache-buster 已同步。

## 已验证

- [x] v016.29 exact HEAD contract PASS；下一步必须取得 v016.30 exact HEAD contract PASS。
- [x] v016.29 exact HEAD browser 已暴露真实候选超时问题；该问题已定位为 v015 主线程加载仍存在，v016.30 已移除其 HTML 激活路径。

## 当前门禁

- [ ] v016.30 exact HEAD contract PASS
- [ ] v016.30 exact HEAD browser PASS（Android 390 / Pad 768 / Desktop 1280）
- [ ] v016.30 exact HEAD performance PASS
- [ ] Cloudflare Preview 与 exact HEAD SHA 一致并 SUCCESS
- [ ] 多端/PDF必要核验
- [ ] 再次确认 PR head 未移动

## Merge Gate

必须满足以上全部 exact-head 门禁后，才允许 expected-head merge。合并后重新读取 main SHA，并核验 Cloudflare Production、custom domain、`/api/ai/*` 与相关数据版本/SHA parity。

禁止使用旧 HEAD 的 CI、Preview、部署或聊天记录作为最终通过依据。
