# AIPLuS 决策聚焦 v0.06 · durable status
## Current main snapshot (2026-08-24 audit)

- Latest canonical `main`: `ffc080979341f7a4dfb593986bc791aef3bfb076`.
- Audit baseline had no open PR; the five existing Production status checks on that SHA were green.
- Whole-site public release identity is `v3.9.90.2 / v3990_2 / 3990_2`; capability-local identities below remain subordinate and are not separate site releases.
- The historical PR/SHA entries in this file remain evidence only. Any new change starts from the latest `main` and follows the unified Draft → exact Preview → Ready same-SHA → merge → Production protocol.


This file is the durable cross-session owner for the additive AIPLuS **Decision Focus / 决策聚焦** capability. It is a product projection and release gate, not a second family state machine or admissions truth source.

## Product job

AIPLuS already knows how to research schools, majors, admissions facts and bounded official evidence. v0.06 changes the parent-facing job from “keep researching more things” to:

1. put the concrete school × major choices next to each other;
2. show which dimensions have direct evidence, only school-level/general reference, or no evidence;
3. identify the single unresolved fact or family tradeoff most likely to change the decision;
4. show that unresolved item as a blocker in the existing six-stage Decision Progress;
5. let the parent explicitly mark an option `先保留 / 还要核实 / 暂不考虑` through the existing `decision_saved` owner.

There is deliberately **no composite recommendation score, admission probability, AI fit percentage or new shortlist store**.

## Canonical ownership

Existing owners remain singular:

- family truth: existing AIPLuS workspace;
- explicit family decisions: existing `workspace.decisions` + `decision_saved` event;
- admissions facts: existing deterministic admissions/history owners;
- official claims: existing typed `claim-evidence.js` subject/source-scope contract;
- Selection Pool: existing ln-rank Selection Pool;
- Decision Progress: existing `shared/ai/decision-progress.v003.js` projection;
- Decision Book: existing `shared/ai/decision-book.v003.js` projection;
- next action: existing `functions/_lib/ai/next-action-engine.js`;
- browser rendering: existing `aiplus/render.v3992_0.js`;
- browser orchestration: existing `aiplus/app.v3990_2.js`.

New canonical helper:

- `shared/ai/decision-focus.v006_1.js` — one pure `workspace/result -> pair evidence matrix + decision gaps` projection.

It may read existing task results/typed claims/selection snapshot but it may not fetch, persist, write local storage, mutate candidate filters or create another fact store.

## Evidence semantics

For a school × major decision:

- `school_major` claim bound to the exact pair = direct evidence;
- `school` claim = school-level reference only;
- `major_national` claim = general major reference only;
- a school-level or national-major claim must never be upgraded to a school-major conclusion;
- a remembered score by itself is not school-major admissions evidence;
- exact 2026 deterministic school-major score/rank records may satisfy the admissions-position dimension;
- when a dimension is explicitly important to the family, school-level/general reference remains an unresolved gap until direct evidence exists or the product honestly says it cannot be obtained.

## Decision Gap priority

The projection ranks unresolved work without inventing a recommendation score. Current order is structural:

1. explicit hard family conflict;
2. a currently requested/important missing decision dimension;
3. current family tradeoff that changes how evidence should be interpreted;
4. lower-priority context not requested in the current decision.

A remembered score cannot silently make admissions work outrank a current employment/curriculum question. The next-action engine may surface the primary gap only for global/composite decision tasks; atomic school/history/background tasks retain their existing local follow-up owner, and a partial deterministic result keeps retry priority.

## Progress blockers

The six existing parent stages remain unchanged:

`分数位置 -> 专业方向 -> 学校×专业 -> 家庭取舍 -> 志愿方案 -> 最终检查`

v0.06 does not add a seventh stage or a completion percentage. It adds pure blocker rows to existing stage projections. A stage cannot appear ready/confirmed when an explicit hard conflict or a decision-changing evidence gap still blocks that stage.

## Parent UI

The existing `我的决策 -> 家庭决策书` renderer now shows:

- `真正需要比较的差异` — each concrete pair, with evidence state by dimension;
- `现在最值得解决` — exactly one primary unresolved issue and one action;
- explicit `先保留 / 还要核实 / 暂不考虑` actions, persisted by the existing decision owner;
- blocker text under the existing Decision Progress stage.

The decision rail is a **narrow container even on a wide PC**. v0.06 therefore keeps pair cards single-column inside that rail on PC / Pad / Android. Device differences are presentation only; there is no device-specific decision state or business branch.

## Cache transaction

The public/site release remains `v3.9.90.2 / v3990_2`. Visible AIPLuS product remains `v0.02`.

Decision Focus is an additive cache/capability transaction:

- capability: `aiplus-decision-focus-v0.06`;
- CSS: `decision-focus.v006.css?v=006_0&fdw=003_0`;
- top-level AIPLuS app edge includes `focus=006_0`;
- app -> render includes `focus=006_0`;
- render -> Decision Book uses `v=003_1&focus=006_0`;
- Decision Book -> Progress uses `focus=006_0`;
- Decision Book -> Decision Focus uses the unique `decision-focus.v006_1.js?v=006_1` asset.

This advances only the affected AIPLuS subgraph. It does not create another site release or workspace runtime.

## Verification owner

- source/semantic verifier: `tools/verify-aiplus-decision-focus-v006.mjs`;
- mocked PC/Pad/Android UI verifier: `tools/browser-aiplus-decision-focus-v006.mjs`;
- exact Preview / Production asset-and-state verifier: `tools/browser-aiplus-decision-focus-live-v006.mjs`;
- workflow: `.github/workflows/verify-aiplus-decision-focus-v006.yml`.

The workflow must preserve existing Family Decision, parent semantics, human-dialog, AEK, UI and architecture gates. Production browser verification starts only after page + health SHA + app + render + Decision Book + Decision Focus + CSS form one coherent exact-main graph.

Durable Production status:

`production/aiplus-decision-focus-v0.06`

The publisher does not run another product verifier; it publishes the existing source + Production browser result on the exact main SHA.

## Required human journeys

1. `沈工大电气和大连交通自动化怎么选，本科就业优先` — exact pair evidence stays separate; school-level employment evidence is visibly only a reference.
2. remembered score exists but current question is employment — admissions does not silently become the primary CTA.
3. `那如果愿意读研呢` / postgraduate is part of the decision while study duration is unspecified — parent tradeoff is surfaced rather than guessed.
4. a pair conflicts with explicit family exclusion — conflict is shown first; the system does not silently delete the pair.
5. `先保留 / 还要核实 / 暂不考虑` — existing `decision_saved` event persists the choice without candidate-view mutation.
6. atomic school/history research and partial-result retry keep their existing owners.
7. PC / Pad / Android show the same Decision Focus state without horizontal overflow or a device business fork.

## Formal candidate protocol

Before merge:

1. latest `main` must still be the branch base or the branch must be explicitly reconciled;
2. Draft PR fresh source + semantic + browser gates all green;
3. immutable Cloudflare Preview must bind to exact candidate head SHA;
4. exact Preview PC / Pad / Android journeys must pass;
5. freeze final head SHA;
6. mark Ready without changing the frozen SHA and require a fresh second green round;
7. merge only with `expected_head_sha`;
8. after merge verify new main, push workflows, exact-main Cloudflare Production, Pages/custom-domain boundaries, live AIPLuS Decision Focus and durable Production status.

A merged PR without Production closure is not DONE.
