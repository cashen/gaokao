# AIPLuS Family Decision Workbench · durable status
## Current main snapshot (2026-08-24 audit)

- Latest canonical `main`: `ffc080979341f7a4dfb593986bc791aef3bfb076`.
- Audit baseline had no open PR; the five existing Production status checks on that SHA were green.
- Whole-site public release identity is `v3.9.90.2 / v3990_2 / 3990_2`; capability-local identities below remain subordinate and are not separate site releases.
- The historical PR/SHA entries in this file remain evidence only. Any new change starts from the latest `main` and follows the unified Draft → exact Preview → Ready same-SHA → merge → Production protocol.


This file is the durable cross-session owner for the AIPLuS **家庭决策工作台** release line. Chat history is not the source of truth. Every future maintainer/conversation must read this file from the exact PR head before continuing release work.

## Release line

- Repository: `cashen/gaokao`
- Base branch: `main`
- Program branch: `agent/aiplus-family-decision-workbench`
- Draft PR: `#166`
- Program base at start: `c616ae4c86e83d5a6a568114de45f158ec24c9bc`
- Existing public/site release remains `v3.9.90.2 / v3990_2`.
- Existing visible AIPLuS product/browser compatibility identity remains `v0.02 / aiplus-assets-v002_4`.
- Family Decision Workbench is an additive AIPLuS capability/cache subtransaction: `aiplus-family-decision-v0.03 / fdw=003_0`.
- It does **not** create a second site release owner, workspace, history store, renderer, admissions truth set, agent loop or device-specific business state machine.
- All construction workflows/patchers named `tmp-aiplus-fdw-*` are forbidden from a formal candidate; permanent FDW CI asserts they are absent.

## Product mission

AIPLuS is no longer only conversation-first. The primary product object is one family's admissions decision. Conversation remains the input/output surface; deterministic admissions facts, authoritative evidence and existing AIPLuS tools remain the execution layer.

The parent-facing product must make these states understandable without engineering vocabulary:

1. the child's confirmed situation;
2. what has been explicitly decided;
3. which decision stage still needs work;
4. which evidence is reliable, incomplete or experiential;
5. the single most useful next action;
6. the current Decision Book / plan state;
7. what must be audited before a plan is considered reviewed.

## Canonical ownership

Existing owners remain singular:

- family/workspace state: `shared/ai/ai-workspace-model.v3992_0.js` plus the existing workspace contract/event owner;
- current temporary candidate/query view: existing `activeView`;
- current task/focus/context: existing `agentContext`;
- explicit family profile: existing `decisionProfile.explicit`, extended only through the workspace schema owner;
- hard/soft family constraints: existing `hardConstraints` / `softPreferences`;
- turn execution: `functions/_lib/ai/turn-orchestrator.js`;
- bounded evidence planning: `functions/_lib/ai/evidence-plan.js`;
- deterministic admissions/history/background/official/experience facts: existing owners;
- final plan audit: existing `functions/_lib/ai/selection-review.js`, extended rather than replaced;
- next action: existing `functions/_lib/ai/next-action-engine.js`, upgraded rather than replaced;
- browser/workspace/history/rendering: existing AIPLuS owners;
- site release identity: `shared/resources/release/current-release.js`.

New mechanisms are projections/helpers, not competing truth owners:

- Decision Progress: pure `workspace -> progress` projection; never persisted as a second state machine.
- Decision Book: pure `workspace -> parent-facing book` projection; never copies facts into a second report truth store.
- Reflection: one bounded, non-mutating post-execution analysis; it never auto-executes a second tool loop or directly mutates candidate state.

## Product invariants

- remembered context is not execution authority;
- only explicit filter language may mutate the candidate active view;
- model text never becomes a hard family decision without explicit user confirmation;
- deterministic admissions truth remains deterministic;
- official/source-scope and fail-closed boundaries remain intact;
- no AI admission probability or invented matching percentage;
- Decision Progress and Decision Book do not issue network requests merely by opening/rendering;
- ordinary parent UI exposes no provider/model/runtime/debug controls;
- PC / Pad / Android share one business state model; responsive differences are presentation/disclosure only;
- no new scroll owner, observer chain or `scrollIntoView` patch compensates for unclear viewport ownership;
- `新话题` preserves family profile/constraints/decisions/history evidence while clearing temporary school/major/region/project-scope focus;
- only `新建另一份家庭档案` creates an independent workspace;
- starter-score defaults are owned by the current workspace, never by stale DOM input from another family profile;
- background evidence direction / professional cluster is not an admissions-major identity and must never be sent to admissions history as if it were one;
- nullable score summaries must never render as `最低0分 / 最高0分`.

## Parent-facing decision progression

The six stages are deterministic projections from workspace facts and explicit decisions; they do not replace internal task/execution stages:

1. `score_position`
2. `major_direction`
3. `school_major`
4. `family_tradeoff`
5. `plan`
6. `audit`

No fake completion percentage. Stage states may be `not_started`, `exploring`, `ready`, `confirmed`, or `reviewed` only when deterministic evidence supports them.

## Final implementation ledger

Status values: `DONE` or `REOPENED`. A later production/system counterexample reopens the owning row; assertions must not be weakened to keep a green badge.

| Package | Status | Verified outcome |
|---|---|---|
| FDW-00 | **DONE** | One durable architecture/status owner, Draft PR, protected/no-temp gates and canonical-owner audit |
| FDW-01 | **DONE** | Workspace schema/backward migration; explicit career/student signals and typed decisions preserve unrelated family state |
| FDW-02 | **DONE** | Pure six-stage Decision Progress projection; no persisted second state machine |
| FDW-03 | **DONE** | Pure Decision Book projection; no second report truth store |
| FDW-04 | **DONE** | Bounded non-mutating reflection; no autonomous second tool loop |
| FDW-05 | **DONE** | Existing next-action owner yields exactly one primary next action and at most two alternatives; local research/retry keeps priority |
| FDW-06 | **DONE** | PC family decision navigation + History demotion + parent-facing language |
| FDW-07 | **DONE** | Pad/mobile drawer and compact strip reuse the same Decision Progress/Book view model; no device business fork |
| FDW-08 | **DONE** | Ordinary parent UI no longer exposes healthy-system/model/provider/probe engineering controls |
| FDW-09 | **DONE** | New topic vs new family profile separated; cross-family starter-score DOM leakage removed |
| FDW-10 | **DONE** | Existing selection review extended with family-aware structural/blocking gaps without invented admission probability |
| FDW-QA | **DONE** | Full source/semantic/history/AEK/selection/release/exact-Preview/PC-Pad-Android proof completed on pre-ledger final implementation head |

## System counterexamples closed during QA

### Compact entity routing

A user feedback Log exposed a systemic gap where short turns such as `650分`, `电气`, `沈阳`, `沈工大` could identify an entity but fall to `general_advice` or the misleading `feasible_set` stage.

The fix lives in the existing canonical route chain, not in UI phrase patches. Permanent `tools/verify-aiplus-routing-grid-v001.mjs` now covers compact score/region/major/school/school-major combinations plus context-aware drill-down and provider non-override for high-confidence compact turns. Examples include:

- `650分` -> rank/context owner;
- `沈阳` -> region directory or candidate refinement according to active context;
- `沈工大` -> school research, never an implicit school filter;
- `沈工大 电气` -> school-major history;
- `650分 沈工大 电气` -> explicit fit assessment;
- prior school / prior major contexts keep the correct deterministic drill-down owner.

### Background direction is not an admissions major

User feedback on `沈阳工业大学哪些专业更有底子` exposed that background labels such as `电机电器与装备制造` / `材料加工与工业控制` were being flattened into a `major` field and later reused as an admissions-history query.

The class was fixed at the shared background contract and downstream consumers:

- background direction remains a direction/professional-cluster concept;
- the same truth source exposes the real `admissionMajors` underneath it;
- next actions and rendered CTA use only real admissions-major names;
- a user who manually asks a known direction name for scores receives a premise correction and real admissions-major options instead of a fake zero-score result;
- empty/null score summaries remain null-safe and never display `最低0分 / 最高0分`;
- complete presentation blocks are permanently asserted, not only the primary answer.

### Exact Preview readiness race

The exact Preview gate previously could resolve the Cloudflare Pages check before Functions were fully ready, causing an initial HTTP 404 on `/api/ai/turn` even though the immutable deployment became healthy seconds later.

The existing parent-decision workflow now applies bounded `--retry-all-errors` to the exact-Preview POST/major-history probes after the SHA/readiness boundary. This is a release-gate readiness correction, not a product retry loop and not an unbounded retry storm.

## Formal implementation proof before this ledger-only commit

Pre-ledger final implementation head:

- SHA: `feeca9930f76bf76f8084743769becc5d48ae3e2`
- Cloudflare immutable Preview: `https://2c621588.gaokao-4y9.pages.dev`
- Cloudflare Pages check: success and exact commit `feeca993`.
- PR workflows: **14/14 completed successfully**.
- `Verify AIPLuS parent decision v0.03`: success, including permanent human/routing/school-topic/major-topic matrices and exact-Preview API journeys.
- `Verify AIPLuS family decision workbench v0.03`: success.
- `Verify AI decision workspace v3990_1`: success; exact Preview smoke succeeded; Chromium browser ran PC / Pad / Android human semantic journeys and four-viewport mocked parent journeys successfully.
- `Verify AI major-region history v3992_3`: success.
- Worker Preview, region directory, UI geometry, canonical release, LN final, production API health, unified resource graph/runtime, native chooser and architecture handoff: success.

