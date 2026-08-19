# Unified school × major background context · durable status

This file is the durable handoff and merge-gate owner for the current cross-product background-context program.

## Repository / branch

- repository: `cashen/gaokao`
- base branch: `main`
- base SHA at program start: `40e27a00748b38109bf979cb4078e98ca3130eb8`
- program branch: `agent/unified-background-context-v001`
- PR: #179 (Draft until the complete program is proven)

A later session must first fetch latest `main`, PR #179 and its exact head SHA, then read `AGENTS.md`, Eastern Philosophy, Unified Site Release, AEK skill/status, `START-HERE.md`, and this file. GitHub state, not private chat memory, owns continuation.

## Product problem

The site had several individually useful but asymmetric capabilities:

- `ln-rank` could surface both Liaoning local background and 211 background hints on admissions records;
- `major-path` understood the canonical undergraduate major and undergraduate→graduate path, but did not consume school×major background evidence;
- AIPLuS had first-class background tasks, but its execution adapter directly read only the Liaoning `local-strength` static resource;
- 211 complete admissions/background execution had already been moved out of Functions into a build-time static index for Cloudflare resource safety.

The program removes that asymmetry without restoring the heavy 211 Functions path, creating a second background truth, adding a 211-specific AI agent/task family, or inventing a recommendation score.

## Human decision model

The products keep distinct jobs:

1. `ln-rank`: **我够不够得到？** — deterministic admissions position and records.
2. `major-path`: **我选的是什么专业？以后怎么继续学？** — canonical undergraduate identity and graduate-path understanding.
3. `academic-background`: **这所学校在这个具体专业/方向上有什么可核验证据？** — school × canonical major background evidence.
4. `AIPLuS`: **这些事实结合家庭目标意味着什么？** — evidence-bounded family decision reasoning.

Integration connects canonical identity and evidence; it does not merge these product responsibilities.

## Correct ownership after resource-budget re-audit

### Semantic / evidence truth owners

These remain canonical and are not copied or replaced:

- academic-background contract: `shared/resources/background/academic-background-contract.v3968_0.js`;
- source registry: `shared/resources/background/academic-background-source-registry.v3968_0.js`;
- matcher / render gate: `shared/algorithms/background/academic-background-matcher.v3968_0.js`;
- undergraduate canonical identity: existing 2026 major catalog + major-understanding resolver;
- school identity: existing shared school identity/profile owners.

### Stable execution sources

The current bounded execution facts are the two already-published immutable static resources:

- Liaoning: `/ln-rank/data/local-strength/local-strength-index.v3971_2.json`;
- 211: `/ln-rank/data/211-static/211-static-index.v3972_0.json`.

`functions/_lib/211-mainline-kb.js` is intentionally a **Functions compatibility adapter only**. Its school/major summary functions are empty and `match211Mainline()` returns `null`; restoring the complete 211 KB into Functions is forbidden because Pages Functions share the Worker resource budget.

Therefore the historical `functions/_lib/academic-background-provider.js` remains a compatibility/migration surface for its existing consumers, but it is **not evidence that active Functions can execute complete 211 matching**.

### Unified derived execution projection

The cross-product runtime reads one bounded, deterministic **derived evidence projection**, not a new business truth:

- builder: `tools/build-background-context-index-v001.mjs`;
- generated asset: `ln-rank/data/background-context/background-context-index.v001.json`;
- build audit: `ln-rank/data/background-context/background-context-audit.v001.json`;
- pure projection/query contract: `shared/resources/background/academic-background-context.v001.js`;
- Functions bounded reader/cache owner: `functions/_lib/academic-background-context-reader.js`.

Current deterministic build evidence before final QA:

- 238 `school × canonical major × scope` groups;
- 69 schools;
- 141 canonical undergraduate majors;
- 131 Liaoning-scope groups + 107 211-scope groups;
- 428,417 bytes (< 900 KB budget);
- 164 unresolved raw admissions titles remain fail-closed, largely classes/trial/special-program labels;
- no `score2026` / `rank2026` ownership;
- no duplicate group or same-group evidence;
- every 211 evidence row retains an HTTPS official-source URL after the provenance fix.

The asset is reproducibly generated from the two stable source indexes. `git diff` after rebuilding must be zero in the formal gate.

### Navigation / presentation owners

