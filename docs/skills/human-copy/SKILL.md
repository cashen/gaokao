# 人类文案 · Human Copy Foundation

This is a mandatory foundation skill for `cashen/gaokao` whenever a task can affect text that a student, parent or other site visitor may read.

It runs **after** `docs/skills/eastern-philosophy/SKILL.md` and before product-specific UI or release work.

## Why this skill exists

The site should sound like a useful person who understands the task, not like a model explaining how it generated an answer.

User-visible copy includes more than articles. It includes:

- page titles, headings and subtitles;
- buttons, links, tabs and filters;
- loading, empty, error and success states;
- cards, badges, hints and boundary notes;
- AIPLuS deterministic responses and model-facing presentation instructions;
- Tongxue summaries and student-comment explanations;
- generated reports and share text.

Technical names may remain in code, diagnostics and developer-only details. They should not leak into normal product copy merely because the implementation uses those terms.

## Source reference

This skill was designed after reviewing the public project `OUBIGFA/De-AI-Prompt-Enhancer-Writer-Booster-SKILL`, especially `de-AI-writing/SKILL.md` at upstream commit `b050eefa88af3709ec24fc0b353740ccb151f563`.

The upstream repository does not currently declare a repository license. Therefore this file is an independent product-specific adaptation of general writing principles rather than a vendored copy of the upstream text.

## Ownership

This skill is the **repository-wide writing principle**, not a second AIPLuS copy engine.

Existing product owners remain in place:

- `tools/audit-ai-human-copy-contract.mjs` remains the AIPLuS/diagnosis human-copy safety audit;
- existing AIPLuS prompt, validator, education-knowledge and presentation owners remain responsible for their own output contracts;
- `tools/audit-human-copy-v001.mjs` only verifies the cross-site foundation registration and current public-surface wording. It must not fork AIPLuS intent, answer composition or copy state.

If a product already has a canonical copy/prompt owner, improve that owner. Do not add a post-processing rewrite layer merely to make text “sound human”.

## Core rule

**Say what the person needs to know or do. Do not narrate the system's thinking process.**

A good line of UI copy should usually answer one of these questions:

- What is this?
- What will happen if I tap it?
- What did the site find?
- What is still uncertain?
- What should I check next?

If a sentence mainly explains that “the system”, “AI”, “the model”, “the pipeline” or “the evidence engine” is processing something, rewrite it from the user's point of view unless that technology itself is the subject.

## Mandatory writing rules

### 1. Prefer the user's language over implementation language

Use words a parent or student would naturally use.

Prefer:

- `大学生怎么说`
- `学生留言`
- `大家主要在说什么`
- `还需要确认`
- `没找到可展示的内容`

Avoid as normal UI labels:

- `公开评论` when the actual destination is student opinions;
- `provenance`;
- `证据管线` / `pipeline`;
- `模型总结` / `AI总结` when the useful information is simply a summary of student comments;
- internal version, cache, owner or orchestration terminology.

Technical wording may appear inside an explicitly developer-oriented diagnostic disclosure.

### 2. Do not make AI the narrator

Normal public copy must not contain assistant-style meta language such as:

- `作为AI` / `作为 AI`;
- `我会为你` when a direct action label works better;
- `接下来我们将`;
- `下面我们来看`;
- `让我们先`;
- `希望这能帮助你`;
- model knowledge-cutoff disclaimers in place of an actual source boundary.

AIPLuS may use first person sparingly when it genuinely reads like a human adviser in conversation, but it must not describe hidden reasoning, prompting, chain-of-thought or model mechanics.

### 3. Remove lecture scaffolding

Do not manufacture structure with stock transitions or teaching gestures.

Avoid repeated use of:

- `首先 / 其次 / 最后` when the sequence is obvious from layout;
- `值得注意的是`;
- `更关键的是`;
- `换句话说`;
- `总之`;
- `简单来说`;
- `本质上`;
- `拆一拆 / 盘一盘 / 捋一捋 / 划重点 / 敲黑板`.

