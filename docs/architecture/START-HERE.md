# Architecture handoff: start here

This document is a **navigation map, not a second source of truth**. A new maintainer should be able to locate the current owners without reconstructing repository history from old PRs or versioned filenames.

## 1. Startup order

1. Read root `AGENTS.md`.
2. Read `docs/skills/eastern-philosophy/SKILL.md`.
3. Read `docs/skills/human-copy/SKILL.md` before changing any user-visible text, UI copy, generated report, Tongxue presentation or AIPLuS answer/prompt presentation.
4. For runtime, release, UI ownership, cache, navigation, page entrypoints or deployment work, read `docs/skills/unified-site-release/SKILL.md`.
5. Read the machine owners below before changing code.
6. Run `node tools/audit-architecture-handoff-v3990_2.mjs` before and after architecture-affecting work.

Do not infer ownership from a filename being newer, from a historical PR, or from a root `VERSION.txt` marker.

## 2. Canonical machine owners

### Release identity

**SOURCE-OF-TRUTH:CURRENT-RELEASE**

- `shared/resources/release/current-release.js`

This is the canonical current release identity. Public version, runtime generation and asset identity are encodings of one release; they are not independent release owners.

### Active runtime topology

**SOURCE-OF-TRUTH:SITE-RUNTIME**

- `shared/resources/release/site-runtime-contract.v3990_2.js`
- `shared/resources/release/runtime-cache-contract.v3990_2.js`
- `shared/governance/resource-execution-contract.v3990_2.js`
- `ln-rank/site-active-generation.v3990_2.json`
- `shared/resources/release/active-resource-manifest.v3990_2.js` — current active resource graph, transitive implementation declarations, additive knowledge sources and school-directory loader ownership.

Use these files to answer: which entrypoint is current, which dependency is intentionally stable, who owns interaction/cache/execution, and which policies are release gates.

### Admissions/resource truth

The 2026 admissions fact set remains deterministic. Runtime projections, bounded shards and indexes are derived execution structures, not competing business truths. For Worker resource ownership, start from the current runtime/resource contracts and the production vNext verification workflows rather than reintroducing full-table reads.

### Academic background evidence and bounded execution

**SOURCE-OF-TRUTH:ACADEMIC-BACKGROUND-SEMANTICS**

The semantic/evidence truth owners remain:

- `shared/resources/background/academic-background-contract.v3968_0.js` — background scope/shape contract;
- `shared/resources/background/academic-background-source-registry.v3968_0.js` — source registry;
- `shared/algorithms/background/academic-background-matcher.v3968_0.js` — evidence/match/render gate;
- the existing shared school identity owner and 2026 canonical undergraduate-major resolver.

The complete bounded execution sources are the already-published immutable indexes:

- `/ln-rank/data/local-strength/local-strength-index.v3971_2.json` — Liaoning background source projection;
- `/ln-rank/data/211-static/211-static-index.v3972_0.json` — complete 211 admissions/background static projection.

**KNOWN-COMPAT:211-FUNCTIONS-LIGHTWEIGHT** — `functions/_lib/211-mainline-kb.js` is intentionally a lightweight Functions compatibility adapter. Its complete 211 school/major matching was moved to the build-time static index because Cloudflare Pages Functions share a Worker resource budget. Its summary APIs return empty collections and `match211Mainline()` returns `null`. Do not “restore completeness” by importing the full 211 KB back into Functions.

Cross-product `major-path` / AIPLuS execution uses one deterministic, evidence-only **derived projection**, not a second business truth:

- `tools/build-background-context-index-v001.mjs` — reproducible builder from the two stable source indexes;
- `ln-rank/data/background-context/background-context-index.v001.json` — bounded `school × canonical major × evidence scope` execution index;
- `ln-rank/data/background-context/background-context-audit.v001.json` — build/coverage audit;
- `shared/resources/background/academic-background-context.v001.js` — pure query/dedupe projection contract;
- `functions/_lib/academic-background-context-reader.js` — bounded Functions asset reader/cache owner;
- `shared/resources/background/academic-background-navigation.v001.js` — cross-page canonical identity/return contract;
- `docs/architecture/UNIFIED-BACKGROUND-CONTEXT-STATUS.md` — program ownership, fail-closed and release handoff.

