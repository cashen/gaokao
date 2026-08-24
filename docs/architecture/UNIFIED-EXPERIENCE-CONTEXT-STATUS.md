# Unified Experience Context (UEC) · durable program status
## Current main snapshot (2026-08-24 audit)

- Latest canonical `main`: `ffc080979341f7a4dfb593986bc791aef3bfb076`.
- Audit baseline had no open PR; the five existing Production status checks on that SHA were green.
- Whole-site public release identity is `v3.9.90.2 / v3990_2 / 3990_2`; capability-local identities below remain subordinate and are not separate site releases.
- The historical PR/SHA entries in this file remain evidence only. Any new change starts from the latest `main` and follows the unified Draft → exact Preview → Ready same-SHA → merge → Production protocol.


This file is the durable handoff owner for the Unified Experience Context program. A network interruption or new maintainer must resume from GitHub state, not from chat memory.

## Program identity and merge gate

- Repository: `cashen/gaokao`
- Base branch: `main`
- Program branch: `agent/unified-experience-context-v001`
- Program identity: `unified-experience-context-v0.01`
- Base main at program start: `ea502d150772c7089fa2e94742b4e895cb33b5bf`
- Goal: make Tongxue the single bounded **Student Voice evidence gateway** shared by Tongxue, ln-rank, major-path and AIPLuS without changing admissions truth, canonical-major truth, academic-background truth, official-school truth, ranking, recommendation scoring or release ownership.

**UEC-00 through UEC-10 and UEC-QA are one release line. Do not merge because an individual package is green.** Final merge requires one frozen head SHA, complete Draft proof, exact-head Cloudflare Preview proof, Ready proof on the same SHA, `expected_head_sha` merge, then exact-main Actions/Cloudflare Production/live closure.

## Mandatory reconnect procedure

1. Fetch latest `main` and PR #182; never assume the SHA recorded here is current.
2. Read `AGENTS.md`, `docs/skills/eastern-philosophy/SKILL.md`, `docs/skills/unified-site-release/SKILL.md`, and AEK skill when AIPLuS evidence semantics are involved.
3. Read `docs/architecture/START-HERE.md` and this file.
4. Inspect exact PR diff and exact-head checks.
5. Continue the first package not marked DONE, or reopen a DONE package if later proof contradicts it.
6. Never weaken a verifier merely to preserve a green ledger.

GitHub state is the continuation source of truth.

## Evidence ownership

The site keeps five evidence responsibilities separate:

1. **Admissions truth** — ln-rank / major-bands / school-major history.
2. **Canonical major truth** — major-path / AEK and the existing 2026 major resolver/catalog.
3. **Academic background evidence** — Unified Background Context.
4. **Official school evidence** — existing AIPLuS official-school source owner.
5. **Student Voice evidence** — UEC bounded UGC evidence.

AIPLuS may compose these evidence classes for family reasoning; it does not become their fact owner.

Student Voice must never become an official fact, admission probability, platform score, hidden recommendation bonus, school-strength score or major-strength score.

## Scope and topic contract

Strict scopes:

- `school`
- `major`
- `school_major`

Scope may never silently widen or narrow. Missing `school_major` evidence cannot fall back to school-wide or cross-school major reviews without an explicit user action.

School topics:

- `general`
- `living`
- `dormitory`
- `cafeteria`
- `environment`
- `management`
- `teaching`
- `campus`

Major-experience topics:

- `major_learning`
- `course_load`
- `difficulty`
- `math_physics`
- `programming`
- `lab_project`
- `internship`
- `postgraduate`
- `employment_perception`
- `transfer_regret`
- `expectation_gap`

`employment_perception` is a student perception, never an employment rate or deterministic outcome.

## Singular owners preserved

- School identity: `shared/resources/schools/school-identity-center.js`
- Undergraduate major identity: existing 2026 catalog + major-understanding resolver
- Student Voice semantics: `shared/resources/experience/student-voice-contract.v001.js`
- Student Voice source mirrors: `shared/resources/experience/student-voice-source-registry.v001.js`
- Student Voice source execution: `functions/_lib/student-voice-source.js`
- Tongxue browser state/render: current Tongxue runtime controller/result owners
- AIPLuS turn execution: `functions/_lib/ai/turn-orchestrator.js`
- AIPLuS deterministic bridge: existing `functions/_lib/ai/tool-registry.js`
- AIPLuS Student Voice bridge: `functions/_lib/ai/student-voice-tool-adapter.js`
- major-path professional truth/search: existing v0.02 core
- major-path presentation/viewport: existing v0.04 owner
- ln-rank admissions state/query truth: existing workspace/major-bands/school-majors owners
- Navigation transactions: existing shared interaction owner
- Release identity: `shared/resources/release/current-release.js`

Do not create a second school resolver, major catalog, review database, recommendation/ranking model, AIPLuS agent, workspace or release identity.

A release-candidate re-audit on 2026-08-21 found that an intermediate UEC revision had unintentionally replaced large unrelated portions of `functions/_lib/ai/tool-registry.js`. That contradiction reopened the owner audit. The file was then restored from current `main` and only the Student Voice adapter import plus legacy/new Student Voice delegation were reapplied. Focused workspace, human-dialog, AIPLuS v0.02, platform-upgrade, school-history and UEC gates all passed after this ownership restoration. Future work must preserve that minimal diff.

## Source and retention boundary

The source publishes the mirror family:

- `https://srgaoxiao.cn`
- `https://srgaoxiao.com`
- `https://eo.srgaoxiao.cn`
- `https://eo.srgaoxiao.com`

They are mirrors of one source, not four evidence sources. UEC centralizes mirror/failover ownership and keeps bounded retries.

UEC does not build a permanent mirror of the full UGC corpus. Runtime behavior uses bounded live retrieval, short-lived caching, bounded normalized excerpts, source provenance and fetched time. Source/API capabilities that cannot be verified fail closed; no endpoint is guessed.

## Sample-size presentation

- 1 matching item: one student's statement; no synthesis.
- 2 matching items: show both; no “common view”.
- 3–4 matching items: bounded recent-voices grouping may be shown; no “most students”.
- 5+ matching items: themes may be summarized with visible sample count.
- Disagreement remains visible.
- Verification/likes/ratings are provenance only and never hidden ranking weights.

## Work package ledger

Status values: `TODO`, `IN_PROGRESS`, `DONE`. DONE means implementation plus package/system proof exists and no later contradiction remains.

| Package | Status | Implemented / proved outcome |
|---|---|---|
| UEC-00 | **DONE** | Durable architecture/reconnect/merge gate and evidence boundaries. |
| UEC-01 | **DONE** | One mirror registry, source capability/schema audit, bounded failover and fail-closed capability classification. No guessed professional endpoint. |
| UEC-02 | **DONE** | Shared Student Voice scope/topic/provenance/sample contract; AIPLuS compatibility surface points to the shared owner. |
| UEC-03 | **DONE** | Existing canonical school identity and canonical 2026 major resolver bind evidence; ambiguous class/trial/special labels fail closed. |
| UEC-04 | **DONE** | Topic-aware bounded retrieval moved to the source gateway with page/time/byte ceilings, dedupe and no page-1-only false no-content. |
| UEC-05 | **DONE** | Sample size, recency/provenance and disagreement boundaries are encoded and verified; verification/likes do not affect ranking. |
| UEC-06 | **DONE** | Tongxue keeps its existing school runtime owner and gains bounded Student Voice presentation/direct scope handling without a second runtime. |
| UEC-07 | **DONE** | ln-rank concrete-major handoff uses canonical major identity and same-origin return; no copied admissions result state. |
| UEC-08 | **DONE** | major-path adds Student Voice after canonical professional/graduate content; it does not replace academic-background evidence. |
| UEC-09 | **DONE** | AIPLuS orchestrator consumes unified `runStudentVoice`; legacy `runSchoolExperience` remains a compatibility wrapper only. Official/outcome facts cannot be sourced from UGC. |
| UEC-10 | **DONE** | Source health, mirror/schema-drift verifier, bounded failover/cache contracts and maintainability handoff are permanent. |
| UEC-QA | **DONE** | Current main `ffc080979341f7a4dfb593986bc791aef3bfb076` has the merged UEC implementation and green `production/unified-experience-context-v0.01`; future changes start from latest main and rerun the unified release protocol. |

## Permanent proof surfaces

- `.github/workflows/verify-unified-experience-context-v001.yml`
- `tools/verify-unified-experience-context-v001.mjs`
- `tools/verify-aiplus-student-voice-v001.mjs`
- `tools/verify-student-voice-source-health-v001.mjs`
- `tools/verify-student-voice-navigation-v001.mjs`
- existing Tongxue, major-path, AIPLuS, canonical-release, resource-graph, school-history and browser workflows.

The final candidate must contain no temporary repair/builder workflow.

## Required acceptance classes before merge

- `辽宁石油化工大学宿舍怎么样` → school Student Voice living/dormitory evidence, visibly separate from official school facts.
- `电气工程及其自动化学生怎么说` → major voice only when source capability and canonical major binding are verified; otherwise explicit fail-closed state.
- `沈工大电气学生怎么说` → `school_major` only if both identities and source evidence are bound.
- `沈工大电气就业率多少` → Student Voice is not an allowed fact source.
- `沈工大电气学生觉得就业怎么样` → `employment_perception` is allowed as UGC perception.
- `计算机类` does not silently become `计算机科学与技术`.
- `工科试验班` does not become a canonical major.
- Missing `school_major` evidence does not fall back silently.
- Source unavailable/schema drift/timeout fails closed.
- Existing Tongxue school search/entity/campus behavior remains green.
- Existing ln-rank admissions truth, major-path 883/92/13 truth, UBC background and AIPLuS official/decision journeys remain green.
- No Student Voice field influences deterministic ranking, admissions probability, platform score or hidden recommendation bonus.
- PC / Pad / Android / compact have no horizontal overflow and no device-specific business branch.

## Current next action

UEC implementation packages are closed. Continue **UEC-QA only**:

1. Re-read current `main` and exact PR head.
2. Confirm the PR diff has no protected path, no temporary workflow and only the minimal intended `tool-registry.js` Student Voice delta.
3. Require all fresh Draft workflows for that exact head to complete successfully.
4. Obtain and verify an immutable Cloudflare Preview for that exact head; exercise Student Voice journeys and multi-terminal geometry.
5. Freeze that SHA.
6. Mark PR Ready without changing the SHA.
7. Run a second fresh full verification round on the same SHA.
8. Merge using `expected_head_sha` only after all second-round checks are green.
9. Verify exact new main, push workflows, Cloudflare Production, Pages/custom domain and live UEC journeys.

Any contradiction reopens the owning package. “PR merged” is not completion.