- ln-rank admissions state and query truth: existing major-bands/school-majors/workspace owners;
- ln-rank navigation transaction: existing shared interaction owner;
- major-path canonical major/search/relationship truth: existing v0.02 core;
- major-path human presentation/viewport: v0.04 owner;
- background cross-page URL/return contract: `shared/resources/background/academic-background-navigation.v001.js`;
- background-page additive presentation only: `ln-rank/js/academic-background/background-context-direct.v001.js`;
- stable LocalStrength/211 page renderers remain unchanged;
- AIPLuS atomic task semantics: existing human-query-frame/command/task owners;
- AIPLuS single turn execution: `functions/_lib/ai/turn-orchestrator.js`;
- Decision Research: existing `evidence-plan.js` / `decision-research-runtime.js`;
- typed claim provenance: existing `claim-evidence.js` extended in place;
- release identity: `shared/resources/release/current-release.js`.

## Non-negotiable truth boundaries

1. **211 school identity != 211 school-major background evidence.** `is211` may describe school platform identity; it never proves a specific major is strong.
2. `liaoning` / `211` are evidence scopes, not ranking points. Matching both does not mean “twice as strong”.
3. Identical evidence/source entering two scope views is deduplicated by stable evidence/source identity before claim/presentation.
4. Background evidence cannot become admissions probability, recommendation score, hidden bonus, automatic deletion rule, or school strength ranking.
5. Missing evidence means **未显示 / 证据不足**, never “weak major”.
6. Explicit `211` scope must fail closed; it must never silently fall back to Liaoning evidence.
7. A broad user major term such as `电气` is not globally forced to one canonical major. For a known school, the background adapter may collapse it only when the school-scoped related evidence yields exactly one canonical major; multiple candidates remain ambiguous/fail-closed.
8. Military/special boundaries and source-verification gates remain fail-closed.
9. Major-path independent mode may offer Liaoning/211 evidence exploration but must not become a school leaderboard.
10. URLs carry canonical identities/source-record/return context only; copied background conclusions are forbidden.

## Program work packages

Status values: `TODO`, `IN_PROGRESS`, `DONE`. `DONE` requires real package/system proof; implementation alone is not DONE. No package may be skipped to merge early.

### Mainline — canonical context first

| Package | Status | Current evidence / remaining proof |
|---|---|---|
| UBC-00 | DONE | Draft PR #179, durable owner map, network-interruption handoff and merge prohibition exist in GitHub |
| UBC-01 | IN_PROGRESS | derived exact context, dual-scope/source dedupe, unique school-scoped shorthand resolution implemented; awaiting permanent source/browser proof |
| UBC-02 | IN_PROGRESS | shared same-origin background navigation/return contract implemented; awaiting browser/Preview proof |

### Subtask A — ln-rank → major-path context fidelity

| Package | Status | Current evidence / remaining proof |
|---|---|---|
| UBC-03 | IN_PROGRESS | score-mode now carries visible school identity; school-mode retained; class-level gate unchanged; awaiting four-device browser proof |

### Subtask B — major-path ↔ academic-background

| Package | Status | Current evidence / remaining proof |
|---|---|---|
| UBC-04 | IN_PROGRESS | major-path section mounted after本科→读研 and before relationship graph; exact school context + independent Liaoning/211 actions implemented; awaiting local/live geometry proof |
| UBC-05 | IN_PROGRESS | both stable background pages load one additive direct/record-handoff adapter; no MutationObserver/new result state; awaiting real page four-device round-trip proof |

### Subtask C — AIPLuS unified background scope

| Package | Status | Current evidence / remaining proof |
|---|---|---|
| UBC-06 | IN_PROGRESS | `backgroundScope` is centralized in `human-query-frame` v0.04, deterministic and non-candidate; natural school×major background grammar expanded; awaiting existing AEK/routing matrices |
| UBC-07 | IN_PROGRESS | AIPLuS adapter now reads the bounded unified context instead of raw LocalStrength; existing tool names retained; awaiting exact-Preview `/api/ai/turn` proof |
| UBC-08 | IN_PROGRESS | existing typed claim model extended with evidenceScope/evidenceId/sourceId and exact school_major firewall; awaiting source + live claim proof |

### Subtask D — workbench / decision preservation

| Package | Status | Current evidence / remaining proof |
|---|---|---|
| UBC-09 | IN_PROGRESS | `platformScore()` now contains only 985/211/public identity; local background evidence remains in path evidence coverage; awaiting selection-workbench regression |
| UBC-10 | IN_PROGRESS | existing `background_evidence` step reused and upgraded to exact school-major typed claims; no second Decision Research runtime; awaiting parent-decision regression |

### QA / release

| Package | Status | Required outcome |
|---|---|---|
| UBC-QA | IN_PROGRESS | permanent source/truth/semantic gate plus PC/Pad/Android/compact local browser and exact-head Preview live gate exist; latest exact-head run still required |
| UBC-RELEASE | TODO | freeze one final SHA → complete Draft → Ready same SHA → second fresh checks → expected-head merge → exact-main Production closure |

