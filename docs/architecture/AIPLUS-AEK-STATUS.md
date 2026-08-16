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

Status values: `TODO`, `IN_PROGRESS`, `DONE`. `DONE` means implementation and the package-specific deterministic verification are complete; it does not remove the whole-program merge gate.

| Work package | Status | Required outcome |
|---|---|---|
| AEK-00 | IN_PROGRESS | Skill, architecture contract, durable handoff/status owner, startup registration, long-lived Draft PR |
| AEK-01 | TODO | First-class `knowledge_explain` task; concept-question semantics; old school/score/candidate context cannot hijack a new concept object |
| AEK-02 | TODO | Structured taxonomy for higher education, majors/disciplines, vocational education, admissions, policies, training, credentials, occupations/industry concepts |
| AEK-03 | TODO | Canonical/versioned entity index with aliases, codes/types, provenance and effective metadata; no generated-article truth store |
| AEK-04 | TODO | Concept relation graph: is-a, parent/child, different-from, often-confused-with, related-to, historical-name/source-specific relations |
| AEK-05 | TODO | Authority registry mapping domain/jurisdiction to approved authoritative sources; no generic web-search ownership fork |
| AEK-06 | TODO | T0-T4 freshness/temperature policy; current cycle/school/dynamic facts cannot be silently satisfied by stale canonical cache |
| AEK-07 | TODO | Unified knowledge resolution/evidence flow reusing the current orchestrator and official/deterministic bridge owners |
| AEK-08 | TODO | Exact/alias/near/source-specific/unknown resolution; non-canonical terms fail closed instead of being fabricated |
| AEK-09 | TODO | Answer-First human presentation: plain definition -> type/importance -> practical impact -> confusion/relations -> current evidence -> sources |
| AEK-10 | TODO | Coverage/unknown mining counters and maintainability handoff; high-frequency unknowns become reviewed candidates, never automatic canonical truth |
| AEK-QA | TODO | Multi-turn semantic/source/freshness/fail-closed/browser/full-regression proof; final Draft/Preview/Ready/merge/prod closure |

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

## Source strategy decision

Use a hybrid model:

- stable/versioned normative entities -> canonical local structured knowledge with source/version/effective metadata;
- current admissions-cycle, provincial, school-specific and dynamic status -> authoritative live evidence (with bounded caching only when freshness allows);
- no durable free-form encyclopedia prose as business truth;
- unknown is a valid result.

## Current session progress

- Re-read latest `main` and confirmed program start base SHA `a9cc98d3601008f5337b2b9a0b030f070ffeccfb`.
- Confirmed there were no open PRs at program start.
- Read `AGENTS.md`, Eastern Philosophy skill, Unified Site Release skill and `docs/architecture/START-HERE.md`.
- Created program branch `agent/aiplus-authoritative-education-knowledge`.
- Added `docs/skills/aiplus-authoritative-education-knowledge/SKILL.md`.
- Next: register the skill in startup/handoff docs, create the long-lived Draft PR, audit current semantic/evidence owners, then implement AEK-01 onward on this same branch.

## Handoff instruction

If a future conversation is asked to continue this work:

1. fetch latest `main` and open PRs;
2. find the open AEK PR/branch;
3. read `AGENTS.md`, Eastern Philosophy, Unified Site Release (if applicable), AEK skill, `START-HERE.md`, and this file from the AEK head;
4. inspect the current head SHA/checks/diff;
5. continue the first non-DONE work package;
6. never merge just because a single AEK package is green.
