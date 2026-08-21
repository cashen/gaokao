# Unified Experience Context (UEC) · durable program status

This file is the durable handoff owner for the Unified Experience Context program. It exists so a network interruption, new ChatGPT session, or new maintainer can resume from GitHub state without reconstructing intent from private chat history.

## Program identity and merge gate

- Repository: `cashen/gaokao`
- Base branch: `main`
- Program branch: `agent/unified-experience-context-v001`
- Program identity: `unified-experience-context-v0.01`
- Base main at program start: `ea502d150772c7089fa2e94742b4e895cb33b5bf`
- Product goal: turn Tongxue from an isolated school-review surface into the single bounded **Student Voice evidence gateway** shared by Tongxue, ln-rank, major-path and AIPLuS without changing admissions truth, canonical major truth, academic-background truth, official-school truth, ranking logic, recommendation scoring or release ownership.

**Do not merge this program after an individual package is complete. UEC-00 through UEC-10 and UEC-QA are one release line.** Final merge requires one frozen head SHA, complete Draft proof, exact-head Cloudflare Preview proof, Ready proof on the same SHA, `expected_head_sha` merge, then exact-main Actions/Cloudflare Production/live closure.

## Mandatory reconnect procedure

On every continuation after network interruption:

1. Fetch latest `main` and this PR; never assume the SHA in this file is current.
2. Read `AGENTS.md`.
3. Read `docs/skills/eastern-philosophy/SKILL.md`.
4. Read `docs/skills/unified-site-release/SKILL.md` for any production/runtime/UI/release work.
5. Read `docs/skills/aiplus-authoritative-education-knowledge/SKILL.md` if AIPLuS semantics/evidence routing is touched.
6. Read `docs/architecture/START-HERE.md` and this file.
7. Inspect the exact PR diff and current checks.
8. Continue the **first package whose GitHub status is not DONE or whose later proof has produced a contradiction**.
9. Do not preserve a green ledger by weakening assertions; reopen the owning package when production/system QA disproves it.

GitHub state is the source of continuation truth. PR comments may add evidence links, but this file owns package state and next action.

## Product model

The site keeps five evidence responsibilities distinct:

1. **Admissions truth** — ln-rank / major-bands / school-major history: score, rank and admissions records.
2. **Canonical major truth** — major-path / AEK: official undergraduate identity, code, catalog hierarchy and graduate-path understanding.
3. **Academic background evidence** — Unified Background Context: school × canonical major evidence from existing verified academic-background sources.
4. **Official school evidence** — AIPLuS official source owner: current charter, fees, living conditions and other school-official facts.
5. **Student Voice evidence** — this program: bounded UGC experience evidence. It may describe what students reported; it must never become official fact, admission probability, hidden recommendation bonus or school/major strength score.

AIPLuS may compose these evidence types for family reasoning, but it does not become the fact owner for any of them.

## Student Voice scope model

UEC recognizes three scopes:

- `school` — school-wide experience such as dormitory, cafeteria, environment, management, teaching and campus life.
- `major` — cross-school student experience about one canonical undergraduate major.
- `school_major` — experience explicitly bound to both a canonical school entity and a canonical undergraduate major.

Scope may never silently widen or narrow. A `school_major` request with no matching evidence must not substitute school-wide reviews or cross-school major reviews without an explicit user action.

## Student Voice topic model

School topics preserve the existing AIPLuS/Tongxue semantics while moving ownership into one shared contract:

- `general`
- `living`
- `dormitory`
- `cafeteria`
- `environment`
- `management`
- `teaching`
- `campus`

Major-experience topics are additive and remain experience, not normative facts:

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

A student statement about employment is `employment_perception`; it must never be rewritten as an employment rate or deterministic outcome.

## Source findings at program start

Public source evidence checked on 2026-08-21 shows that the source site now exposes a public “专业专区” and searchable school/major/city entry. The visible homepage currently lists thin but non-zero major discussion counts (for example AI, computer science, electrical engineering and automation). This is sufficient to justify a Student Voice ingestion contract, but **not** sufficient to treat the source as a professional truth database or to infer a consensus from small samples.

The source site's public terms state that user evaluations are individual opinions and the platform does not guarantee their truth, accuracy or completeness. Therefore UEC retains explicit UGC provenance and never promotes these statements to official facts.

The source announced mirror domains after traffic pressure. The currently published official host family includes:

- `https://srgaoxiao.cn`
- `https://srgaoxiao.com`
- `https://eo.srgaoxiao.cn`
- `https://eo.srgaoxiao.com`

The existing Tongxue Functions adapter currently knows only the two `.com` hosts. UEC will centralize mirror ownership in one source registry instead of duplicating host arrays.

The current repository adapter also proves an important recall defect: AIPLuS requests a `topic`, but `/api/tongxue-summary` currently retrieves the source AI summary or one recent review page and AIPLuS filters those rows afterwards. Relevant comments on later pages can therefore be missed and incorrectly reported as “no topic content”. UEC must move topic-aware bounded retrieval into the source gateway.

## Singular ownership target

UEC may add shared contracts/readers, but must preserve these existing owners:

- canonical school identity: `shared/resources/schools/school-identity-center.js`;
- canonical undergraduate major identity: existing 2026 major catalog + major-understanding resolver;
- Tongxue browser state/render: current Tongxue runtime controller/result/search owners unless a release migration replaces them atomically;
- AIPLuS turn execution: `functions/_lib/ai/turn-orchestrator.js`;
- AIPLuS deterministic tool bridge: existing tool-registry path;
- major-path professional truth/search: existing v0.02 core;
- major-path presentation/viewport: existing v0.04 owner;
- ln-rank admissions state/query truth: existing workspace/major-bands/school-majors owners;
- navigation transactions: existing shared interaction owner;
- release identity: `shared/resources/release/current-release.js`.

