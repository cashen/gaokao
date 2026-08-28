# 三入口 JS 缓存一致性补丁（v002）

合并 v001 后线上 CSS 已切换到 r024-card3，PC 高度修复已生效；但 active app → app-runtime → workspace → result-commit/major-path-handoff 的旧 import query 仍可能复用浏览器缓存，导致新标签未立即生效。

本补丁只做资源身份修复：为 active JS import 链追加 r025-card3，不改算法、数据、状态机或入口 owner；canonical release revision 从 r024 升至 r025。合并后必须检查线上资源 query、PC 三标签文本和三端浏览器结果。
