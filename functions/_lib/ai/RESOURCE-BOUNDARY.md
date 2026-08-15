# AI Worker resource boundary

This file records the runtime boundary that the AI route must preserve. It is intentionally colocated with the AI adapters so changes to this contract enter the existing AI source/Preview/browser gate.

## Base module graph

The ordinary AI route must not statically import `academic-background-provider.js`, `local-mainline-kb.js`, `211-mainline-kb.js`, or a public endpoint module solely to reuse its handler.

`tool-registry.js` must reach background evidence through `background-resource-adapter.js`. That adapter reads the already-published static resource `/ln-rank/data/local-strength/local-strength-index.v3971_2.json` only when a background task is actually executed. It must not create or import a second school-background database.

Ordinary score, region, major, budget and family-preference turns must therefore be able to execute without materializing the background snapshot.

## Parent decision research v0.03

Parent Decision Intelligence v0.03 does not replace the existing AIPLuS v0.02 product shell or atomic intent/task kernel. Existing candidate, school, major, history, comparison and region tasks keep their deterministic routing contracts. The single `turn-orchestrator.js` may promote a genuinely composite parent question into `decision_research` after the atomic command is parsed.

`parent-semantic-frame.js` is the sole composite-decision meaning owner. It may describe:

- canonical schools and majors;
- school-major comparison pairs, including one school × several majors, several schools × one shared major, or explicitly aligned school-major pairs;
- explicit career goals;
- hard/soft/concern preference signals;
- explicit student learning/work-environment signals supplied by the parent;
- ordinal references such as “第二个/后者” against the prior comparison set;
- counterfactual changes such as “那如果愿意读研呢”; and
- accumulated evidence needs versus the current turn's evidence needs.

It must never invent personality/ability labels, mutate score/region/school/major/project scope, or commit the candidate active view. In a decision continuation, an ordinal reference selects a member of the prior comparison set; it must not redefine the whole comparison set merely because the deterministic ordinal resolver exposed one selected school/major.

Remembered context is not execution authority. A remembered score may remain available in the semantic frame, but it must not schedule admissions work unless the current turn explicitly asks about score/rank/reachability or otherwise produces a current `admissions` evidence need. `scoreUsage=suspended/cleared` always forbids admissions execution.

`evidence-plan.js` is a bounded plan, not a second orchestrator. It schedules at most three evidence steps. Reference follow-ups must narrow evidence execution to the selected pair while preserving the full comparison set in semantic memory. A selected single pair may still run one exact fit assessment when the current turn explicitly asks about score realism.

`decision-research-runtime.js` executes the plan by reusing existing deterministic admissions/history/background owners and the existing school-official bridge. It must not create a parallel admissions probability model, ranking table, school background database, browser fact bridge or recommendation-score model.

For school-level official evidence, one decision turn may examine at most two schools and at most two current official decision dimensions. External official-web reads are additionally capped at two per decision turn.

## Official web evidence

`official-web-evidence.js` is the only general official-web discovery/reader gateway for AIPLuS decision research.

- Existing 阳光高考/CHSI school official retrieval remains first-line school evidence.
- Optional Jina Search is enabled only when `JINA_API_KEY` or `AI_WEB_SEARCH_API_KEY` is configured. Do not describe it as always available when no key is configured.
- Search is discovery only. Search-result snippets and summaries must never become facts or claims.
- School research may accept actually read pages from the exact CHSI hosts `gaokao.chsi.com.cn`, `xz.chsi.com.cn`, `yz.chsi.com.cn`, or from `.gov.cn` / `.edu.cn` publishers after object validation.
- Major-only knowledge research is narrower: it may use only the exact CHSI hosts above and may create only `major_national` claims. It must not use a school page to imply a national major fact or use a national professional description as a school-major outcome.
- A school page must match the requested school identity; a major knowledge page must match the requested major identity.
- One external fallback call reads at most one candidate official page. A decision turn starts at most two such external reads across school and major evidence combined.
- Missing, blocked, ambiguous or unconfigured web evidence fails closed and must not be replaced by model knowledge or an ungoverned search-result page.

The search/reader transport is replaceable infrastructure; the original publisher URL remains the evidence source. If a future canonical school or major resource gains a verified official URL, this gateway should consume that URL before search rather than create another domain registry.

## Claim / evidence provenance

