# AI Worker resource boundary

This file records the runtime boundary that the AI route must preserve. It is intentionally colocated with the AI adapters so changes to this contract enter the existing AI source/Preview/browser gate.

## Base module graph

The ordinary AI route must not statically import `academic-background-provider.js`, `local-mainline-kb.js`, `211-mainline-kb.js`, or a public endpoint module solely to reuse its handler.

`tool-registry.js` must reach background evidence through `background-resource-adapter.js`. That adapter reads the already-published static resource `/ln-rank/data/local-strength/local-strength-index.v3971_2.json` only when a background task is actually executed. It must not create or import a second school-background database.

Ordinary score, region, major, budget and family-preference turns must therefore be able to execute without materializing the background snapshot.

## School history

AI school-history queries use `school-history-adapter.js`, which reuses the existing Liaoning 2026 manifest/chunks, admission directory, rank table and canonical-position algorithm. The canonical-school path should scan the shared manifest directly; the shared admission directory is a fallback for admission display-name/campus mappings.

Do not copy school aliases or admission algorithms into the AI layer. School alias resolution remains a single Tongxue resolver truth.

## Facts and release identity

Admissions scores, ranks, historical records, school/major facts and candidate bands remain deterministic resources. AI may interpret language and explain decisions, but must not rewrite those facts or invent a parallel admission probability model.

Resource-boundary maintenance alone does not require changing the site release identity `v3.9.90.1` / `v3990_1`.

## Release hygiene

Temporary patch workflows, one-off runners and debugging scripts must not be part of a final release candidate. The existing AI verifier already asserts that the base graph does not statically import the academic background provider or local background KB; Preview/browser gates must be run on the cleaned exact candidate SHA before merge.