The derived index must not own admissions scores/ranks, school strength ranking, recommendation bonus, or a second major dictionary. `liaoning` and `211` are evidence scopes only; 211 school identity never proves a specific major has 211 background evidence. A broad major phrase may collapse to a canonical school-major only when the school-scoped evidence has exactly one canonical result; ambiguity remains fail-closed.

### AIPLuS product and fact boundaries

- `shared/ai/aiplus-product-contract.v002.js` — **current AIPLuS product/source policy owner**. The visible product shell remains `v0.02`.
- `shared/ai/aiplus-product-contract.v003.js` — compatibility import surface used only by the decision-semantic branch; it re-exports v0.02 and is not a second product policy or product-version owner.
- `functions/_lib/ai/intent-contract.js` — task → action/object/source contract. It knows the `decision_research` task but continues to reference the single v0.02 product/source policy.
- `functions/_lib/ai/parent-semantic-frame.js` — **parent decision meaning owner** for composite questions. It owns school-major comparison geometry, explicit career goals, hard/soft/concern preferences, explicit student learning/work-environment signals, ordinal references such as “第二个/后者”, counterfactual changes such as “那如果愿意读研呢”, and the split between accumulated versus current evidence needs. It never owns score/region/school/major mutations and must not infer personality or ability beyond explicit user statements.
- `functions/_lib/ai/evidence-plan.js` — **bounded decision research planner**. It may schedule at most three evidence steps. Remembered score is context only: admissions execution requires the current turn to activate score/reachability evidence. Reference follow-ups narrow execution to the selected pair while semantic memory keeps the full comparison set.
- `functions/_lib/ai/claim-evidence.js` — **typed claim provenance contract**. Claims retain `subjectType`, `subjectId`, dimension/metric/value/unit, year/cohort, optional sample/denominator/geography, `sourceScope`, `documentScope`, source URL/title and stable claim ID. School-wide evidence cannot be narrowed into a school-major claim merely because the user asked about a major; time-sensitive quantitative facts fail closed without a year.
- `functions/_lib/ai/official-web-evidence.js` — the only general official-web discovery/reader gateway. Search results are discovery only. School evidence may use actually read exact CHSI hosts (`gaokao.chsi.com.cn`, `xz.chsi.com.cn`, `yz.chsi.com.cn`) plus verified `.gov.cn` / `.edu.cn` pages. Major-only knowledge uses the exact CHSI hosts and may create only `major_national` claims, never a specific-school outcome.
- `functions/_lib/ai/decision-research-runtime.js` — executes the bounded plan through existing deterministic and official-source owners. It is also the final model-summary scope gate: a model factual sentence must bind to compatible claim IDs, and invalid subject/source scope falls back to deterministic wording.
- `functions/_lib/ai/turn-orchestrator.js` — the **single turn execution owner**. Atomic task routing remains in the existing deterministic task kernel; only the orchestrator can promote a multi-object/multi-goal turn into `decision_research`.
- `functions/_lib/ai/RESOURCE-BOUNDARY.md` — detailed deterministic/resource/claim boundary for AIPLuS.
- `aiplus/index.html` — browser entrypoint.
- `aiplus/app.v3990_2.js` — current browser orchestration entry module.
- `functions/_lib/ai/tool-registry.js` — deterministic tool registry/bridge planning. Its existing identifier remains stable because decision v0.03 reuses the same browser fact bridge instead of inventing another one.
- `shared/ai/decision-focus.v006_1.js` — **AIPLuS 决策聚焦纯投影 owner**。它只把现有 workspace、确定性学校×专业记录和 typed claims 组织成 pair evidence matrix 与 decision gaps；不会联网、持久化、创建推荐分/录取概率或第二份 shortlist。详细边界见 `docs/architecture/AIPLUS-DECISION-FOCUS-STATUS.md`。
- `aiplus/selection-workbench.v005.js` — **AIPLuS 自选/排序/诊断 UI 编排适配层**。它直接复用 `ln-rank` Selection Pool 和既有 `buildPathAnalysis()`，不会建立第二份自选、排序或招生事实；详细边界见 `docs/architecture/AIPLUS-SELECTION-DIAGNOSIS-STATUS.md`。