This status-file update changes the PR head SHA. Therefore the evidence above proves the implementation content but **does not authorize merge of the new ledger head by inheritance**. The ledger-only head must receive a fresh complete Draft/exact-Preview/browser proof before it can be frozen.

## Mandatory human journeys retained

1. `578分，普通家庭，本科就业优先，不太想考研` -> explicit family state without silent candidate mutation beyond explicit score semantics.
2. `电气、自动化、机械怎么选` -> multi-direction exploration with one structurally strongest next action.
3. `不接受倒班` -> explicit work-environment signal; no automatic candidate deletion.
4. `编程可以接受` -> explicit signal added without erasing unrelated family conditions.
5. `那如果我愿意读研呢` -> only study-duration preference changes; other confirmed conditions remain.
6. `沈工大电气和大连交通自动化怎么选` -> concrete school-major pairs in Decision Book/progress projection.
7. `我578现实吗` -> only the explicit current turn activates score/reachability evidence; remembered score alone does not.
8. import a non-empty family selection -> plan stage becomes in progress; no false completion.
9. `帮我最后检查` -> existing plan review surfaces structural duplicates/gaps/constraint conflicts/evidence gaps without invented admission probability.
10. new topic preserves family truth and clears temporary query focus; another family profile starts independently with no inherited starter score/UI state.
11. `沈阳工业大学哪些专业更有底子` -> background directions are labeled as directions and real admissions majors are the only score-query CTA.
12. manually asking `沈阳工业大学电机电器与装备制造多少分` -> premise is corrected; no `最低0分 / 最高0分` wording.

## UI/viewport acceptance retained

- zero provider/model names and zero model-test controls in normal mode;
- healthy-system/debug state does not compete with family decisions;
- one strong primary next action; at most two alternatives;
- no horizontal overflow at representative Android widths;
- PC/Pad/mobile reuse one Decision Progress/Book projection;
- 1024px Pad uses the decision drawer contract;
- new independent family profile does not inherit a previous family's starter score through DOM state;
- progress/profile/rail updates do not steal the conversation scroll anchor;
- no second viewport/scroll owner.

## Regression families that remain merge gates

- AEK canonical/ambiguity/freshness/context-firewall journeys;
- permanent human semantic/routing/school-topic/major-topic matrices;
- candidate discovery/refinement and `remembered context != execution authority`;
- school research/official/experience/history/school-major history;
- major-region full pagination/truth-set tests;
- region school directory;
- background resources and direction/admissions-major identity boundary;
- selection/family-plan import and review;
- conversation scroll/viewport PC/Pad/Android;
- architecture handoff/site runtime/release coherence;
- protected paths `/fenxi/`, `functions/fenxi/`, `functions/_middleware.js` untouched;
- `functions/_lib/release-contract.js` retains both required exports.

## Stacked PR #168 dependency

PR `#168` (`agent/aiplus-decision-workspace-vnext`) is the single follow-up local feedback Log increment. It is intentionally stacked on #166 and must not create another Decision Workspace/Progress/Book owner.

At the time of the pre-ledger proof its old head was based on an earlier #166 commit and had diverged from the final #166 implementation. **After this #166 ledger head passes Draft proof and is frozen, #168 must be rebuilt exactly on that frozen #166 head, preserving only its feedback-Log delta, then complete its own Draft/exact-Preview/browser/Ready proof.**

Per the release-line agreement, neither #166 nor #168 may enter `main` until both final candidates have completed their required proof.

## Release gate

A merged PR without production closure is not DONE.

Required sequence from this ledger commit onward:

1. run the complete formal Draft checks on the new #166 ledger head;
2. verify exact-head immutable Cloudflare Preview and PC/Pad/Android journeys;
3. freeze #166 final head SHA;
4. rebuild #168 onto that frozen #166 head with only the feedback-Log delta;
5. complete #168 Draft + exact-head Preview + PC/Pad/Android/combo regressions;
6. freeze #168 final head SHA;
7. mark #166 and #168 Ready without changing either frozen head SHA and complete second-round validation;
8. only after both Ready candidates are green, merge #166 using `expected_head_sha`;
9. retarget/revalidate #168 against new `main` without changing its head SHA, then merge #168 using `expected_head_sha`;
10. verify new `main`, all push workflows, Cloudflare Production exact main SHA, Pages/custom domain and live AIPLuS journeys.

## Continuation instruction

After any interruption:

1. fetch latest `main`, PR #166 and PR #168;
2. read root `AGENTS.md`, Eastern Philosophy, Unified Site Release, `START-HERE.md`, AEK skill/status and this file;
3. inspect exact heads, diffs and checks;
4. continue from the first real red gate; fix the owning class rather than a phrase/device symptom;
5. never infer completion from a prior SHA after a new commit;
6. do not create replacement active owners merely because the chat session changed.