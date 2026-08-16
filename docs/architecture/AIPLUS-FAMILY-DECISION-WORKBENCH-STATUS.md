# AIPLuS Family Decision Workbench · durable status

This file is the durable cross-session owner for the AIPLuS **家庭决策工作台** release line. Chat history is not the source of truth. Every future maintainer/conversation must read this file from the exact PR head and continue the first incomplete package.

## Release line

- Repository: `cashen/gaokao`
- Base branch: `main`
- Base SHA at program start: `c616ae4c86e83d5a6a568114de45f158ec24c9bc`
- Program branch: `agent/aiplus-family-decision-workbench`
- Draft PR: `#166`
- Existing public/site release remains `v3.9.90.1 / v3990_1`.
- Existing visible AIPLuS product/browser compatibility identity remains `v0.02 / aiplus-assets-v002_4`.
- Family Decision Workbench is an additive AIPLuS capability/cache subtransaction: `aiplus-family-decision-v0.03 / fdw=003_0`. It does **not** create a second site release owner or pretend the whole site advanced generation.
- All construction workflows/patchers named `tmp-aiplus-fdw-*` were removed before the formal Draft candidate. Permanent FDW CI asserts they are absent.

## Product mission

AIPLuS moves from a conversation-first high-school-admissions assistant to a family decision workbench. The primary product object is one family's admissions decision, not an isolated message. Conversation remains an input/output surface; deterministic admissions facts, official evidence and existing AIPLuS tools remain the execution layer.

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
- final plan audit: existing `functions/_lib/ai/selection-review.js`, extended rather than replaced;
- next action: existing `functions/_lib/ai/next-action-engine.js`, upgraded rather than replaced;
- browser/workspace/history/rendering: existing AIPLuS owners;
- site release identity: `shared/resources/release/current-release.js`.

New mechanisms remain projections or bounded helpers, not second truth/state owners:

- Decision Progress: pure projection `workspace -> progress`; never persisted as a competing state machine.
- Decision Book: pure projection `workspace -> parent-facing book`; never copies facts into a second report truth store.
- Reflection: one bounded, non-mutating post-execution analysis of resolved gaps/conflicts/evidence gaps/next task; it does not invoke an unbounded agent loop or directly commit candidate state.

## Product-level invariants

- remembered context is not execution authority;
- only explicit filter language may mutate the candidate active view;
- AI/model text never becomes a hard family decision without explicit user confirmation;
- deterministic admissions truth remains deterministic;
- official/source scope and fail-closed boundaries remain intact;
- no AI admission probability or invented matching percentage;
- Decision Progress and Decision Book issue no network request merely by opening/rendering them;
- ordinary parent UI exposes no model/provider/runtime/debug controls;
- PC/Pad/Android share one business state model; responsive UI differs only in presentation/disclosure;
- no new scroll owner, observer chain or `scrollIntoView` patch compensates for layout ownership;
- `新话题` preserves the family profile/constraints/decisions/history evidence but clears temporary school/major/region/project-scope query focus;
- `新建另一份家庭档案` alone creates an independent workspace.

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

`decisionProfile.explicit` persists only explicitly stated information:

- career targets;
- student/work-environment signals such as programming acceptance, factory/production-line tolerance, shift-work tolerance, field-site tolerance, travel tolerance and hands-on preference;
- existing primary goal/priorities/family-resource sensitivity/study-duration tolerance.

Do not infer personality, ability, MBTI, family resources or career suitability from ambiguous language.

`decisions[]` is a small typed ledger with parent-meaningful `keep / reject / pending` statuses. A recommendation from the assistant is not a saved decision; only explicit user confirmation or an explicit UI action may create one. Legacy text-only decisions migrate fail-safe to `pending / note` rather than being upgraded into invented confirmed decisions.

## UI target

### PC >= 1101px

- left rail is **家庭决策导航**, not a permanently dominant History rail;
- show child summary, six-stage progress, Decision Book and confirmed/evidence sections; History/other family profiles remain secondary;
- right side remains the canonical conversation/result renderer.

### Pad 720–1100px

- decision rail collapses to one compact `我的决策` entry/drawer;
- the existing 1024×768 browser journey therefore exercises the drawer rather than a squeezed desktop rail;
- same Decision Progress/Book view model and actions as PC; no separate business rules.

### Mobile < 720px

- compact child/progress strip above the conversation;
- `我的决策` opens the same drawer content with profile, progress, confirmed decisions, unresolved gaps, Decision Book and history;
- no horizontal overflow; long data remains progressively disclosed.

### Normal UI language

Removed from ordinary parent UI:

- provider/model names;
- model probe button;
- semantic/runtime/agent/debug vocabulary;
- healthy-system status noise.

Only user-impact degradation may be shown by the owning answer/error surface.

## Answer hierarchy

For complex answers:

1. direct answer;
2. `这对你意味着什么` using confirmed family context only;
3. detailed evidence / full data behind progressive disclosure;
4. one primary next action + at most two weaker alternatives.

Do not render three equal-weight next-step buttons when one task is structurally more useful.

## Current implementation evidence

Permanent source owner: `tools/verify-aiplus-family-decision-workbench-v003.mjs`.

Verified during construction before this checkpoint:

