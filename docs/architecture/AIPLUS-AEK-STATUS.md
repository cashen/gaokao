# AIPLuS AEK durable program status

This file is the durable handoff owner for the **AIPLuS Authoritative Education Knowledge (AEK)** program and its post-release remediation line.

## Program rule

AEK is one architectural line: **AEK-00 -> AEK-10 + AEK-QA**. A package marked `DONE` may be reopened whenever later system QA or production behavior produces a counterexample. Production evidence outranks an optimistic ledger entry.

A branch is not mergeable merely because implementation exists or a prior head was green. The current candidate must pass Draft validation, exact-head immutable Cloudflare Preview validation, Ready validation on the **same frozen SHA**, `expected_head_sha` merge, then main/Actions/Cloudflare Production/live-behavior closure.

## Repository / active remediation line

- Repository: `cashen/gaokao`
- Base branch: `main`
- Original AEK program branch / PR: `agent/aiplus-authoritative-education-knowledge` / PR #164
- PR #164 final candidate: `5a131b47d5a0bb44c3a16a69c21afd71b927cde1`
- PR #164 merge commit on main: `42d65d33539fb287b3b1645fade64af58271a844`
- Active post-merge remediation branch / PR: `agent/aiplus-major-introduction-knowledge` / PR #165
- PR #165 base: PR #164 merge commit above
- Public AIPLuS product/runtime identity remains the existing release identity unless a release contract change becomes unavoidable and is governed atomically.

## Architectural owners that must remain singular

- human query semantic slots: `functions/_lib/ai/human-query-frame.js`;
- atomic command/task semantics: existing command interpreter + task kernel/contracts;
- AEK language entry: `functions/_lib/ai/knowledge-language.js`;
- canonical education knowledge/entity resolution: existing AEK knowledge center/runtime;
- turn execution: `functions/_lib/ai/turn-orchestrator.js`;
- deterministic admissions facts: existing score/rank/history/major-region owners;
- official-web discovery/reader: existing official-web evidence owner;
- browser/workspace/history/rendering: existing AIPLuS owners;
- release identity: `shared/resources/release/current-release.js`.

Do not create a second knowledge chatbot, second intent runtime, second score/history truth set, second workspace, second renderer, second crawler or second release identity.

## Work package ledger

Status values: `TODO`, `IN_PROGRESS`, `DONE`.

`DONE` means implementation plus package/system-scale proof are complete **and no later QA/production evidence has an unresolved contradiction**. A later counterexample reopens the owning package; assertions must not be weakened to preserve a green badge.

| Work package | Status | Required outcome |
|---|---|---|
| AEK-00 | DONE | Skill, architecture contract, durable handoff/status owner, startup registration |
| AEK-01 | **DONE** | First-class `knowledge_explain` task and robust human-language entry; old school/major/score/candidate context cannot hijack a new concept object |
| AEK-02 | DONE | Structured education/admissions taxonomy |
| AEK-03 | DONE | Canonical/versioned entity index with aliases, codes/types and provenance |
| AEK-04 | DONE | Concept relation graph |
| AEK-05 | DONE | Authority registry and source ownership |
| AEK-06 | DONE | T0-T4 freshness policy and live-evidence boundary |
| AEK-07 | DONE | Unified knowledge resolution/evidence flow reusing existing orchestrator/tool owners |
| AEK-08 | DONE | Exact/alias/near/source-specific/unknown resolution; ambiguity fails closed |
| AEK-09 | DONE | Answer-First knowledge presentation |
| AEK-10 | DONE | Coverage/unknown governance and maintainability handoff |
| AEK-QA | **DONE** | Matrix-driven human semantic/source/freshness/context/execution/exact-Preview/full-regression proof completed; later counterexamples must reopen this row |

### Why AEK-01 / AEK-QA were reopened after PR #164

PR #164 passed its pre-merge gates and was released, but production use then produced normal-parent-language counterexamples that contradicted the claimed routing completeness:

1. `介绍下电气工程及自动化 专业` fell to legacy `general_advice` / “建立可行范围” instead of `knowledge_explain`.
2. `介绍下高校专项计划` could be hijacked by remembered school context and answer the previous school.
3. `什么是特控线` could be hijacked by remembered major context and answer the previous major.

These were not missing AEK data. They demonstrated that **human language -> semantic slots -> task routing** was too fragmented and relied on multiple overlapping regex owners. PR #165 reopened AEK-01 / AEK-QA and fixed the class through shared semantic slots plus permanent combinatorial matrices rather than phrase-specific patches.

## Post-merge remediation architecture (PR #165)

### Shared human query frame

`functions/_lib/ai/human-query-frame.js` is the shared lexical/semantic-slot owner. It parses structure but does not own business facts:

- score point vs score window (`range`, lower-bound, upper-bound);
- collection scope such as all/each school majors;
- school semantic topic (research/background/experience/official/history/all majors);
- major semantic topic (background/history/school-list).

The command interpreter and task kernel consume these slots instead of independently re-guessing the same meaning.

### Score-window invariant

A query such as `500-600 省内所有会计专业` is a **historical-record window**, not a candidate with score 500:

- `command.score === null`;
- `scoreConstraint.kind === 'range'`;
- min/max are 500/600;
- task is `major_region_history`;
- `scoreUsage === 'suspended'`;
- min/max are carried into the existing `/api/ai/major-history` owner;
- filtering occurs before pagination and summary;
- ordinary point input such as `580分省内会计专业` remains candidate semantics.

### Entity ownership invariant

When the canonical school resolver has confirmed an alias, heuristic full-name extraction must not fabricate an overlapping school from adjacent Chinese characters. Example class: a compact alias ending in `大` followed by a topic beginning with `学...` must not become a fake `...大学` entity.

## Permanent matrix strategy

The user must not be required to discover routing defects one sentence at a time. PR #165 introduces permanent combinatorial verification that approximates exhaustive human-language coverage across **intent × entity type × word order × modifiers × scope × score expression × region × context state × correction/follow-up**.

Permanent matrix owners:

- `tools/verify-aiplus-aek-human-language-v001.mjs`
- `tools/verify-aiplus-human-intent-matrix-v001.mjs`
- `tools/verify-aiplus-routing-grid-v001.mjs`
- `tools/verify-aiplus-school-topic-grid-v001.mjs`
- `tools/verify-aiplus-major-topic-grid-v001.mjs`

They are explicitly orchestrated by the existing formal workflow `.github/workflows/verify-aiplus-parent-decision-v003.yml`; they are not imported into the AEK package verifier, avoiding duplicate test ownership.

### Matrix evidence

The permanent verifiers established and the formal Draft gate re-ran the following regression baseline:

- routing combinatorial grid: **38,081 assertions**, including **5,184 score-window routing combinations**;
- school-topic grid: **4,024 assertions**;
- major-topic grid: **4,644 assertions**;
- AEK human-language grid: **19,575 route assertions**;
- AEK journeys: **129** (81 single-turn + 48 multi-turn; 883 canonical undergraduate majors + existing aliases covered);
- human-dialog regression: **48 scenarios**;
- legacy major-region full-pagination regression, including the 283-record global electrical truth set and full pagination exhaustion;
- architecture handoff and existing AIPLuS workspace/UI/runtime/browser regressions.

The matrix development sequence also found defects that the user had not reported, including all-major school history phrasing, compact school-alias/topic collisions, school-background routing, major-background vs major-history priority, and a `null -> 0` score-window execution bug. Each was fixed at the owning semantic layer; no assertion was weakened.

All temporary patch/workflow/diagnostic files are absent from the final PR diff. The formal parent-decision source-contract also asserts the known temporary construction artifacts are absent.

## Mandatory acceptance classes

These are **classes**, not a one-off phrase checklist.

