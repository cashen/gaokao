# 同学你好：本科→研究生升学路径计划（v001）

## 目标

在“同学你好”的专业查询结果中，补充一段轻量的“本科 → 研究生”升学导航，让用户先了解：

- 当前本科专业在国家本科目录中的身份；
- 可继续查看的研究生学术学位方向；
- 可继续查看的专业学位方向；
- 这些方向只是导航，不是教育部发布的一一对应表，也不是某所学校的报考承诺。

学生留言继续表达个人学习与生活体验；升学路径属于结构化、目录驱动的信息，两者在页面上明确分开。

## 资源与所有权

1. 唯一复用 `shared/resources/majors/undergrad-graduate-pathway.v001.js` 的 `buildUndergradGraduatePathway()`，不在 Tongxue 复制本科专业—研究生映射。
2. 研究生目录实体与专业学位领域继续由现有 graduate catalog owner 提供。
3. 本科专业身份必须沿用 Tongxue 当前已确认的 canonical major code/name；无法确认时保持 fail-closed，不猜测。
4. Tongxue 只做紧凑展示与返回“专业升学地图”的入口；完整路径仍由 `/major-path/` 负责。
5. 不改变全站 canonical release `v3.9.90.2 / v3990_2`，不创建孤立的站点版本；新增能力版本只作为 Tongxue 能力标记。

## 页面方案

专业结果顺序固定为：

1. 已有“先看懂这个专业”源站解读；
2. 新增“本科 → 研究生路径”；
3. 学生留言与来源说明。

路径区分“学术学位方向”和“专业学位方向”，优先展示目录名称、代码和专业学位领域；方向不足时给出“当前暂无可核验路径”的平静说明，不把缺少映射写成“不能考研”。

同时提供“查看完整专业升学地图”入口，并携带 canonical major code/name 与安全的 `returnTo=/tongxue/`。

## 边界文案

页面明确说明：教育部未发布本科专业到研究生一级学科/专业学位类别的一一对应表；最终可报专业、考试科目、前置专业要求和招生条件，以目标院校当年硕士招生专业目录为准。

## 来源呈现与知识产权

专业解读的源站归属必须保留，但采用“必要归属、最小呈现”：

- `eo.srgaoxiao.cn`、抓取日期和原站链接不放在专业结果主内容区，不形成大块重复的来源说明；
- 这些归属信息只放在 Tongxue footer，并在专业范围且资料成功读取后按需显示；
- 主界面保留真正帮助判断的专业字段、升学方向和必要的官方目录依据；
- 学生留言与专业资料继续分开，避免把来源说明或版权信息伪装成学生体验内容。

## 开发与测试

- 修改 Tongxue 专业结果视图与同学你好页面样式/能力标记。
- 只新增共享展示适配，不新增第二份业务映射、缓存、状态机或导航 owner。
- 新增源代码审计：确认 Tongxue 复用共享 pathway owner、canonical identity、官方边界和完整地图入口；确认学校查询路径不受影响。
- 运行仓库架构、统一发布、人类文案、Tongxue/major-pathway 专项审计与 JavaScript 语法检查。
- 运行现有保护边界和相关浏览器验证；必要时增加真实 major query smoke journey。
- Draft PR 阶段验证 exact-head Preview；所有检查通过后才标记 Ready。
- Ready 后用最终 head SHA 合并，随后验证 main、GitHub Actions、Cloudflare Pages Preview/Production、自定义域名 HTML、版本化资源与 live major journey。

## 完成条件

- 计划文件已进入本 PR，PR 描述与本文件一致。
- major scope 能看到结构化本科→研究生导航，school scope 保持原行为。
- 专业解读源站归属只在 footer 按需显示，主结果区不再显示 `eo.srgaoxiao.cn` 与抓取日期的大块来源说明。
- 所有学术/专业方向来自共享 owner，未复制映射。
- canonical major code/name 与回链安全校验通过。
- 既有保护路径未改变，相关测试全部通过。
- Preview 与 Production 均由最终 exact SHA 验证，最终合并到 `main`。
