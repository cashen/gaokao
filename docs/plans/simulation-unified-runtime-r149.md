# 模拟志愿统一运行时接管 r149

## 目标
把 `/ln-rank/simulation-report.html` 从多轮补丁叠层收敛为单一运行时架构：一个 Bootstrap、一个持久化 Store、一个事件入口、一个页面 CSS owner，以及一个 PDF service。历史实现不再作为页面运行时加载。

## 当前基线
- main: `48128fdf693e7890dbe140372db3a46971686c9a`
- product: `simulation-workspace-v016.59`
- revision: `r149-unified-runtime-takeover`
- canonical runtime: `/ln-rank/js/simulation-runtime.js`

## 架构边界
- 页面只加载 `simulation-runtime.js` 一个模拟志愿 Bootstrap。
- school resolver worker、专业目录 resolver、招生历史 API 是服务依赖，不承担页面生命周期。
- Store 是唯一持久化状态 owner；输入过程不得通过旧 DOM 或旧 controller 回写。
- 事件使用页面级 delegation；不使用 Observer/legacy event patching。
- PDF 通过 `simulation-report-pdf-service.js` 按需调用，Android 仅是输出适配，不再存在第二个 Android runtime。
- 页面 CSS 收敛到 `simulation-report.css`。

## 迁移
1. 保留 `gaokao:simulation-report:v002` 数据结构，兼容旧 `v001` 数据。
2. 将旧家庭状态映射到新的家长语言：保留→继续考虑、备选→候选、待讨论→还没决定、已排除/删除→排除。
3. 学校必须显式选择候选后才建立 `confirmedSchool`。
4. 专业目录候选只是提示，最终专业需要学校×专业名称×代码一致。
5. 历史数据仅作参考；缺失历史不创建待核对状态。
6. 输入时只局部更新候选/提示，不重新渲染整张志愿清单，避免“输入辽宁→删除”卡顿再次出现。

## 删除的旧运行时
页面不再加载：v001、v005、v007、v010、v012、v016 history/guard/PDF/PDF-Android、v017 responsive input，以及对应历史 simulation CSS。

这些文件从运行时架构移除；历史 PR/进度记录保留，不回写历史结论。

## Definition of Done
- 统一架构静态 contract PASS。
- Node syntax check PASS。
- Desktop 1280、Pad 768、Android 390 浏览器回归 PASS。
- 快速输入/清空、学校确认、专业候选、学校×专业历史、家庭决策、排序、刷新持久化 PASS。
- PDF service smoke PASS，Android 输出走 Blob fallback。
- PR final HEAD、CI、Preview SHA 全部以最终 HEAD 为证据。
- 合并后重新验证 main SHA、正式站、custom domain 与相关 API。
- 后续功能不得新增并行 simulation runtime；需要扩展时必须在 unified runtime/service 模块内完成。
