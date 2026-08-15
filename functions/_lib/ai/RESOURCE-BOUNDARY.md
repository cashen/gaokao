# AI Worker resource boundary

This file records the runtime boundary that the AI route must preserve. It is intentionally colocated with the AI adapters so changes to this contract enter the existing AI source/Preview/browser gate.

## Base module graph

The ordinary AI route must not statically import `academic-background-provider.js`, `local-mainline-kb.js`, `211-mainline-kb.js`, or a public endpoint module solely to reuse its handler.

`tool-registry.js` must reach background evidence through `background-resource-adapter.js`. That adapter reads the already-published static resource `/ln-rank/data/local-strength/local-strength-index.v3971_2.json` only when a background task is actually executed. It must not create or import a second school-background database.

Ordinary score, region, major, budget and family-preference turns must therefore be able to execute without materializing the background snapshot.

## Parent decision research

AIPLuS v0.03 does not replace the existing atomic intent/task kernel. Existing candidate, school, major, history, comparison and region tasks keep their deterministic routing contracts. The single `turn-orchestrator.js` may promote a genuinely composite parent question into `decision_research` after the atomic command is parsed.

`parent-semantic-frame.js` describes the decision context: explicit schools/majors, career targets, evidence needs, and hard/soft/concern preference signals. It is not allowed to mutate score, region, school, major, project scope or the candidate active view. `decision_research` always remains a non-committing knowledge/reasoning turn.

`evidence-plan.js` is a bounded plan, not a second orchestrator. It may schedule at most three evidence steps. `decision-research-runtime.js` executes those steps by reusing existing deterministic admissions/history/background owners and the existing school-official bridge. The decision runtime must not create a parallel admissions probability model, ranking table, school background database or browser fact bridge.

For school-level official evidence, one decision turn may examine at most two schools and at most two official decision dimensions. External official-web fallback is additionally capped at two missing evidence slots per turn.

## Official web evidence

`official-web-evidence.js` is the only general official-web discovery/reader gateway for AIPLuS decision research.

- Existing 阳光高考/CHSI school official retrieval remains first-line school evidence.
- Optional Jina Search is enabled only when `JINA_API_KEY` or `AI_WEB_SEARCH_API_KEY` is configured.
- Search is discovery only. Search-result snippets and summaries must never become facts or claims.
- A claim may be created only after the gateway reads the original HTTPS page and the original URL is `gaokao.chsi.com.cn`, a `.gov.cn` domain or a `.edu.cn` domain.
- The read page must also match the requested school identity.
- One external fallback call reads at most one candidate official page. A decision turn starts at most two such fallbacks.
- Missing, blocked, ambiguous or unconfigured web evidence fails closed and must not be replaced by model knowledge.

The search/reader transport is replaceable infrastructure; the original publisher URL remains the evidence source.

## Claim / evidence provenance

`claim-evidence.js` is the model-facing fact provenance contract. Accepted claims retain subject, dimension, value, year when relevant, scope, publisher/source URL and a stable claim ID.

Time-sensitive quantitative claims such as employment rate,升学/推免 rate or salary numbers require an explicit year; otherwise the claim is rejected. Model synthesis receives only accepted claims plus the parent semantic frame. A factual sentence must bind to accepted claim IDs. Sentences without claim IDs are limited to value/tradeoff reasoning and may not smuggle in new admissions, employment,升学, curriculum, cost or salary facts. Failed claim validation falls back to deterministic wording.

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

Resource-boundary maintenance alone does not require changing the site release identity `v3.9.90.1` / `v3990_1`. The current stable browser advisor shell remains `ai-human-advisor-agent-v0.02` and its current core asset transaction remains `aiplus-assets-v002_3`. AIPLuS v0.03 advances the product decision/evidence semantics without copying or renaming those unchanged browser runtime assets.

## Release hygiene

Temporary patch workflows, one-off runners and debugging scripts must not be part of a final release candidate. The existing AI verifier already asserts that the base graph does not statically import the academic background provider or local background KB; Preview/browser gates must be run on the cleaned exact candidate SHA before merge.
