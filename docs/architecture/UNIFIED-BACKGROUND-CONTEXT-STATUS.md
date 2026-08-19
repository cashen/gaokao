# Unified school × major background context · durable status

This file is the durable handoff and merge-gate owner for the current cross-product background-context program.

## Repository / branch

- repository: `cashen/gaokao`
- base branch: `main`
- base SHA at program start: `40e27a00748b38109bf979cb4078e98ca3130eb8`
- program branch: `agent/unified-background-context-v001`
- PR: create as Draft immediately after this file lands

If a later session resumes this work, read latest `main`, the current PR/head SHA, `AGENTS.md`, Eastern Philosophy, Unified Site Release, AEK skill/status, `START-HERE.md`, then this file. GitHub state must be sufficient to continue without private chat history.

## Product problem

The site already has several correct but unevenly connected capabilities:

- `ln-rank` can show both Liaoning local background and 211 background as school-major evidence hints;
- `major-path` understands the canonical undergraduate major and graduate-path context, but does not yet consume school-major background evidence;
- AIPLuS has first-class background semantics/tasks, but its current execution adapter reads only the Liaoning local-strength static resource;
- the canonical academic-background contract/provider/API already support both `liaoning` and `211` scopes.

The program must remove that asymmetry without creating a second background truth set, second AI task family, second recommendation score, or pairwise page-integration spiderweb.

## Human decision model

The products keep distinct jobs:

1. `ln-rank`: **我够不够得到？** — deterministic admissions position and records.
2. `major-path`: **我选的是什么专业？以后怎么继续学？** — canonical undergraduate identity and graduate-path understanding.
3. `academic-background`: **这所学校在这个专业/方向上有什么可核验证据？** — school × major background evidence.
4. `AIPLuS`: **这些事实结合我的目标意味着什么？** — evidence-bounded family decision reasoning.

The integration must connect identities and evidence, not merge these product responsibilities.

## Singular owners

These owners must remain singular:

- school identity: current shared school identity/profile owners;
- canonical undergraduate major identity: existing major catalog / major-understanding resolver;
- academic-background truth contract: `shared/resources/background/academic-background-contract.v3968_0.js`;
- academic-background source registry: `shared/resources/background/academic-background-source-registry.v3968_0.js`;
- academic-background matching: `shared/algorithms/background/academic-background-matcher.v3968_0.js`;
- academic-background provider: `functions/_lib/academic-background-provider.js`;
- academic-background HTTP service: `functions/_lib/academic-background-api.js` + `functions/api/academic-background.js`;
- ln-rank admissions facts/query state: existing major-bands / school-majors / selection-workspace owners;
- ln-rank navigation transaction: existing shared interaction owner;
- major-path canonical major/search/relationship truth: existing v0.02 core;
- major-path human presentation/viewport: current v0.04 owner;
- AIPLuS task semantics: existing command/human-query-frame/intent/task owners;
- AIPLuS turn execution: `functions/_lib/ai/turn-orchestrator.js`;
- AIPLuS decision evidence planning/runtime: existing `evidence-plan.js` / `decision-research-runtime.js`;
- release identity: `shared/resources/release/current-release.js`.

## Non-negotiable truth boundaries

1. **211 school identity != 211 school-major background evidence.** `is211` may describe school platform identity; it must never imply a specific major is strong.
2. `liaoning` and `211` are evidence scopes, not ranking points. A record matching both scopes does not become “twice as strong”.
3. If the same evidence/source enters both scope projections, deduplicate by stable evidence/source identity before presentation or claim composition.
4. Background evidence is for review and decision context only. It must not become an admissions probability, recommendation score, hidden bonus, or automatic deletion rule.
5. Missing background evidence means **未显示 / 证据不足**, never “weak major”.
6. Military/special boundaries and source-verification gates remain fail-closed.
7. Major-path must not become a school-ranking page. In independent exploration mode it may offer scoped next actions (Liaoning / 211) but must not invent a strength leaderboard.
8. URL/navigation may carry canonical identities and return context, but must not carry copied background conclusions as truth.

## Program work packages

Status values: `TODO`, `IN_PROGRESS`, `DONE`. **No package may be skipped to merge early.**

### Mainline — canonical context first

| Package | Status | Required outcome |
|---|---|---|
| UBC-00 | IN_PROGRESS | Durable status + Draft PR + explicit merge prohibition and owner map |
| UBC-01 | TODO | Extend the existing academic-background owner with an exact `school × canonical major × requested scopes` context projection; both `liaoning` and `211` supported; source/evidence dedupe; no new truth store |
| UBC-02 | TODO | Add canonical navigation/context contract for background direct entry and return; same-origin and identity-safe |

### Subtask A — ln-rank → major-path context fidelity

| Package | Status | Required outcome |
|---|---|---|
| UBC-03 | TODO | Score-mode and school-mode major-path handoff both preserve school identity + canonical major identity + source-record identity; no background result copied into URL |

### Subtask B — major-path ↔ academic-background

