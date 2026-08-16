# AIPLuS AEK durable program status

This file is the durable handoff owner for the **AIPLuS Authoritative Education Knowledge (AEK)** program.

## Program rule

AEK is one release line: **AEK-00 -> AEK-10 + AEK-QA**. Completing any single work package does **not** make the program mergeable.

**Merge to `main` is forbidden until all work packages below are complete, the final candidate head SHA is frozen, Draft validation and exact-head Preview validation are green, the PR is marked Ready without changing that head SHA, the second validation is green again, and the normal exact-SHA merge/production closure is complete.**

Work-package completion and release closure are intentionally tracked separately. A work package may be `DONE` when its implementation and system-scale proof are complete. Ready/second-round/merge/production are external release gates and must not be written back into the frozen candidate merely to record their completion, because that would mutate the SHA being proved. PR #164 checks, merge metadata and production deployment evidence are the source of truth for those external gates.

New maintainers/new ChatGPT conversations must read the AEK branch/PR, this status file and the AEK skill before changing code. Do not restart the program from chat history or treat a partial branch as abandoned merely because the prior conversation ended.

## Repository / branch

- Repository: `cashen/gaokao`
- Base branch: `main`
- Program branch: `agent/aiplus-authoritative-education-knowledge`
- Base SHA at program start: `a9cc98d3601008f5337b2b9a0b030f070ffeccfb`
- Public AIPLuS product remains on the existing release/runtime identity unless an active-generation change becomes unavoidable and is released atomically under Unified Site Release Governance.

## Architectural owners that must remain singular

- atomic command/task semantics: current command interpreter + task kernel/contracts;
- turn execution: `functions/_lib/ai/turn-orchestrator.js`;
- general official-web discovery/reader: `functions/_lib/ai/official-web-evidence.js`;
- deterministic admissions facts: existing score/rank/history/major-region owners;
- browser/workspace/history/rendering: existing AIPLuS owners;
- release identity: `shared/resources/release/current-release.js`.

Do not create a second knowledge chatbot, workspace, renderer, admissions truth set, web crawler or release identity.

## Work package ledger

Status values: `TODO`, `IN_PROGRESS`, `DONE`. `DONE` means implementation and package/system-scale verification are complete **and no later QA has found an unresolved defect that contradicts the package outcome**. If later QA finds such a defect, reopen the owning package instead of leaving an optimistic `DONE` marker.

| Work package | Status | Required outcome |
|---|---|---|
| AEK-00 | DONE | Skill, architecture contract, durable handoff/status owner, startup registration, long-lived Draft PR |
| AEK-01 | DONE | First-class `knowledge_explain` task; definition, current-rule and eligibility question semantics; old school/score/candidate context cannot hijack a new concept object |
| AEK-02 | DONE | Structured taxonomy for higher education, majors/disciplines, vocational education, admissions, policies, training, credentials, occupations/industry concepts |
| AEK-03 | DONE | Canonical/versioned entity index with aliases, codes/types, provenance and effective metadata; no generated-article truth store |
| AEK-04 | DONE | Concept relation graph: is-a, parent/child, different-from, often-confused-with, related-to, historical-name/source-specific relations |
| AEK-05 | DONE | Authority registry mapping domain/jurisdiction to approved authoritative sources; no generic web-search ownership fork |
| AEK-06 | DONE | T0-T4 freshness/temperature policy; current cycle/school/dynamic facts cannot be silently satisfied by stale canonical cache |
| AEK-07 | DONE | Unified knowledge resolution/evidence flow reusing the current orchestrator and official/deterministic bridge owners |
| AEK-08 | DONE | Exact/alias/near/source-specific/unknown resolution; non-canonical and cross-level/common labels fail closed instead of being fabricated or over-resolved |
| AEK-09 | DONE | Answer-First human presentation: plain definition -> type/importance -> practical impact -> confusion/relations -> current evidence -> sources |
| AEK-10 | DONE | Coverage/unknown mining counters and maintainability handoff; high-frequency unknowns become reviewed candidates, never automatic canonical truth |
| AEK-QA | DONE | Multi-turn semantic/source/freshness/fail-closed/exact-Preview/browser/full-regression proof on one candidate lineage; external release closure remains governed separately below |

## Mandatory acceptance journeys

These are examples of classes, not a one-off regex checklist.

1. `沈阳工业大学怎么样` -> then `辽宁省高校专项计划是什么意思` must become a new knowledge object and must not render a沈阳工业大学 identity answer.
2. `高校专项是什么` -> `我家在岫岩，这个能报吗` may reuse the concept but eligibility facts require current authoritative evidence.
3. `高校专项是什么` -> `沈工大有吗` may explicitly reconnect school context and must use school/current-cycle evidence.
4. `材料成型及控制工程是什么` resolves as a canonical undergraduate major.
5. `自动化和控制科学与工程有什么区别` must distinguish undergraduate-major vs graduate-discipline semantics.
6. `材料加工与工业控制是什么` must not be silently invented as an official major; use exact/alias/near/source-specific/unknown resolution.
7. `今年辽宁高校专项有什么要求` requires current-cycle Liaoning authority evidence and must not substitute a prior-cycle rule. Direct first-turn variants such as `谁能报`、`需要什么条件`、`怎么报名`、`报名截止什么时候` must enter the same knowledge owner rather than fall through to general advice.
8. Official live source unavailable: stable concept may be explained from canonical evidence, but current eligibility/deadline/school implementation must fail closed.
9. Pure knowledge questions do not commit candidate view or silently activate remembered score.
10. Existing AIPLuS school research, school official, school/major history, major-region, candidate, parent-decision and browser journeys stay green.
11. Common/cross-level education labels such as `电子信息是什么` must not silently select a graduate professional-degree category when ordinary human language does not specify the education level. The same rule applies to other catalog-backed broad labels when an ordinary label can map to a different undergraduate major/category surface.
12. Explicit disambiguation must remain available: an exact graduate catalog code such as `0854` may resolve directly, while an explicit undergraduate category label such as `电子信息类` must resolve to that undergraduate category.

