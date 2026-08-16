# AIPLuS Family Decision Workbench · durable status

This file is the durable cross-session owner for the AIPLuS **家庭决策工作台** release line. Chat history is not the source of truth. Every future maintainer/conversation must read this file from the exact PR head and continue the first incomplete package.

## Release line

- Repository: `cashen/gaokao`
- Base branch: `main`
- Base SHA at program start: `c616ae4c86e83d5a6a568114de45f158ec24c9bc`
- Program branch: `agent/aiplus-family-decision-workbench`
- PR: created as Draft after this status file exists
- Existing public release at start: `v3.9.90.1 / v3990_1`
- Final release identity: **must be derived atomically from the canonical release owner during implementation; do not create a local AIPLuS-only release identity.**

## Product mission

AIPLuS must move from a conversation-first high-school-admissions assistant to a family decision workbench. The primary product object is one family's admissions decision, not an isolated message. Conversation remains an input/output surface; deterministic admissions facts, official evidence and existing AIPLuS tools remain the execution layer.

The family should always be able to understand:

1. the child's confirmed situation;
2. what has already been decided;
3. which decision stage still needs work;
4. what evidence is reliable, incomplete or only experiential;
5. the single most useful next action;
6. the current decision book / plan state;
7. what must be audited before the plan is considered reviewed.

## Mandatory architecture

Existing owners remain singular:

- family/workspace state: existing `shared/ai/ai-workspace-model.v3992_0.js` + existing workspace contract/event owner;
- current temporary candidate/query view: existing `activeView`;
- current task/focus/context: existing `agentContext`;
- explicit family decision profile: existing `decisionProfile.explicit`, extended only through the workspace schema owner;
- hard constraints: existing `hardConstraints`;
- soft preferences: existing `softPreferences`;
- turn execution: `functions/_lib/ai/turn-orchestrator.js`;
- bounded evidence planning: `functions/_lib/ai/evidence-plan.js`;
- deterministic admissions/history/background/official/experience facts: existing owners;
- next action: existing `functions/_lib/ai/next-action-engine.js`, upgraded rather than replaced;
- browser/workspace/history/rendering: existing AIPLuS owners;
- release identity: `shared/resources/release/current-release.js`.

New mechanisms must remain projections or bounded helpers, not second truth/state owners:

- Decision Progress: pure projection `workspace -> progress`; never persisted as a competing state machine.
- Decision Book: pure projection `workspace -> parent-facing book`; never copy facts into a second report truth store.
- Reflection: one bounded, non-mutating post-execution analysis of resolved gaps/conflicts/evidence gaps/next task; it must not invoke an unbounded agent loop or directly commit candidate state.

## Product-level invariants

- remembered context is not execution authority;
- only explicit filter language may mutate the candidate active view;
- AI/model text never becomes a hard family decision without explicit user confirmation;
- deterministic admissions truth remains deterministic;
- official/source scope and fail-closed boundaries remain intact;
- no AI admission probability or invented matching percentage;
- Decision Progress and Decision Book must not issue network requests merely by opening/rendering them;
- ordinary parent UI must not expose model/provider/runtime/debug terminology;
- PC/Pad/Android share one business state model; responsive UI may differ only in presentation/disclosure;
- no new scroll owner, observer chain or `scrollIntoView` patch may be introduced to compensate for layout ownership.

## User-visible decision journey

The parent-facing progress model has six stages. These are **not** a replacement for internal task/execution `DECISION_STAGES`; they are deterministically derived from workspace facts and explicit decisions.

1. `score_position` — score/rank position is known or explicitly deferred;
2. `major_direction` — professional directions are being explored/confirmed;
3. `school_major` — concrete school-major pairs are being researched;
4. `family_tradeoff` — employment/study duration/region/cost/work-environment trade-offs are explicit enough to reason about;
5. `plan` — a family selection snapshot exists and is being shaped;
6. `audit` — plan review has run and blocking gaps are surfaced/resolved.

No fake completion percentage. Each stage may be `not_started`, `exploring`, `ready`, `confirmed`, or `reviewed` only when deterministic evidence supports it.

## Parent-facing state model extension

`decisionProfile.explicit` may be extended to persist only explicitly stated information such as:

- career targets;
- student/work-environment signals: programming acceptance, factory/production-line tolerance, shift-work tolerance, field-site tolerance, travel tolerance, hands-on preference;
- existing primary goal/priorities/family-resource sensitivity/study-duration tolerance.

Do not infer personality, ability, MBTI, family resources or career suitability from ambiguous language.

`decisions[]` should become a small typed ledger with only a few parent-meaningful statuses such as `keep`, `reject`, `pending`. A recommendation from the assistant is not a saved decision; only explicit user confirmation or an explicit UI action may create one.

## UI target

### PC >= 960px

- left rail becomes **家庭决策导航**, not a permanently dominant History rail;
- show child summary, six-stage progress, unresolved count, Decision Book entry, then History as a secondary entry;
- right side remains the canonical conversation/result renderer.

### Pad 720-959px

- decision rail collapses to one compact `我的决策` entry/drawer;
- same view model and actions as PC; no separate business rules.

### Mobile < 720px

- compact child/progress strip above the conversation;
- `我的决策` opens a full-height sheet/drawer containing profile, progress, confirmed decisions, unresolved gaps, Decision Book and History;
- no horizontal overflow; long data remains progressively disclosed.

### Normal UI language

Remove from ordinary parent UI:

