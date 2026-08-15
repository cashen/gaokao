# Architecture handoff: start here

This document is a **navigation map, not a second source of truth**. A new maintainer should be able to locate the current owners without reconstructing repository history from old PRs or versioned filenames.

## 1. Startup order

1. Read root `AGENTS.md`.
2. Read `docs/skills/eastern-philosophy/SKILL.md`.
3. For runtime, release, UI ownership, cache, navigation, page entrypoints or deployment work, read `docs/skills/unified-site-release/SKILL.md`.
4. Read the machine owners below before changing code.
5. Run `node tools/audit-architecture-handoff-v3990_1.mjs` before and after architecture-affecting work.

Do not infer ownership from a filename being newer, from a historical PR, or from a root `VERSION.txt` marker.

## 2. Canonical machine owners

### Release identity

**SOURCE-OF-TRUTH:CURRENT-RELEASE**

- `shared/resources/release/current-release.js`

This is the canonical current release identity. Public version, runtime generation and asset identity are encodings of one release; they are not independent release owners.

### Active runtime topology

**SOURCE-OF-TRUTH:SITE-RUNTIME**

- `shared/resources/release/site-runtime-contract.v3990_1.js`
- `shared/resources/release/runtime-cache-contract.v3990_1.js`
- `shared/governance/resource-execution-contract.v3990_1.js`
- `ln-rank/site-active-generation.v3990_1.json`

Use these files to answer: which entrypoint is current, which dependency is intentionally stable, who owns interaction/cache/execution, and which policies are release gates.

### Admissions/resource truth

The 2026 admissions fact set remains deterministic. Runtime projections, bounded shards and indexes are derived execution structures, not competing business truths. For Worker resource ownership, start from the current runtime/resource contracts and the production vNext verification workflows rather than reintroducing full-table reads.

### AIPLuS product and fact boundaries

- `shared/ai/aiplus-product-contract.v003.js` — current product/source policy vocabulary. The older v0.02 file remains a stable compatibility dependency for unchanged helpers; it is not the current product identity.
- `functions/_lib/ai/intent-contract.js` — task → action/object/source contract.
- `functions/_lib/ai/parent-semantic-frame.js` — **parent decision meaning owner** for composite questions. It records what is being compared, explicit career targets, hard/soft preferences and evidence needs; it never owns score/region/school/major mutations.
- `functions/_lib/ai/evidence-plan.js` — **bounded decision research planner**. It may schedule at most three evidence steps and does not create another orchestrator.
- `functions/_lib/ai/claim-evidence.js` — **claim provenance contract**. Model-facing facts must retain source/year/scope and time-sensitive quantitative claims fail closed without a year.
- `functions/_lib/ai/official-web-evidence.js` — the only general official-web discovery/reader gateway. Search results are discovery only; claims must come from actually read CHSI, `.gov.cn` or `.edu.cn` pages.
- `functions/_lib/ai/decision-research-runtime.js` — executes the bounded plan through existing deterministic and official-source owners.
- `functions/_lib/ai/turn-orchestrator.js` — the **single turn execution owner**. Atomic task routing remains in the existing deterministic task kernel; only the orchestrator can promote a multi-object/multi-goal turn into `decision_research`.
- `functions/_lib/ai/RESOURCE-BOUNDARY.md` — deterministic fact/resource boundary.
- `aiplus/index.html` — browser entrypoint.
- `aiplus/app.v3990_1.js` — current browser orchestration entry module.
- `functions/_lib/ai/tool-registry.js` — deterministic tool registry/bridge planning. Its v0.02 identifier remains stable because v0.03 reuses the same browser fact bridge rather than inventing another one.

Models may interpret language and explain evidence; they do not own admissions scores, ranks, school/major facts or a parallel admissions probability model. `decision_research` is knowledge/reasoning only and must never commit the candidate active view.

### AIPLuS v0.03 version boundary

The visible AIPLuS product semantics are `v0.03`, while the stable browser advisor shell remains `ai-human-advisor-agent-v0.02` and the current browser core asset transaction remains `aiplus-assets-v002_3`. This is intentional: v0.03 changes server-side parent-decision semantics/evidence orchestration but does not create or rename a browser runtime generation merely for version cleanliness. `aiplus/index.html` exposes both identities separately.

## 3. Known ownership boundaries that must not be guessed away

### AIPLuS workspace transitive generation

**KNOWN-GAP:AIPLUS-WORKSPACE-TRANSITIVE**

The site runtime contract declares the site-level AIPLuS workspace entry under the current site generation, while the browser `aiplus/app.v3990_1.js` currently imports the evolved `shared/ai/ai-workspace-contract.v3992_0.js` implementation (whose model contract is v3992.x). Existing AIPLuS tests intentionally exercise that evolved implementation.

This is a **declared transitive ownership debt**, not permission to copy, rename or delete workspace implementations casually. Until a canonical generation release explicitly reconciles it:

- do not create another workspace state machine;
- do not change persisted workspace semantics merely to make filenames look uniform;
- treat the actual browser import graph plus current tests as execution evidence;
- reconcile the site contract and workspace implementation only in a release that updates all affected contracts/cache/tests together.

### Legacy intent interpreter

`functions/_lib/ai/intent-interpreter.js` remains in the repository, but the architecture audit verifies that current production roots do not import it. Do not reactivate it as a second intent owner. Current AIPLuS atomic intent/task behavior is governed by the current command/task contracts; v0.03 parent-decision composition is owned by the turn orchestrator and must not fork that atomic parser.

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

- `.github/workflows/verify-ai-workspace-v3990_1.yml`

It verifies source contracts, exact Preview behavior, browser journeys and production-facing AIPLuS contracts. A narrow v0.03 parent-decision verifier may supplement this workflow, but it must not replace or weaken the existing AI workspace gate.

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