These words are not globally forbidden in Chinese. The problem is mechanical repetition that makes the interface sound generated. Prefer the fact, consequence or action directly.

### 4. Do not over-explain a button

Buttons and links should name the destination or action in the shortest clear language.

Examples:

- `公开评论` → `大学生怎么说`
- `查看符合条件的专业` is clear and can stay.
- `查看来源站全部评论` → `去来源站看更多留言` when the context is student comments.

Do not put trust disclaimers, data methodology or implementation details inside a CTA.

### 5. Empty and failure states should be calm and specific

State what is known, what failed and whether the user can continue.

Prefer:

`暂时没有找到可展示的学生留言。学校名称已经确认，这不代表没人评价这所学校。`

Avoid:

`当前来源暂未形成可验证证据集合，系统不会强行补写。`

The latter describes implementation mechanics instead of the user's situation.

### 6. Boundaries stay precise, but plain

Admissions truth, official-source boundaries and uncertainty must never be softened merely to sound conversational.

Keep exact concepts such as:

- `2026辽宁物理类投档记录`;
- `不代表2027录取结果`;
- `不是学校官方结论`;
- `不同学校的专业体验不能混成一所学校的结论`.

Rewrite jargon, not facts.

### 7. Do not turn every paragraph into a mini essay

For longer copy:

- avoid consecutive paragraphs with the same “claim → explanation → summary sentence” shape;
- avoid ending every paragraph with an abstract conclusion;
- mix concise statements with fuller explanations according to information density;
- let concrete facts, examples or next actions end a section naturally.

### 8. AIPLuS answer-first rule

For model-assisted answers:

1. answer the parent's actual question first;
2. show the smallest amount of supporting evidence needed;
3. state important uncertainty in plain language;
4. offer the next useful action only when it follows naturally.

Do not open with process narration. Do not close with generic assistant phrases.

Good:

`大连交通大学自动化近年的辽宁物理类记录在这里。先看2026，再用2025、2024判断波动。`

Poor:

`好的，我来帮你详细分析一下。首先我们需要从多个维度进行综合判断。`

## Product-specific examples

### ln-rank → Tongxue

The school-review entry is a student-opinion destination. Its public action copy is:

- full: `看看这所学校的大学生怎么说`
- compact: `大学生怎么说`
- loading: `正在打开学生评价…`

Do not expose the old generic label `公开评论` as the CTA.

### Tongxue summary

When a summary exists, present the information as:

- `大家主要在说什么`
- `这些概括从哪来？`
- `几条有代表性的学生留言`

The implementation may internally call this `ai_summary` and `studentEvidence`; the page should not make the visitor learn those internal concepts.

## Review sequence before merge

For every touched user-facing surface:

1. Read the text in its actual UI context, not only as a source string.
2. Ask whether a parent/student can understand the action without knowing the architecture.
3. Remove model/process narration.
4. Remove unnecessary jargon and stock transition phrases.
5. Preserve official terms, factual boundaries and uncertainty.
6. Check PC, Pad and Android for CTA length, wrapping and hierarchy.
7. Run `node tools/audit-human-copy-v001.mjs`.
8. When AIPLuS/diagnosis output is touched, also run `node tools/audit-ai-human-copy-contract.mjs` and the relevant existing product verifier.
9. Re-read the final rendered journey once more after all tests pass.

## Non-goals

This skill does **not** require:

- removing every occurrence of the letters `AI` from the product;
- disguising the fact that AIPLuS uses AI where that is materially relevant;
- replacing precise admissions terminology with casual slang;
- adding literary style, internet slang or exaggerated friendliness;
- mechanically substituting synonyms to satisfy a blacklist.

The target is simple: **the product should read as a clear admissions tool built for people, not as an AI demo describing itself.**
