# 模拟志愿填报单页开发进度

当前主线：`feat/simulation-workspace-v016-human-complete`
PR：#290
基线 main：`6df5410461f314bd22d30b65ec98a2ac34d631b3`
当前产品版本：`simulation-workspace-v016.45`
当前产品修订：`r135-compact-a4-pdf`
运行时修订：`v016.43-r133`
阶段：canonical exact-head gate → browser actions → performance → Preview → merge

## v016.45 / r135 本轮修订：紧凑 A4 PDF

- [x] PDF 从“长画布后按固定像素切页”改为“先按 A4 可用高度测量并分页，再逐页渲染”。
- [x] 志愿从大卡片改为连续工作表行，减少标题、边框、重复说明和空白占用。
- [x] 2 条较短志愿在空间足够时共用一页，不再按“一条志愿一页”机械分页。
- [x] 只有真实剩余空间不足时才分页；续页重复学生姓名、总分、参考位次和考试类型。
- [x] PDF 主体保留学校、专业/代码、2026/2025/2024 历史、相对位次、家庭处理及可执行核实/补充信息。
- [x] 历史数据只作为参考，PDF 不再输出“有历史记录需要核对”或“· 需核验”。
- [x] 补回 v017 responsive input CSS；此前 canonical contract 因该文件缺失直接失败。
- [x] release manifest / 页面 cache-buster / verifier / plan 同步到 v016.45/r135。

## v016.44 / r134 历史仅作参考

- [x] 保留学校→专业的明确候选确认，不改变学校/专业事实核验。
- [x] 保留真实三年历史数据写回 `history.years`；历史数据仍然展示。
- [x] 移除“有历史记录需要核对”的状态；历史数据不再进入 needs-check 状态。
- [x] 移除历史条目中的“需核验”展示标签。
- [x] 页面用“补充需要确认的信息”替代“核对需要确认的地方”。

## v016.43 / r133 之前已完成

- [x] 专业确认后直接基于 `/api/ai/major-history` 返回的学校实际专业记录生成 2026 / 2025 / 2024 历史。
- [x] 每年使用该校该专业记录中最低可用分数对应记录；缺失年份显式 `no-strict-record`，不编造数据。
- [x] 移除旧 v007 整卡周期性/Observer 重绘对 v017 候选按钮的破坏。
- [x] 学校/专业候选直接 button click 与 stale worker 防护。
- [x] 学校搜索放入独立 Worker，输入同步路径保持低延迟。
- [x] historical simulation-report workflows 改为手动 workflow_dispatch；canonical gate 集中到 v016。

## 当前 canonical gate

`.github/workflows/verify-simulation-workspace-v016.yml` 负责当前 simulation workspace；contract 使用 `tools/verify-simulation-workspace-v017.mjs`，browser 使用 `tools/browser-simulation-workspace-v017-actions.mjs`，随后执行 `tools/browser-simulation-workspace-v016-performance.mjs`。

## Merge Gate

必须以最终实时 HEAD 的 canonical contract PASS、PC/Pad/Android direct-action browser PASS、performance PASS、Cloudflare Preview exact SHA SUCCESS 为准；随后再做必要 PDF/多端核验和最终 HEAD 未移动检查。全部通过才允许 expected-head merge 到 main。合并后重新读取 main SHA，核验 Cloudflare Production/custom domain/API/data-SHA parity。

旧 Preview、旧 SHA、旧 WF 结果不得替代最终 HEAD 证据。
