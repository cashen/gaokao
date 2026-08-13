# AI Worker resource boundary

This file records the runtime boundary that the AI route must preserve. It is intentionally colocated with the AI adapters so changes to this contract enter the existing AI source/Preview/browser gate.

## Base module graph

The ordinary AI route must not statically import `academic-background-provider.js`, `local-mainline-kb.js`, `211-mainline-kb.js`, or a public endpoint module solely to reuse its handler.

`tool-registry.js` must reach background evidence through `background-resource-adapter.js`. That adapter reads the already-published static resource `/ln-rank/data/local-strength/local-strength-index.v3971_2.json` only when a background task is actually executed. It must not create or import a second school-background database.

Ordinary score, region, major, budget and family-preference turns must therefore be able to execute without materializing the background snapshot.

## School history

AI school-history turns do not parse the Liaoning admissions rank chunks inside `/api/ai/turn`, and they do not send the browser through the rich public `/api/school-majors` graph. `tool-registry.js` emits a `school_history` deterministic browser request to `/api/ai/school-history`; that endpoint reads one exact-school entry from `/data/zy2026/school-index.json` and one preaggregated `school-XX.json` shard. The derived school shards are built from the same 11,628 canonical 2026 records. The release gate compares record identities and counts for all 956 schools in the 2026 admission directory, so the lighter execution path is not a second admissions truth set.

The browser returns at most 120 compact records, which covers the current maximum of 117 records for one school and remains below the 48 KiB bridge budget. Index and shard promise caches are bounded and coalesce concurrent multi-major requests for the same school.

Major filtering still uses the shared 883-major catalog mapper and keyword confidence policy. The lighter path changes storage access, not the meaning of “机械”“电气”“材料”等专业方向。

Cloudflare Worker resource-limit responses (`1102`) are owner-action-required failures and are never retried as ordinary transient 503s.

## Facts and release identity

Admissions scores, ranks, historical records, school/major facts and candidate bands remain deterministic resources. AI may interpret language and explain decisions, but must not rewrite those facts or invent a parallel admission probability model.

Resource-boundary maintenance alone does not require changing the site release identity `v3.9.90.1` / `v3990_1`. AIPLuS browser assets still advance as one cache transaction; this revision uses `v002_1` while the visible product version remains `v0.02`.

## Release hygiene

Temporary patch workflows, one-off runners and debugging scripts must not be part of a final release candidate. The existing AI verifier already asserts that the base graph does not statically import the academic background provider or local background KB; Preview/browser gates must be run on the cleaned exact candidate SHA before merge.