Human Copy is a repository-wide presentation principle, not a new AIPLuS answer owner. `tools/audit-ai-human-copy-contract.mjs` remains the existing AIPLuS/diagnosis copy-safety audit; product-specific prompt, validator and presentation owners stay canonical. `tools/audit-human-copy-v001.mjs` only verifies foundation registration and active cross-site public wording.

Models may interpret language and explain evidence; they do not own admissions scores, ranks, school/major facts, source scope, or a parallel admissions probability/recommendation-score model. `decision_research` is knowledge/reasoning only and must never commit the candidate active view.

### AIPLuS decision v0.03 version boundary

The **visible AIPLuS product remains `v0.02`**. The stable browser advisor shell remains `ai-human-advisor-agent-v0.02`, the current browser core asset transaction remains `aiplus-assets-v002_4`, and the health API keeps its compatible `ai-health-api-v0.02` identity.

Parent Decision Intelligence is a narrower server-side capability generation: `aiplus-parent-decision-v0.03`. It advances parent semantic framing, bounded evidence planning, typed claim provenance and official-web evidence orchestration without copying or renaming the stable browser runtime. `aiplus/index.html` exposes product/advisor/decision identities separately so a maintainer does not infer a full product/runtime generation change from the decision feature version.

Decision Focus is a narrower additive decision projection/cache capability: `aiplus-decision-focus-v0.06`. It does not change the site release, browser workspace identity or AIPLuS visible product version. The current `focus=006_0` cache subtransaction advances only the affected AIPLuS app → render → Decision Book/Progress/Focus graph.

The key semantic execution invariant is: **remembered context is not execution authority**. For example, a workspace may remember `568` while the parent asks only “沈工大电气和大连交通自动化怎么选，考虑就业和考研”; that turn may preserve 568 as context but must not execute admissions facts until the parent explicitly asks about score/位次/现实性. Conversely, “568分，……怎么选” activates the existing exact admissions owners. “先别管分数” suspends admissions both semantically and operationally.

For pair/reference semantics:

- N schools × one major → one pair per school;
- one school × N majors → one pair per major;
- equal N:N explicit objects → aligned pairs;
- mismatched multi-school × multi-major does not invent a cartesian product;
- an ordinal follow-up selects one member of the prior `comparisonPairs` for execution but does not destroy the full comparison set;
- a counterfactual follow-up changes only explicitly changed decision dimensions and preserves other decision objects/constraints.

## 3. Known ownership boundaries that must not be guessed away

### AIPLuS workspace transitive generation

**DECLARED-TRANSITIVE:AIPLUS-WORKSPACE-TRANSITIVE**

The site-level AIPLuS workspace entry remains part of the public release `v3.9.90.2 / v3990_2`, while the browser `aiplus/app.v3990_2.js` imports the evolved workspace, render and history implementations listed in `shared/resources/release/active-resource-manifest.v3990_2.js`. These are declared transitive implementations, not a second site release or an unowned browser resource.

Historical audit compatibility label retained: `KNOWN-GAP:AIPLUS-WORKSPACE-TRANSITIVE` identifies the pre-manifest debt label; it does not grant that label current ownership.

The active manifest is now the release-owned declaration for this graph:

- workspace contract: `shared/ai/ai-workspace-contract.v3992_0.js`;
- render: `aiplus/render.v3992_0.js`;
- history: `aiplus/history-store.v3992_4.js`;
- fact bridge: the existing workspace/fact-bridge implementation;
- additive major source profile: `ln-rank/kb/major-understanding/major-source-profile.generated.js`;
- shared school directory loader: `tongxue/data/school-name-resolver-v150.js`, behind the shared school identity/resource center.

The consistency verifier must prove that the browser import graph, release contract, cache contract, execution contract and active-generation manifest agree. Do not create another workspace state machine, rename stable implementations only to flatten filenames, or promote additive knowledge into admissions truth. Any future implementation-generation migration must update all affected contracts, cache entries, tests and production evidence together.

### Legacy intent interpreter

`functions/_lib/ai/intent-interpreter.js` remains in the repository, but the architecture audit verifies that current production roots do not import it. Do not reactivate it as a second intent owner. Current AIPLuS atomic intent/task behavior is governed by the current command/task contracts; parent-decision composition is owned by the turn orchestrator and must not fork that atomic parser.