| Package | Status | Required outcome |
|---|---|---|
| UBC-04 | TODO | Major-path direct school-major context renders a compact “放到这所学校里再看一眼” section after undergraduate→graduate core; independent mode offers scoped Liaoning/211 exploration only |
| UBC-05 | TODO | Academic-background pages support exact school+major direct entry, preserve scope, and expose “了解这个专业” back to major-path without retyping |

### Subtask C — AIPLuS unified background scope

| Package | Status | Required outcome |
|---|---|---|
| UBC-06 | TODO | Existing `school_background` / `major_background` / `background_discovery` tasks gain explicit/auto background scope semantics; no new 211-specific task family |
| UBC-07 | TODO | Replace the current AIPLuS local-only background read with a projection of the canonical academic-background owner/resources; preserve bounded execution and existing tool registry ownership |
| UBC-08 | TODO | Typed background claims retain school, canonical major where applicable, evidence scope, evidence/source identity and year; model cannot widen 211 school identity into 211 major-strength claims |

### Subtask D — workbench / decision preservation

| Package | Status | Required outcome |
|---|---|---|
| UBC-09 | TODO | Selection Workbench continues to treat 985/211 as platform identity and background as evidence coverage; no hidden background bonus score is added |
| UBC-10 | TODO | Decision Research reuses the existing `background_evidence` planning step; do not fork or duplicate decision runtime |

### QA / release

| Package | Status | Required outcome |
|---|---|---|
| UBC-QA | TODO | Source/unit/truth/browser/system regression including PC/Pad/Android/compact and exact-head Preview; all preserved workflows green |
| UBC-RELEASE | TODO | Freeze one final head SHA → Ready on same SHA → fresh second-round checks → `expected_head_sha` merge → main/Actions/Cloudflare Production/live closure |

## Required human-language acceptance classes

AIPLuS must distinguish at least:

- `辽宁省内哪些学校电气有底子` → `major_background`, explicit `liaoning` scope;
- `211里哪些学校通信工程有背景` → `major_background`, explicit `211` scope;
- `东北大学自动化有什么背景` → school-major background with `auto` scope; may expose both evidence scopes without double counting;
- `东北大学是211，所以自动化肯定比沈工大电气好吗` → explicitly separate school platform identity from school-major evidence; no automatic superiority conclusion;
- non-211 school + explicit `211` background request → fail closed for 211 scope, never silently fall back to Liaoning;
- remembered score/school/major context must not silently activate unrelated background scope;
- pure background questions must not execute admissions-score filtering unless the current turn explicitly asks for score/reachability.

## Cross-page acceptance journeys

Must pass on PC / Pad / Android / compact where applicable:

1. ln-rank score card → major-path → exact school-major background section → background detail → return chain.
2. ln-rank school-major card → major-path → background detail → return chain.
3. independent major-path → choose `看辽宁哪些学校有背景` / `看211哪些学校有背景` → background page prefiltered to canonical major.
4. background school-major record → `了解这个专业` → major-path canonical code → return.
5. class-level / ambiguous admissions title remains fail-closed; no false concrete-major or background direct link.
6. Liaoning 211 school may expose both scopes, but identical evidence/source is not duplicated or scored twice.
7. missing evidence, special/military boundaries, stale/unverified evidence remain fail-closed.

## Preserved regression gates

At minimum preserve:

- 883 / 92 / 13 major-path truth and v0.04 human/viewport journeys;
- major-path v0.03 ln-rank return/resume contract;
- academic-background Liaoning and 211 audits/browser gates;
- ln-rank LocalStrength/211 hint and selection-pool behavior;
- AIPLuS AEK routing matrices, human-dialog, school/major topic grids, parent-decision and workspace browser regressions;
- selection workbench and decision-focus gates;
- canonical release, native chooser, architecture handoff, LN final release, production API health, unified resource graph/site runtime;
- protected paths remain untouched: `/fenxi/`, `functions/fenxi/`, `functions/_middleware.js`;
- `functions/_lib/release-contract.js` continues exporting both required release contracts.

## PR rule / merge prohibition

This program is deliberately one PR because partial merge would create the exact product asymmetry being removed.

**The PR MUST remain Draft while any UBC package is TODO/IN_PROGRESS.**

Do not merge when only the canonical provider, only major-path, only academic-background navigation, or only AIPLuS scope support is complete. Mainline and every subtask above must be complete together.

Final protocol:

1. complete implementation and re-audit ownership;
2. update this ledger so every UBC package is `DONE` based on evidence, not optimism;
3. remove temporary builders/diagnostics from the final diff;
4. freeze one final head SHA;
5. Draft fresh checks + exact-head immutable Preview + PC/Pad/Android journeys all green;
6. mark Ready **without changing that SHA**;
7. complete a second fresh Ready round on the exact same SHA;
8. merge only with `expected_head_sha`;
9. verify new `main` SHA, all push workflows, exact-main Cloudflare Production, Pages/custom-domain behavior and durable production statuses;
10. only then mark UBC-RELEASE complete.

A network interruption or new conversation must continue this same branch/PR from the first incomplete package. Do not restart from the plan, do not create a second active branch, and do not declare completion from partial green checks.