## Required human-language acceptance classes

AIPLuS must prove at least:

- `辽宁省内哪些学校电气有底子` → existing `major_background`, explicit `liaoning` evidence scope;
- `211里哪些学校通信工程有背景` → existing `major_background`, explicit `211` evidence scope;
- `东北大学自动化有什么背景` → existing `school_background`, school+major focus, `auto` evidence scope;
- natural variants such as `有没有底子 / 有啥优势 / 积累怎么样` belong to the same school-background semantic class when a school is explicit;
- broad shorthand is collapsed only if the school-scoped canonical result is unique;
- `东北大学是211，所以自动化肯定比沈工大电气好吗` must not convert 211 platform identity into `backgroundScope=211` or a professional-strength conclusion;
- non-211 school + explicit 211 professional-background request → fail closed in 211 scope, never local fallback;
- remembered score/school/major must not silently activate unrelated evidence scope;
- pure background questions do not execute admissions-score filtering unless current turn explicitly asks reachability.

## Cross-page acceptance journeys

Must pass on PC / Pad / Android / compact where applicable:

1. ln-rank score card → major-path; school + canonical major + source record preserved →本科到读研 → exact school-major background section → scope detail → return.
2. ln-rank school-major card → same exact path and return.
3. independent major-path → explicit `看辽宁哪些学校有背景` / `看211哪些学校有背景`; no leaderboard.
4. ordinary LocalStrength and 211 record → strict concrete-major `了解这个专业` → major-path with `sourceSurface=academic-background` → return to background evidence.
5. class-level / ambiguous admission title receives no false concrete-major link.
6. Liaoning 211 school may show both evidence scopes; duplicate evidence/source is not counted twice.
7. missing evidence, special/military, stale/unverified or provenance-incomplete evidence fails closed.
8. no document horizontal overflow and no Android-specific business branch.

## Permanent proof owners

- `tools/verify-unified-background-context-v001.mjs` — build truth, dual-scope dedupe, explicit-scope fail-closed, navigation, semantic scope, typed claims, owner/subtraction invariants.
- `tools/browser-unified-background-context-v001.mjs` — local PC/Pad/Android/compact cross-product journeys.
- `tools/browser-unified-background-context-live-v001.mjs` — exact Preview/Production cross-product UI plus real `/api/ai/turn` scope/resource/claim execution.
- `.github/workflows/verify-unified-background-context-v001.yml` — source → exact-head Preview → exact-main Production + durable `production/unified-background-context-v0.01` status.
- existing major-path, LocalStrength, all211, AIPLuS parent-decision/AEK/workspace, selection-workbench, decision-focus, canonical release, native chooser, architecture, LN final, production API, resource graph and site-runtime workflows remain preserved owners; the new workflow does not replace them.

## Preserved regression gates

At minimum preserve:

- 883 / 92 / 13 major-path truth and v0.04 human/viewport journeys;
- major-path v0.03 ln-rank return/resume contract;
- immutable LocalStrength and 211 static audits/browser gates;
- ln-rank background hints and Selection Pool behavior;
- AIPLuS AEK routing matrices, human-dialog, school/major topic grids, parent-decision and workspace/browser regressions;
- selection workbench and decision-focus gates;
- canonical release, native chooser, architecture handoff, LN final release, production API health, unified resource graph/site runtime;
- protected paths untouched: `/fenxi/`, `functions/fenxi/`, `functions/_middleware.js`;
- `functions/_lib/release-contract.js` retains both required exports.

## PR rule / merge prohibition

This program remains one PR because partial merge would create the exact product asymmetry being removed.

**PR #179 MUST remain Draft while any UBC package is TODO/IN_PROGRESS.**

Do not merge when only the context index, only major-path, only background navigation, or only AIPLuS scope is complete.

Final protocol:

1. complete implementation and re-audit ownership;
2. obtain real package/system proof;
3. update this ledger so every implementation/QA package is `DONE` based on evidence;
4. remove every temporary builder/updater/diagnostic from final tree;
5. freeze one final head SHA;
6. Draft fresh checks + exact-head immutable Preview + PC/Pad/Android/compact all green;
7. mark Ready **without changing that SHA**;
8. complete a second fresh Ready round on the exact same SHA;
9. merge only with `expected_head_sha`;
10. verify new `main`, push workflows, exact-main Cloudflare Production, Pages/custom-domain boundaries and durable Production statuses;
11. only after Production closure mark UBC-RELEASE complete.

A network interruption or new conversation must continue this same PR from the first incomplete package. Do not restart the plan, do not create a second active branch, and do not declare completion from partial green checks.
