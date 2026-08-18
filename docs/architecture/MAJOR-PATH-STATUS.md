# 专业升学地图 v0.01 · durable status

本文件是 `/major-path/` 独立页面、研究生国家目录 owner 与本科→研究生升学导航关系 owner 的跨会话状态账本。

## Product job

帮助家长把三个不同层级分开理解：

1. 高考实际报考的 **本科专业**；
2. 研究生阶段的 **一级学科（学术学位）**；
3. 研究生阶段的 **专业学位类别**，以及仅在国家现行材料明确点名时展示的专业领域。

页面不把本科专业和硕士专业伪装成一一对应，也不生成录取概率、考研成功率、学校推荐或就业预测。

## Canonical owners

- 本科专业目录：继续复用现有 `ln-rank/kb/major-understanding/major-catalog-2026.generated.js`，883 个本科专业；不复制第二份本科目录。
- 本科专业解释：继续复用 `ln-rank/js/knowledge/major-understanding-resolver.js`；没有可靠解释时只展示国家目录身份，不补写未经验证的课程/就业事实。
- 研究生国家目录：`shared/resources/graduate/graduate-catalog-2022.v001.js`。
- 本科→研究生导航关系：`shared/resources/majors/undergrad-graduate-pathway.v001.js`。
- 页面：`major-path/index.html` + `major-path/app.v001.js` + `major-path/major-path.v001.css`。

## Source policy

研究生国家目录只使用国务院学位委员会/教育部《研究生教育学科专业目录（2022年）》；该目录自 2023 年起实施。

目录调整兼容参考教育部办公厅 2025 年《有关学科专业调整对应关系表》等通知。

六位专业领域不做全量静态猜测。v0.01 仅对教育部《2026年全国硕士研究生招生工作管理规定》明确点名的工程管理专业学位领域展示 `125601/125602/125603/125604`，并保留 2026 工作经历条件以及已公布的 2027 变化。

## Critical semantic boundary

教育部没有发布“883 个本科专业 → 研究生一级学科/专业学位类别”的全国统一一一对应表。

因此关系 owner 的语义是 **升学导航**，不是官方 crosswalk：

- `curated_navigation`：能从国家目录实体与稳定学科知识结构给出有意义的同领域/相关方向；
- `no_national_one_to_one`：不强行给代码，明确要求结合目标院校当年硕士招生目录核验。

任何后续维护都不得为了提高表面覆盖率，把“相关”升级成“官方对应”。

## UI contract

沿用 `tongxue` 的一致视觉策略：白底、深蓝主色、青绿色反馈、居中搜索、圆角卡片、低噪音信息层级。

- 搜索支持本科专业全名、代码和现有别名；
- 首页不制造“热门专业”榜，改为按教育部本科门类 → 专业类浏览；
- 结果固定按“本科身份 → 学术学位 → 专业学位 → 条件提醒 → 权威来源”阅读；
- PC/Pad/Android 复用同一 DOM 和业务状态，仅响应式布局变化；
- 不建立设备特有业务分支。

## Verification

- `tools/verify-major-path-v001.mjs`：883 本科专业全量状态、184 个研究生国家目录实体、代码唯一性、所有关系必须指向 canonical 研究生目录、代表案例与 source/UI contract。
- `tools/browser-major-path-v001.mjs`：本地 PC / Pad / Android / Android compact。
- `tools/browser-major-path-live-v001.mjs`：exact-head Preview 与 exact-main Production 的 PC / Pad / Android。
- `.github/workflows/verify-major-path-v001.yml`：Draft/Ready/Production release gate，Production durable status 为 `production/major-path-v0.01`。

## Release protocol

1. 基于最新 main 的隔离分支；
2. Draft fresh source + browser + exact-head Cloudflare Preview 全绿；
3. 冻结最终 head SHA；
4. Ready 不改变 SHA，再跑 fresh 第二轮；
5. 使用 `expected_head_sha` merge；
6. 合并后核验 main、push workflow、Cloudflare Production、`/major-path/` 三端真实行为以及 durable Production status。

v0.01 暂不修改 `ln-rank` 专业点击入口。独立页事实和交互闭环稳定后，后续接入只能复用上述 owners，不能复制目录或关系逻辑。