### Cloudflare production verifier compatibility

**KNOWN-COMPAT:CLOUDFLARE-VERIFIER-MAP**

The current production deployment workflow still reuses the maintained `tools/verify-cloudflare-git-production-v3990_0.mjs` algorithm and maps release/generation strings for the current release. That compatibility is active and therefore must not be deleted as “old code”. The intended future direction is one generation-neutral verifier driven by the current deployment/release contract, but that change belongs in a dedicated release-safe migration.

### Historical version markers are not release owners

**NON-OWNER:ROOT-VERSION** — root `VERSION.txt` is a historical marker, not the canonical current release source.

**NON-OWNER:LN-RANK-VERSION** — `ln-rank/VERSION.txt` is also historical/legacy metadata, not the canonical current release source.

Do not mechanically edit these files to “match” the current release unless an active consumer is first proven. Making a legacy marker look current can accidentally create a second release owner.

## 4. Workflow ownership map

Classify workflows by responsibility, not by the version number in their filename.

### Canonical deployment / production identity

- `.github/workflows/deploy-cloudflare-pages-main.yml`

This owns exact-main Cloudflare Git production verification. The Pages production domain is the canonical Functions stress/exact-SHA owner; the custom domain security/challenge boundary is checked separately.

### AIPLuS / AI product verification

- `.github/workflows/verify-ai-workspace-v3990_1.yml` — existing product/browser/atomic-AI regression owner.
- `.github/workflows/verify-aiplus-parent-decision-v003.yml` — narrow decision-semantic supplement. It must run the old regressions plus the v0.03 semantic/provenance invariants and exact-Preview journeys. Its Preview contract proves both sides of the score boundary: remembered score does not silently execute admissions; an explicit current score does execute the existing exact admissions bridge. It does not replace the existing AI workspace gate.
- `.github/workflows/verify-aiplus-decision-focus-v006.yml` — additive Decision Focus gate. It verifies the single pure projection owner, typed evidence scope, next-best-question priority, progress blockers, canonical `decision_saved` persistence, PC/Pad/Android rendering, exact-head Preview and exact-main Production. It does not replace Family Decision or parent-decision gates.
- `.github/workflows/verify-aiplus-selection-workbench-v005.yml` — additive AIPLuS selection workbench gate. It verifies reuse of the canonical Selection Pool, no second storage truth, PC/Pad/Android add/sort/diagnosis journeys, exact-head Preview and exact-main Production.

### Worker resource vNext

- `.github/workflows/verify-worker-resource-vnext-preview.yml`
- `.github/workflows/verify-worker-resource-vnext-production.yml`

These own bounded-shard/concurrency/resource-limit proof. Do not replace them with custom-domain stress probes.

### Final/stable regressions

- `.github/workflows/verify-ln-2026-final.yml`
- other versioned workflows referenced by current contracts or stable resources

A historically named verifier can still be an active stable regression. Removal requires reachability/contract evidence, not filename age.

## 5. Protected boundaries

Do not modify:

- `/fenxi/`
- `functions/fenxi/`
- `functions/_middleware.js`

`functions/_lib/release-contract.js` must continue exporting both `LN_RANK_RELEASE_CONTRACT` and `RELEASE_CONTRACT`.

Do not restore pure/minimal-package/static-import-graph pruning strategies. Runtime correctness, truth fidelity, recall, accessibility, observability and rollback safety take priority over directory cleanliness.

## 6. Safe change protocol

Before a write:

1. resolve latest `main` SHA;
2. create/confirm an isolated branch (`branch != main`);
3. identify the canonical owner and current tests;
4. prove whether the target is active, stable, compatibility-only or historical;
5. make the smallest structural change that reduces duplicate ownership;
6. run source/contract/unit/browser/architecture gates;
7. Draft PR → exact-head Preview → same-head Ready → `expected_head_sha` merge;
8. after merge verify main, push workflows, exact Production SHA, Pages/custom-domain boundaries and live journeys.

If an apparent cleanup would require deleting an active compatibility dependency, changing persisted identity, inventing a second truth source or weakening a verifier, stop the cleanup and keep the working owner until a migration proves equivalence.