1. Definition/introduction grammar: `X是什么`, `什么是X`, `X什么意思`, `介绍/讲讲/说说/聊聊/了解 X`, suffix introduction forms.
2. Same knowledge grammar under empty, remembered-school and remembered-major contexts; old context must not hijack a new knowledge object.
3. All 883 canonical 2026 undergraduate majors plus existing shared major aliases must enter the proper AEK owner for pure explanation/introduction.
4. Cross-level/common labels such as `电子信息` must still fail closed when ordinary language is ambiguous; broader routing must not increase fabrication.
5. School research/background/experience/official/history must remain distinct under compact aliases and varied word order.
6. School + all/each-major scope + history language must remain `school_history`, not `general_advice` or a fabricated single major.
7. Major + region + background language must route to `major_background`; the same major + region + score/history language must route to `major_region_history`.
8. Score windows and upper/lower bounds must remain record filters, while one-point scores remain candidate semantics.
9. Score-window filtering must preserve pagination truth, completeness, ordering and source totals; no unbounded fan-out or second data source.
10. Existing candidate, school-major history, school history, major-region, school official, school experience, parent-decision and browser journeys must remain green.
11. Current-cycle policy facts require current authoritative evidence or explicit fail-closed behavior.
12. Exact-head Preview must prove deployed behavior, not only source-level interpretation.

## Formal PR #165 proof

On clean Draft candidate `3f46711bb34c2fc28bde9ddfb55a0bd28b5235f3`:

- all **12/12 PR workflows completed successfully**;
- parent-decision source-contract passed the permanent matrices and preserved AIPLuS regressions;
- exact-head immutable Cloudflare Preview passed human semantic/API journeys;
- production API health, major-region, resource graph, canonical/LN/runtime, native chooser, architecture handoff and Worker Preview all passed;
- AI workspace/browser passed source, exact Preview, PC/Pad/Android human-semantic journeys and four-viewport mocked-parent journeys.

Exact-head Preview explicitly proved real `/api/ai/turn` and `/api/ai/major-history` behavior for:

- canonical major explanation;
- cross-level ambiguity fail-closed;
- compound/source-specific fail-closed;
- remembered-school knowledge firewall;
- `介绍下高校专项计划` firewall;
- `什么是特控线` firewall;
- spoken major alias introduction resolving to canonical code `080601`;
- `500-600 省内所有会计专业` preserving a range slot and generating a bounded major-history tool request;
- the actual major-history API returning no record outside 500-600 and a consistent filtered summary;
- current Liaoning special-plan rules requiring verified authoritative evidence or fail-closed `needs_fact`.

## Current closure status

PR #164 release closure is complete and its production counterexamples are the reason for PR #165.

A one-shot CI stale-run canceller was used after the matrix development sequence generated many obsolete PR runs. It was scoped only to PR #165 branch pull-request runs, cancelled the obsolete queue, and was removed immediately. It is not part of the product or final diff. No stale-run result is used as release evidence.

AEK-01 and AEK-QA are now `DONE` because the clean implementation candidate completed the formal Draft + exact-head proof above. **This ledger closure commit changes the PR SHA**, so it must itself receive a fresh complete Draft proof before the SHA can be frozen. After that:

1. freeze the final head SHA;
2. mark Ready without changing the SHA;
3. complete second-round Ready checks on that same SHA;
4. `expected_head_sha` merge;
5. verify main/push workflows/Cloudflare Production/live production journeys.

Any new system/production counterexample reopens the owning package; do not preserve `DONE` by weakening a matrix.

## Handoff instruction

A future maintainer/conversation must:

1. fetch latest `main` and PR #165, not assume this file's SHA is still current;
2. read `AGENTS.md`, Eastern Philosophy, Unified Site Release when applicable, AEK skill, `START-HERE.md`, and this file;
3. inspect the exact PR head, diff and checks;
4. continue from the **first real red matrix/gate**, fixing the owning semantic class rather than adding a phrase special-case;
5. if later QA/production disproves a package, reopen it instead of weakening checks;
6. keep temporary construction artifacts out of the final diff;
7. freeze one final SHA, prove Draft + exact Preview, mark Ready without SHA change, prove again, merge with `expected_head_sha`, then complete production closure.