- provider/model names;
- model probe button;
- semantic/runtime/agent/debug vocabulary;
- healthy-system status noise.

Only user-impact degradation may be shown, e.g. `部分解释能力暂时不可用，招生分数查询仍可继续`.

## Answer hierarchy

For complex answers:

1. direct answer;
2. `这对你意味着什么` using confirmed family context only;
3. detailed evidence / full data behind progressive disclosure;
4. one primary next action + at most two weaker alternatives.

Do not render three equal-weight next-step buttons when one task is structurally more useful.

## Work package ledger

Status values: `TODO`, `IN_PROGRESS`, `DONE`, `REOPENED`.

| Package | Status | Required outcome |
|---|---|---|
| FDW-00 | **IN_PROGRESS** | Durable architecture/status owner, Draft PR, exact current-owner audit, package merge gate |
| FDW-01 | TODO | Workspace schema extension + backward migration; explicit career/student signals and typed decisions; no lost history/selection |
| FDW-02 | TODO | Pure Decision Progress projection + deterministic stage matrix |
| FDW-03 | TODO | Pure Decision Book projection; evidence/gap statuses; no network/report truth duplication |
| FDW-04 | TODO | Bounded non-mutating post-execution reflection |
| FDW-05 | TODO | Upgrade existing next-action owner to 1 primary + <=2 alternatives using progress/reflection |
| FDW-06 | TODO | PC decision rail + History demotion + parent-facing copy hierarchy |
| FDW-07 | TODO | Pad/mobile disclosure using same state/view model; no device business state machine |
| FDW-08 | TODO | Remove engineering UI from normal parent surface; degradation copy only |
| FDW-09 | TODO | Separate `开始新话题` from `新建另一份家庭档案`; preserve family decision state across topics |
| FDW-10 | TODO | Plan/audit closure: selection snapshot -> deterministic plan review -> blocking gaps/decision-book result |
| FDW-QA | TODO | Full source/unit/migration/semantic/browser/viewport/AEK/history/major-region/selection/release proof |

A package is not `DONE` merely because implementation exists. It must have targeted tests and no known contradictory production/QA evidence. Later counterexamples reopen the owning package rather than weakening assertions.

## Mandatory human journeys

1. `578分，普通家庭，本科就业优先，不太想考研` -> explicit family state; progress says major direction unresolved; no silent candidate mutation beyond explicit score semantics.
2. `电气、自动化、机械怎么选` -> multi-direction exploration; next action advances the decision rather than presenting three equal-weight generic questions.
3. `不接受倒班` -> explicit work-environment signal; no automatic deletion of mechanical/electrical candidates.
4. `编程可以接受` -> explicit signal added without overwriting unrelated family conditions.
5. `那如果我愿意读研呢` -> only study-duration preference changes; other confirmed conditions remain.
6. `沈工大电气和大连交通自动化怎么选` -> concrete school-major pairs appear in the Decision Book/progress projection.
7. `我578现实吗` -> only this explicit current turn activates score/reachability evidence; remembered score alone never does.
8. import a non-empty family selection -> plan stage becomes in progress; system must not claim completion.
9. `帮我最后检查` -> plan review exposes structural duplicates/gaps/constraint conflicts/evidence gaps without invented admission probability.
10. start a new topic -> family profile/confirmed decisions survive, current school/major task focus resets; create another family profile -> separate workspace.

## UI/viewport acceptance

- normal mode: zero provider/model names and zero model-test controls;
- healthy system: no health/debug panel competing with parent decisions;
- one strong primary next action per answer; <=2 alternatives;
- no horizontal overflow at representative Android widths;
- PC/Pad/mobile use one Decision Progress/Book projection;
- updating progress/profile/rail must not steal the conversation scroll anchor;
- completion keeps the existing conversation viewport transaction/scroll contract; no second scroll owner.

## Regression families that must remain green

- AEK canonical/ambiguity/freshness/context-firewall journeys;
- permanent human semantic/routing/school-topic/major-topic matrices;
- candidate discovery/refinement and `remembered context != execution authority`;
- school research/official/experience/history/school-major history;
- major-region history full pagination/truth-set tests;
- region school directory;
- background resources;
- selection/family-plan import and review;
- conversation scroll/viewport PC/Pad/Android;
- architecture handoff/site runtime/release coherence;
- protected paths `/fenxi/`, `functions/fenxi/`, `functions/_middleware.js` untouched;
- `functions/_lib/release-contract.js` retains both required exports.

## Release gate

Do **not** merge after only P0 or one green workflow.

Required sequence on one final candidate:

1. implementation complete through FDW-10 + FDW-QA;
2. remove temporary construction artifacts;
3. full Draft checks green;
4. exact-head immutable Cloudflare Preview verified;
5. PC/Pad/Android human journeys verified on exact head;
6. freeze final head SHA;
7. mark Ready without changing SHA;
8. second complete Ready validation on that same SHA;
9. merge using `expected_head_sha`;
10. verify new `main`, all push workflows, Cloudflare Production exact main SHA, Pages/custom domain and live AIPLuS journeys.

A merged PR without production closure is not DONE.

## Continuation instruction

After any interruption:

1. fetch latest `main` and this PR/head;
2. read root `AGENTS.md`, Eastern Philosophy, Unified Site Release, `START-HERE.md`, AEK skill/status and this file;
3. inspect exact diff/checks;
4. continue the first `TODO/IN_PROGRESS/REOPENED` work package;
5. update this ledger after meaningful progress;
6. do not create a replacement branch/PR merely because the chat session changed.
