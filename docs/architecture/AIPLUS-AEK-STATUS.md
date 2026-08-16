# AIPLuS AEK durable program status

This file is the durable handoff owner for the **AIPLuS Authoritative Education Knowledge (AEK)** program.

## Program rule

AEK is one release line: **AEK-00 -> AEK-10 + AEK-QA**. Completing any single work package does **not** make the program mergeable.

**Merge to `main` is forbidden until all work packages below are complete, the final candidate head SHA is frozen, Draft validation and exact-head Preview validation are green, the PR is marked Ready without changing that head SHA, the second validation is green again, and the normal exact-SHA merge/production closure is complete.**

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

Status values: `TODO`, `IN_PROGRESS`, `DONE`. `DONE` means implementation and the package-specific deterministic verification are complete **and no later system-scale QA has found an unresolved defect that contradicts the package outcome**. If QA finds such a defect, reopen the owning package instead of leaving an optimistic `DONE` marker.

| Work package | Status | Required outcome |
|---|---|---|
| AEK-00 | DONE | Skill, architecture contract, durable handoff/status owner, startup registration, long-lived Draft PR |
| AEK-01 | DONE | First-class `knowledge_explain` task; concept-question semantics; old school/score/candidate context cannot hijack a new concept object |
| AEK-02 | DONE | Structured taxonomy for higher education, majors/disciplines, vocational education, admissions, policies, training, credentials, occupations/industry concepts |
| AEK-03 | DONE | Canonical/versioned entity index with aliases, codes/types, provenance and effective metadata; no generated-article truth store |
| AEK-04 | DONE | Concept relation graph: is-a, parent/child, different-from, often-confused-with, related-to, historical-name/source-specific relations |
| AEK-05 | DONE | Authority registry mapping domain/jurisdiction to approved authoritative sources; no generic web-search ownership fork |
| AEK-06 | DONE | T0-T4 freshness/temperature policy; current cycle/school/dynamic facts cannot be silently satisfied by stale canonical cache |
| AEK-07 | DONE | Unified knowledge resolution/evidence flow reusing the current orchestrator and official/deterministic bridge owners |
| AEK-08 | IN_PROGRESS | Exact/alias/near/source-specific/unknown resolution; non-canonical and cross-level/common labels must fail closed instead of being fabricated or over-resolved |
| AEK-09 | DONE | Answer-First human presentation: plain definition -> type/importance -> practical impact -> confusion/relations -> current evidence -> sources |
| AEK-10 | DONE | Coverage/unknown mining counters and maintainability handoff; high-frequency unknowns become reviewed candidates, never automatic canonical truth |
| AEK-QA | IN_PROGRESS | Multi-turn semantic/source/freshness/fail-closed/browser/full-regression proof; final Draft/Preview/Ready/merge/prod closure |

## Mandatory acceptance journeys

These are examples of classes, not a one-off regex checklist.

1. `沈阳工业大学怎么样` -> then `辽宁省高校专项计划是什么意思` must become a new knowledge object and must not render a沈阳工业大学 identity answer.
2. `高校专项是什么` -> `我家在岫岩，这个能报吗` may reuse the concept but eligibility facts require current authoritative evidence.
3. `高校专项是什么` -> `沈工大有吗` may explicitly reconnect school context and must use school/current-cycle evidence.
4. `材料成型及控制工程是什么` resolves as a canonical undergraduate major.
5. `自动化和控制科学与工程有什么区别` must distinguish undergraduate-major vs graduate-discipline semantics.
6. `材料加工与工业控制是什么` must not be silently invented as an official major; use exact/alias/near/source-specific/unknown resolution.
7. `今年辽宁高校专项有什么要求` requires current-cycle Liaoning authority evidence and must not substitute a prior-cycle rule.
8. Official live source unavailable: stable concept may be explained from canonical evidence, but current eligibility/deadline/school implementation must fail closed.
9. Pure knowledge questions do not commit candidate view or silently activate remembered score.
10. Existing AIPLuS school research, school official, school/major history, major-region, candidate, parent-decision and browser journeys stay green.
11. Common/cross-level education labels such as `电子信息是什么` must not silently select a graduate professional-degree category when ordinary human language does not specify the education level.

## Source strategy decision

Use a hybrid model:

- stable/versioned normative entities -> canonical local structured knowledge with source/version/effective metadata;
- current admissions-cycle, provincial, school-specific and dynamic status -> authoritative live evidence (with bounded caching only when freshness allows);
- no durable free-form encyclopedia prose as business truth;
- unknown is a valid result.

## Current implementation checkpoint

- AEK semantic ownership, taxonomy, relations, authority/freshness routing, unified retrieval, ambiguity handling, Answer-First delivery and coverage counters all exist on the branch and the package-level deterministic verifier currently passes.
- **AEK-03 remains DONE**: the existing 2026 undergraduate catalog is reused as the 883-major canonical source; the full 2022 graduate directory is versioned locally (184 four-digit entities: 117 first-level disciplines + 67 professional-degree categories); vocational current identity is delegated to the Ministry of Education dynamic catalog instead of copying a stale 1349+ shadow truth source.
- Expanded AEK-QA found a routing defect for `位次是什么意思`; that defect was repaired in the knowledge-language owner rather than patched in the orchestrator.
- Expanded AEK-QA then found an unresolved ambiguity defect for `电子信息是什么`: the current resolver over-resolves a common/cross-level label instead of failing closed. Because that contradicts the AEK-08 outcome, **AEK-08 has been reopened to IN_PROGRESS**.
- **This branch is not mergeable.** The next gate is to close the reopened AEK-08 ambiguity class, rerun the full 100+ human journey suite, then complete Draft checks, exact-head Preview/live proof, same-head Ready checks, exact-SHA merge and production closure.

## Current session progress

- Re-read latest `main`, PR #164, current head and repository startup/release skills after a network interruption.
- Confirmed PR #164 remains Draft and unmerged; work continues on `agent/aiplus-authoritative-education-knowledge`.
- Removed the completed temporary AEK canonical builder workflow so it cannot become a second release/test owner.
- Wired AEK package verification, 100+ human journeys and exact-head Preview knowledge probes into the formal AIPLuS parent-decision workflow.
- Current package-level verifier passes taxonomy/canonical/graduate/vocational/authority/relation/unknown/live-evidence checks.
- Current system-scale AEK-QA is intentionally red on the first unresolved acceptance defect; do not bypass or weaken the assertion.

## Handoff instruction

If a future conversation is asked to continue this work:

1. fetch latest `main` and open PRs;
2. find the open AEK PR/branch;
3. read `AGENTS.md`, Eastern Philosophy, Unified Site Release (if applicable), AEK skill, `START-HERE.md`, and this file from the AEK head;
4. inspect the current head SHA/checks/diff;
5. continue the first non-DONE work package;
6. reopen any previously `DONE` package if later QA proves its required outcome is not actually satisfied;
7. never merge just because a single AEK package is green.
