# Human Copy + Major Knowledge v001

Status: Phase 0 Foundation

Base:
- main: 68c16db325cac6f3ece0c1a782f5d8212113c419
- branch: feature/human-copy-major-knowledge-foundation-v001

## Product goal

将站点从“工具式输出”升级为“面向高中生和家长的高考决策助手”。

表达原则：

- 先解释问题，再给数据。
- 使用家长能理解的语言。
- 不描述模型、流水线、内部实现。
- 不使用保证录取、精准预测等误导表达。

---

# Plan A: Human Copy Foundation

## A0 Foundation

- 建立统一文案规范。
- 建立可见文案审计规则。
- 统一 loading / empty / error / result 状态语言。

## A1 ln-rank

目标：

让分数、位次、学校推荐更像老师解释。

重点：

- 结果页标题。
- 风险提示。
- 专业解释入口。

## A2 Tongxue

目标：

学校画像从百科描述转为家长视角。

结构：

- 这是什么学校。
- 优势方向。
- 适合关注什么。
- 需要注意什么。
- 学生真实体验。

## A3 AIPLuS

目标：

从聊天机器人变成家庭顾问。

统一回答结构：

- 先说结论。
- 再解释原因。
- 最后提示家长关注点。

## A4 UI 文案

覆盖：

- button
- loading
- empty
- error
- tooltip

---

# Plan B: Major Knowledge Foundation

## B0 Major Knowledge Owner

建立唯一专业知识来源。

禁止：

- AIPLuS 自建专业解释。
- Tongxue 自建专业解释。
- ln-rank 自建专业解释。

## B1 Major Contract

专业知识结构至少包含：

- 专业是什么。
- 大学学什么。
- 主要课程。
- 毕业做什么。
- 就业方向。
- 适合什么学生。
- 注意事项。

## B2 AIPLuS Integration

回答专业问题时：

专业解释 → 学校匹配 → 历史数据 → 学生反馈。

## B3 Tongxue Integration

学校专业页面增加：

- 本专业介绍。
- 学习内容。
- 学生体验。

## B4 ln-rank Integration

专业选择页面增加：

- 专业解释。
- 就业方向。
- 历史录取信息。

---

# Validation requirement

必须：

Draft PR
→ checks
→ Preview exact SHA
→ Ready
→ same SHA checks
→ expected_head_sha merge
→ main verification
→ Production verification

不允许在未完成验证前合并。