- old workspace migration preserves workspace id, score/rank, turn history and selection snapshot;
- legacy free-text decisions migrate to safe pending notes;
- explicit `普通家庭 / 本科就业优先 / 不太想考研 / 不接受倒班 / 编程可以接受` persist without erasing unrelated conditions;
- canonical `parent-semantic-frame.js` now supports both `能接受编程` and `编程可以接受` word orders;
- typed decisions do not mutate candidate active view;
- Decision Progress has exactly six deterministic stages and is not persisted;
- Decision Book is a pure projection and is not persisted;
- reflection is bounded, non-mutating and cannot auto-execute tools;
- next action has exactly one primary action and at most two alternatives;
- `topic_started` preserves family truth while clearing temporary query focus/scope;
- server compaction retains explicit student signals and typed decisions;
- normal parent HTML has no health/model/probe controls;
- existing `selection-review.js` now audits duplicate school-major rows, explicit hard major/region conflicts, explicitly rejected school-major pairs and budget-sensitive missing tuition without inventing admission probability;
- live `turn-orchestrator.js` passes the current workspace into that existing plan-review owner;
- existing AIPLuS v0.02 UI audit, v0.02 product contract and human-dialog regression remained green after the additive FDW cache transaction;
- browser source gate was updated to remove dependencies on the retired engineering UI, use family starters, distinguish new topic vs new family profile and exercise PC/1024 Pad/Android through the existing browser owner.

This evidence is **not yet the final Draft proof**. The package rows below stay `IN_PROGRESS` until the clean no-temp exact head completes the formal PR workflows and exact-head Preview/browser gates.

## Work package ledger

Status values: `TODO`, `IN_PROGRESS`, `DONE`, `REOPENED`.

| Package | Status | Required outcome |
|---|---|---|
| FDW-00 | **IN_PROGRESS** | Durable architecture/status owner, Draft PR, exact current-owner audit, permanent no-temp merge gate; implementation exists, formal clean-head proof pending |
| FDW-01 | **IN_PROGRESS** | Workspace schema extension + backward migration; explicit career/student signals and typed decisions implemented/source-tested; formal clean-head proof pending |
| FDW-02 | **IN_PROGRESS** | Pure Decision Progress projection + deterministic stage matrix implemented/source-tested; formal clean-head proof pending |
| FDW-03 | **IN_PROGRESS** | Pure Decision Book projection implemented/source-tested; formal clean-head proof pending |
| FDW-04 | **IN_PROGRESS** | Bounded non-mutating post-execution reflection implemented/source-tested; formal clean-head proof pending |
| FDW-05 | **IN_PROGRESS** | Existing next-action owner upgraded to 1 primary + <=2 alternatives; source-tested; formal clean-head proof pending |
| FDW-06 | **IN_PROGRESS** | PC decision rail + History demotion + parent-facing copy implemented; exact Preview browser proof pending |
| FDW-07 | **IN_PROGRESS** | Pad/mobile drawer using same view model implemented; exact Preview 1024 Pad/Android proof pending |
| FDW-08 | **IN_PROGRESS** | Engineering UI removed from normal parent surface; exact Preview proof pending |
| FDW-09 | **IN_PROGRESS** | `新话题` separated from `新建另一份家庭档案`; source/browser gate updated; exact Preview proof pending |
| FDW-10 | **IN_PROGRESS** | Existing selection review extended with family-aware blocking gaps; source-tested; exact Preview/plan-import proof pending |
| FDW-QA | TODO | Full clean-head Draft + exact Preview + PC/Pad/Android + old semantic/history/AEK/selection/release proof |

A package is not `DONE` merely because implementation exists. Later counterexamples reopen the owning package rather than weakening assertions.

## Mandatory human journeys

1. `578分，普通家庭，本科就业优先，不太想考研` -> explicit family state; progress says major direction unresolved; no silent candidate mutation beyond explicit score semantics.
2. `电气、自动化、机械怎么选` -> multi-direction exploration; next action advances the decision rather than presenting three equal-weight generic questions.
3. `不接受倒班` -> explicit work-environment signal; no automatic deletion of mechanical/electrical candidates.
4. `编程可以接受` -> explicit signal added without overwriting unrelated family conditions.
5. `那如果我愿意读研呢` -> only study-duration preference changes; other confirmed conditions remain.
6. `沈工大电气和大连交通自动化怎么选` -> concrete school-major pairs appear in Decision Book/progress projection.
7. `我578现实吗` -> only this explicit current turn activates score/reachability evidence; remembered score alone never does.
8. import a non-empty family selection -> plan stage becomes in progress; system must not claim completion.
9. `帮我最后检查` -> existing plan review exposes structural duplicates/gaps/constraint conflicts/evidence gaps without invented admission probability.
10. start a new topic -> family profile/confirmed decisions survive while temporary school/major/region/project-scope focus resets; create another family profile -> separate workspace.

## UI/viewport acceptance

- normal mode: zero provider/model names and zero model-test controls;
- healthy system: no health/debug panel competing with parent decisions;
- one strong primary next action per answer; <=2 alternatives;
- no horizontal overflow at representative Android widths;
- PC/Pad/mobile use one Decision Progress/Book projection;
- 1024px Pad uses the decision drawer contract;
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

1. fetch latest `main` and PR #166;
2. read root `AGENTS.md`, Eastern Philosophy, Unified Site Release, `START-HERE.md`, AEK skill/status and this file;
3. inspect the exact PR head, complete diff and checks;
4. continue the first `TODO / IN_PROGRESS / REOPENED` package from real red evidence;
5. update this ledger after meaningful verified progress;
6. do not create a replacement branch/PR merely because the chat session changed.