## Source strategy decision

Use a hybrid model:

- stable/versioned normative entities -> canonical local structured knowledge with source/version/effective metadata;
- current admissions-cycle, provincial, school-specific and dynamic status -> authoritative live evidence (with bounded caching only when freshness allows);
- no durable free-form encyclopedia prose as business truth;
- unknown is a valid result.

## Final implementation proof before freeze

Head `f867059b3452a37b40e30a43fc5394569449696d` is the completed implementation/reference-proof head immediately before this ledger-only closure commit.

- All **14 PR workflows** on that head completed `success`, including architecture handoff, unified resource graph, Worker Preview, root home generation, region school directory, AIPLuS parent decision, canonical release, native chooser, LN final release, production release pre-merge contract, production API health pre-merge contract, AI major-region history, unified site runtime and AI decision workspace/browser Preview.
- Formal AIPLuS parent-decision `source-contract` passed protected-path ownership, syntax, AEK package verification, the 100+ human journey suite and all preserved AIPLuS regression gates.
- Exact immutable Cloudflare Preview `https://98127d19.gaokao-4y9.pages.dev` reported deployment SHA `f867059b3452a37b40e30a43fc5394569449696d` and passed the product/health boundaries.
- Real Preview `POST /api/ai/turn` proved: `材料成型及控制工程是什么` -> canonical undergraduate `080203`; `电子信息是什么` -> `needs_clarification` / `ambiguous` / no fabricated canonical identity; `材料加工与工业控制是什么` -> fail-closed compound/source-specific state; remembered沈阳工业大学 context did not leak into `辽宁省高校专项计划是什么意思`; `今年辽宁高校专项有什么要求` -> `knowledge_explain`, canonical `special:辽宁省高校专项`, `liveRequired=true`, and when the live authoritative page was not verified it returned `needs_fact` with an explicit fail-closed boundary instead of substituting stale facts.
- PC/Pad/Android human-semantic browser journeys and the four-viewport AIPLuS mocked-parent journeys passed.
- The canonical alias repair for `辽宁省高校专项` passed AEK package, 100+ human journeys, parent semantics, human-dialog and architecture handoff before commit. Its temporary repair workflow self-deleted and is absent from the final changed-file set.

These results close AEK-01, AEK-03, AEK-08 and AEK-QA. Any later counterexample must reopen the owning package rather than weaken an assertion.

## Release closure gates

The commit containing this ledger is intended to become the **final frozen candidate head** if its own Draft checks and exact-head Preview are green. Resolve the exact SHA from PR #164; do not change the branch merely to write that SHA or later gate results back into this file.

- Final-candidate Draft validation: **PENDING external check after this ledger commit**.
- Final-candidate exact-head Cloudflare Preview: **PENDING external check after this ledger commit**.
- Ready transition: **PENDING**; must not change final head SHA.
- Ready second validation: **PENDING**; must prove the same final head SHA again.
- Merge: **PENDING**; must use `expected_head_sha` equal to the frozen candidate.
- Production closure: **PENDING**; after merge, verify main identity, push workflows, Cloudflare Production, `/api/ai/health`, `/aiplus/`, and production behavior/evidence.

External gate completion is deliberately not committed back into the frozen branch. PR #164 checks/merge record and post-merge production evidence are the durable source of truth for those gates.

## Current session progress

- Re-read latest `main`, PR #164, current head and repository startup/release skills after a network interruption; no historical completion claim was trusted without code/check evidence.
- Removed completed temporary construction workflows so they cannot become a second release/test owner.
- Wired AEK package verification, 100+ human journeys and exact-head Preview knowledge probes into the formal AIPLuS parent-decision workflow.
- Repaired the `位次` knowledge routing gap in the knowledge-language owner.
- Repaired cross-level/common-label ambiguity in the canonical resolver by reusing the existing undergraduate catalog owner; no phrase-specific parallel catalog was created.
- Repaired direct current-rule/eligibility routing in `knowledge-language.js`, expanded first-turn and remembered-context policy journeys, and preserved the >=1/3 multi-turn quality gate.
- Repaired the canonical alias metadata gap for `辽宁省高校专项` inside the existing canonical concept; no global suffix-dropping heuristic or second alias table was introduced.
- Hardened the exact-head Preview gate without weakening it: canonical deployment SHA is checked, Functions edge-readiness is bounded on the same immutable URL, and real journey diagnostics expose task/status/resolution/canonical/live boundaries.
- Completed the reference Draft + exact-head Preview + browser/full regression proof on `f867059b3452a37b40e30a43fc5394569449696d` with all 14 PR workflows successful.

## Handoff instruction

If a future conversation is asked to continue this work:

1. fetch latest `main` and PR #164;
2. read `AGENTS.md`, Eastern Philosophy, Unified Site Release (if applicable), AEK skill, `START-HERE.md`, and this file from the PR head;
3. inspect the exact current head SHA/checks/diff;
4. if every AEK work package above is `DONE`, continue only the first incomplete **release closure gate** without changing the frozen head;
5. if later QA disproves a package outcome, reopen the owning package and return the PR to Draft rather than weakening the check;
6. never merge merely because a prior head was green; prove the current frozen head, then Ready without SHA change, prove it again, merge with `expected_head_sha`, and complete production closure.
