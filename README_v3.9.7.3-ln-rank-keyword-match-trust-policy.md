# v3.9.7.3-ln-rank-keyword-match-trust-policy

本版核心目标：把“专业 / 项目 / 行业关键词”搜索从普通模糊匹配升级为“高报语义匹配”。

## 重点变化

1. 新增关键词匹配可信度策略：
   - 精准匹配
   - 相关方向
   - 行业关联
   - 项目属性
   - 弱关联

2. 结果卡片新增人话解释：
   - 卡片标题旁显示“精准匹配 / 相关方向 / 行业关联 / 项目属性”。
   - 卡片内显示“命中原因”。

3. 搜索结果顶部新增命中统计：
   - 精准匹配 N 个｜相关方向 N 个｜行业关联 N 个｜项目属性 N 个。

4. 重点审计高风险词：
   - 电力：区分电气/电网核心、能源动力相关、能源产业弱关联。
   - 交通：区分交通运输/轨道/铁道核心、车辆/道桥相关、行业院校关联。
   - 石油：区分石油工程/油气储运核心、化工/过程装备相关、行业院校关联。
   - 航空/航天：区分飞行器核心、机械/自动化/材料相关、行业院校关联。
   - 会计：区分会计学核心、财务/审计相关、财经院校关联。
   - 医学：作为宽词处理，提示继续细化临床/口腔/护理/药学/影像。
   - 中外/高收费/公费师范/定向：作为项目属性，不冒充专业名。

5. 颜色收稳：
   - 更多方向普通词统一灰绿系。
   - 项目属性继续浅米色轻提示。
   - 匹配标签低饱和，不做彩色标签墙。

## 新增文件

- functions/_lib/keyword-match-policy.js
- functions/_lib/keyword-match-scorer.js
- ln-rank/css/match-badge.v3973.css

## 修改文件

- functions/_lib/major-project-matcher.js
- functions/_lib/search-scorer.js
- functions/api/major-bands.js
- ln-rank/js/feature/major-pool/major-pool-render.v3973.js
- ln-rank/css/keyword-preset.v3973.css
- ln-rank/index.html
- ln-rank/selection-pool.html

## 维护原则

- 前端仍保持短路径：默认常用词 + 更多方向。
- 后台负责复杂匹配，不把家长带进专业目录迷宫。
- 用户输入的原词仍然参与搜索。
- 新增词优先改 policy，不改接口主流程。

## 不包含

- 不包含 /fenxi/
- 不包含 functions/fenxi/
- 不包含 functions/_middleware.js