`claim-evidence.js` is the model-facing fact provenance contract. Claims carry typed scope rather than only prose. The current contract includes `subjectType`, `subjectId`, `dimension`, `metric`, `value`, `unit`, `year`, `cohort`, sample/denominator fields when known, geography, `sourceScope`, `documentScope`, source URL/title and a stable claim ID.

The hard rule is **source scope may not be narrowed by the user's question**:

- a school-wide employment report creates `school` claims unless the source text/title explicitly scopes the statement to the named major;
- a `school_major` claim requires `sourceScope=school_major`;
- professional knowledge from 阳光高考/学职/研招 creates `major_national` claims and cannot become a school-major employment/升学 fact;
- a model factual sentence may use only compatible claim scopes. Scope validation failure falls back to deterministic wording.

Time-sensitive quantitative claims such as employment rate,升学/推免 rate or salary numbers require an explicit year from the statement/document context; otherwise the claim is rejected. Model synthesis receives only accepted claims plus the parent semantic frame. A factual sentence must bind to accepted claim IDs. Sentences without claim IDs are limited to value/tradeoff reasoning and may not smuggle in new admissions, employment,升学, curriculum, cost or salary facts.

## Product-policy compatibility surface

`shared/ai/aiplus-product-contract.v002.js` remains the single product/source-policy owner. The small `aiplus-product-contract.v003.js` surface, where still imported by the decision branch, only re-exports v0.02 and must never acquire independent values or policy logic. It exists as a compatibility import surface, not as a second product truth.

## School directory by region

AIPLuS region-school questions (for example “沈阳有哪些大学”“辽宁有多少大学”“深圳有哪些本科”) read the existing canonical school-location resource `/tongxue/data/school-search-index.20260617-v150.json` through `school-directory-resource.js`. This adapter does not copy the 2,900+ school rows into a second database and does not use the language model to generate school names or counts.

School-existence truth and Liaoning-admission truth are deliberately separate. A region directory count must be computed from the complete school-location directory; it must not be reduced to schools that happen to have Liaoning 2026 physics admission records. When the user continues into a major or score question, the existing admission/history owners perform that next query and state their narrower admissions boundary.

City names are resolved from the cities actually present in the canonical directory rather than a growing hard-coded city regex list. Knowledge-only region queries do not mutate the candidate active view. Generic-city major-history queries may use a transient `city:*` execution scope, but that scope is not persisted as a candidate filter unless the active candidate engine has an explicit supported region contract.

The directory payload cache is isolate-local, promise-coalesced and time-bounded. It is an execution cache over the canonical asset, not a second truth source.

## School history

AI school-history turns do not parse the Liaoning admissions rank chunks inside `/api/ai/turn`, and they do not send the browser through the rich public `/api/school-majors` graph. `tool-registry.js` emits a `school_history` deterministic browser request to `/api/ai/school-history`; that endpoint reads one exact-school entry from `/data/zy2026/school-index.json` and one preaggregated `school-XX.json` shard. The derived school shards are built from the same 11,628 canonical 2026 records. The release gate compares record identities and counts for all 956 schools in the 2026 admission directory, so the lighter execution path is not a second admissions truth set.

The browser returns at most 120 compact records, which covers the current maximum of 117 records for one school and remains below the 48 KiB bridge budget. Index and shard promise caches are bounded and coalesce concurrent multi-major requests for the same school.

Major filtering still uses the shared 883-major catalog mapper and keyword confidence policy. The lighter path changes storage access, not the meaning of “机械”“电气”“材料”等专业方向。

Cloudflare Worker resource-limit responses (`1102`) are owner-action-required failures and are never retried as ordinary transient 503s.

## Facts and release identity

Admissions scores, ranks, historical records, school/major facts and candidate bands remain deterministic resources. AI may interpret language and explain decisions, but must not rewrite those facts or invent a parallel admission probability model.

Resource-boundary maintenance alone does not require changing the site release identity `v3.9.90.1` / `v3990_1`. The visible AIPLuS product remains `v0.02`, the stable browser advisor shell remains `ai-human-advisor-agent-v0.02`, the health API remains backward-compatible as `ai-health-api-v0.02`, and the current core asset transaction remains `aiplus-assets-v002_4`. Parent Decision Intelligence v0.03 advances only the server-side decision/evidence capability generation without copying or renaming those unchanged browser runtime assets.

## Release hygiene

Temporary patch workflows, one-off runners and debugging scripts must not be part of a final release candidate. The existing AI verifier already asserts that the base graph does not statically import the academic background provider or local background KB; Preview/browser gates must be run on the cleaned exact candidate SHA before merge.