Do not create a second school resolver, second major catalog, second review database, second recommendation/ranking model, second AIPLuS agent, second workspace or second release identity.

## Data-retention / content boundary

UEC must not build a permanent mirror of the source site's full user-review corpus. Runtime behavior should prefer bounded live retrieval, short-lived edge/browser caching, normalized bounded excerpts and source links. This keeps source deletion/updates meaningful and avoids turning the repository into a shadow UGC archive.

## Sample-size presentation contract

Student Voice presentation must remain proportional to evidence volume:

- 1 matching item: present as one student's statement; no synthesis.
- 2 matching items: present both; no “common view” wording.
- 3–4 matching items: a bounded “recent voices mention …” grouping is allowed; no “most students” claim.
- 5+ matching items: themes may be summarized, with the sample count visible.
- disagreement must remain visible; conflicting voices are evidence, not a defect to be averaged away.

Verification/likes/ratings may be shown as provenance where available, but may not become hidden weighting in admissions/recommendation logic.

## Work package ledger

Status values: `TODO`, `IN_PROGRESS`, `DONE`. DONE means implementation plus package-level/system proof exists and no later contradiction remains.

| Package | Status | Required outcome |
|---|---|---|
| UEC-00 | **DONE** | Durable architecture/status owner, reconnect procedure, merge prohibition, product/evidence boundaries and initial source findings are committed before feature work. |
| UEC-01 | **IN_PROGRESS** | Source capability/schema audit: mirror registry, current school/review transport, major-space capability classification, schema drift/fail-closed evidence. No guessed major endpoint may become production truth. |
| UEC-02 | TODO | One shared Student Voice scope/topic/provenance/sample contract used by Tongxue and AIPLuS; remove duplicated experience-topic ownership where safe. |
| UEC-03 | TODO | Canonical identity binding: school entity + canonical major code + raw source labels; ambiguous class/trial/special labels fail closed. |
| UEC-04 | TODO | Topic-aware bounded retrieval with hard time/page/byte budgets, dedupe, recency and no false `topic_no_content` caused by page-1-only filtering. |
| UEC-05 | TODO | Sample-size, recency, verification provenance, contradiction/disagreement and non-consensus presentation contract. |
| UEC-06 | TODO | Tongxue Student Voice UI: school remains intact; additive major/school-major direct modes only when evidence scope is actually supported. |
| UEC-07 | TODO | ln-rank handoff from strict concrete-major records to Student Voice using canonical IDs and same-origin return; no result copying or new admissions state. |
| UEC-08 | TODO | major-path additive Student Voice section after core professional/graduate answer; no viewport regression and no replacement of background evidence. |
| UEC-09 | TODO | AIPLuS consumes Student Voice as evidence with strict source scope; official/deterministic questions cannot be answered from UGC. |
| UEC-10 | TODO | Source health/mirror/schema drift observability, bounded failover, cache-key correctness and maintainability handoff. |
| UEC-QA | TODO | Permanent source/semantic/scope/privacy/resource/browser matrices; PC/Pad/Android/compact; exact-head Preview; preserved old product regressions; final Draft/Ready same-SHA proof. |

## UEC-01 next action

The next maintainer must verify and implement the source capability registry first. Known facts:

- current Functions source adapter: `functions/_lib/tongxue-summary-base-v112.js`;
- current `/api/tongxue-summary` entity wrapper: `functions/api/tongxue-summary.js`;
- current adapter host list is `.com` only;
- source school detail, AI summary and school review endpoints are already in production code;
- current review normalization retains content, author/anonymous/verified state, campus, timestamp, likes, replies, question state, rating and source URL;
- current normalized review does **not** bind a canonical undergraduate major;
- public homepage proves a major discussion surface exists, but a production major API/path must be discovered and verified before enabling `major` or `school_major` retrieval. If it cannot be verified, UEC must ship those scopes as explicit unavailable/fail-closed rather than guessing a transport.

After UEC-01, update this ledger before starting UEC-02.

## Required acceptance classes before merge

At minimum the final system must distinguish:

- `辽宁石油化工大学宿舍怎么样` → school voice / living evidence;
- `电气工程及其自动化学生怎么说` → major voice only if verified source capability exists; otherwise explicit unsupported-source state, never model invention;
- `沈工大电气学生怎么说` → school-major voice only if both identities and source evidence are bound;
- `沈工大电气就业率多少` → Student Voice is not an allowed fact source;
- `沈工大电气学生觉得就业怎么样` → `employment_perception` Student Voice is allowed;
- class-level `计算机类` does not silently become `计算机科学与技术`;
- `工科试验班` does not become a canonical major;
- missing school-major evidence does not silently fall back to school or major scope;
- source unavailable / schema drift / timeout fails closed without fabricating content;
- existing Tongxue school search/entity/campus behavior remains green;
- existing ln-rank admissions truth, major-path 883/92/13 truth, UBC background, AIPLuS official/AEK/decision journeys remain green;
- no Student Voice field influences deterministic ranking, admissions probability, platform score or hidden recommendation bonus;
- PC / Pad / Android / compact browser behavior has no horizontal overflow and no device-specific business branch.

## Release rule

When all packages are DONE:

latest main check → complete diff re-audit → full Draft source/unit/browser workflows → exact-head Cloudflare Preview → freeze final SHA → Ready without changing SHA → second fresh full workflow round on same SHA → merge with `expected_head_sha` → verify exact new main SHA → verify push workflows and durable Production statuses → verify Pages/custom-domain/live UEC journeys.

“PR merged” is not completion.
