# Unified Site Release Governance

This skill is mandatory for every production change in `cashen/gaokao`, including routine bug fixes.

## Core rule

A user-visible fix is not a standalone patch generation. It must join the current **site runtime generation**.

The site has one canonical current release at a time. For this release the public version is `v3.9.90.2`, the runtime generation is `v3990_2`, and the asset query is `3990_2`; these are three encodings of the same release identity, not independent versions.

## Active generation versus stable dependencies

### Active generation

These surfaces must all declare and load the same generation:

- `shared/resources/release/current-release.js`
- site runtime contract
- runtime cache contract
- resource execution contract
- release presenter
- root home runtime
- shared family shell and family-plan entry
- `/ln-rank/` HTML, bootstrap, runtime, workspace orchestration, interaction runtime and interaction CSS
- `/ln-rank/selection-pool.html` bootstrap and runtime adapter
- CI source gates
- browser regression gates
- production deployment verification

No active surface may point to a previous generation.

### Stable dependencies

Existing algorithms, data contracts and mature business engines may remain on immutable historical filenames only when all of the following are true:

1. They are explicitly listed in `stableDependencies` in the site runtime contract.
2. They do not own page bootstrapping, navigation, disclosure state, cache state, release state or deployment state.
3. Their interface is unchanged by the current release.
4. Existing regression tests continue to cover them.
5. They are not silently used as a second active runtime generation.

Stable dependency reuse is not permission to create wrapper chains without ownership. Every adapter must declare its owner and purpose.

## Forbidden release states

A release must fail when any of these are detected:

- HTML references a generation different from the current site runtime generation.
- Bootstrap, runtime, workspace, interaction or CSS generations differ.
- `CURRENT_RELEASE` names an owner that the live page does not load.
- New HTML runs old JavaScript, or new JavaScript delegates navigation/disclosure/cache ownership to an old runtime.
- CI still validates a retired generation.
- Production verification checks a different asset graph from source verification.
- Native navigation bypasses the declared interaction owner.
- A feature creates a device-specific business state machine instead of using the shared interaction contract.
- A version number is added only to one small module while the active site graph remains unchanged.
- The public release, runtime generation, asset query, HTML markers, release manifest or production verifier encode different current releases.
- Historical immutable files are deleted merely to make the directory look clean.

## Release procedure

1. Read `main`, the working branch and the complete diff.
2. Identify the current site runtime generation from `current-release.js` and the site runtime contract.
3. Classify every touched runtime file as either active generation or stable dependency.
4. Update the entire active generation graph atomically.
5. Derive the public version, runtime generation and asset query from one canonical release identity. Any active-generation change must advance the canonical release; never keep an older public version while publishing a newer active runtime.
6. Add or update source-contract tests that compare HTML, release center, cache contract, execution contract and runtime globals.
6.1. Run the canonical-release audit and fail on any non-historical reference to a retired public release. Stable dependency versions must remain explicitly classified and must never populate current-release fields.
7. Add browser tests that replay real event sequences rather than only `element.click()`.
8. Run preserved domain journeys, protected-path checks and syntax checks.
9. Keep the PR Draft until all required checks pass.
10. Mark Ready only after the head SHA is final.
11. Merge with the exact expected head SHA.
12. Verify `main`, GitHub Actions, Cloudflare Pages, custom-domain HTML, versioned assets, cache headers and live behavior.

## Native chooser and navigation contract

Native chooser lifecycle is a full transaction:

- physical start
- focus
- input/change
- blur or chooser close
- workspace render
- at least two stable animation frames
- stable visual viewport, scroll geometry and document layout
- tail-event quarantine completion

The first physical event that may open a native chooser records memory state only. Before the browser's picker default action, do not synchronously mutate `body`, layout, `disabled`, `inert` or `pointer-events`. The activation transaction is committed after the current event stack; tail-event quarantine begins only after input/change, focus return, visibility return or a bounded close signal. Navigation is executed only by the interaction owner through explicit `location.assign` after a new owned activation.

A fresh pointer event during quarantine does not authorize navigation.

## Draft and committed query state

Filter controls update draft state only. They must not issue a request. Existing results remain visible. A single explicit submit owner commits the draft. Layout-sensitive draft rendering must not restore native navigation or collapse user-owned disclosure state.


## Major-bands rank query execution contract

The current owner is `major-bands-rank-query-kernel-v3990_2`. The immutable data package remains `major-bands-static-v3972_2`; the previously verified `major-bands-bounded-fanout-v3972_5` Worker remains a declared stable rollback dependency and must not be deleted or rewritten.

- The authoritative candidate window is the canonical 2026 rank window, not a score prefilter.
- A build-time rank index may reference immutable score buckets, but it must not copy, rename or rebuild those buckets.
- The parent Worker reads selected immutable assets through the Pages ASSETS binding. Public HTTP self-calls to `/api/major-bands-bucket` are forbidden in the active query path.
- Full-dataset truth IDs and the rank-index recall IDs must be equal for every supported score and every preset.
- Candidate frontiers must not be capped before global ordering. A count larger than one page must remain fully pageable.
- Pagination uses one deterministic ordered ID snapshot. Exhausting pages must yield an ID union equal to `count`; every non-terminal `nextOffset` must be strictly greater than the current offset.
- A score without a 2026 rank-table position returns HTTP 200 with an explicit empty result contract. It must not become a bucket-count 500.
- Parsed bucket caching is bounded and isolate-local, with in-flight request coalescing. Cache size and bucket-read concurrency require fixed ceilings.
- Cloudflare 1102 is evidence of an architectural resource failure, not a signal for an immediate retry storm. The active path does not retry public self-fanout.
- Ranking performs one deterministic sort per non-empty band. School profiles and historical evidence are materialized only for the returned page.
- Preview and production gates must exercise true concurrency levels 1, 5, 10, 25 and 50 after warm-up, report p50/p95/p99 plus a cold hard cap, and require zero 1102 and zero 5xx.

## Declared stable distributed Worker contract

A request must not fan out to every selected Worker with an unbounded `Promise.all`. Distributed reads require an explicit orchestration owner, a small concurrency ceiling, deterministic result ordering and a bounded retry policy for transient platform failures only.

- Static data packages remain immutable and are read through their declared provider.
- Retry only transient transport or platform resource failures such as HTTP 429/502/503/504 and Cloudflare 1102 markers.
- Transient retries must use bounded backoff. For the current major-bands owner the maximum is three total attempts with 250 ms and 500 ms delays; immediate repeated retries are forbidden.
- Contract, validation and data-integrity failures must fail immediately and must not be hidden by retries.
- The response and production evidence must expose peak child-Worker concurrency and retry count.
- Recomputable ranking and execution traces must be removed from child-Worker transfer payloads and rebuilt only by the owning parent Worker.
- A record may be materialized only once in a distributed request. Child Workers transfer an unmaterialized ranking frontier; the parent materializes only globally selected records after ranking and pagination.
- Aggregate child-Worker transfer size requires an explicit sustained-load budget. Passing the browser response budget does not permit a multi-megabyte internal transfer.
- Deterministic child-Worker results derived from immutable static packages require a versioned internal cache owned by the parent orchestrator. The key must include every business input and the cache version, while excluding telemetry and retry-attempt fields.
- Only successfully parsed and contract-validated child results may enter the internal cache. HTTP errors, Cloudflare resource errors, invalid JSON and contract mismatches must never be cached.
- Browser responses require an explicit transport owner and byte budget. Server-only profiles, repeated source metadata and ranking internals must not be serialized to the client.
- When two top-level queries can run concurrently, the per-request child-Worker ceiling must be chosen from the combined production budget, not from an isolated request benchmark.
- Preview and production verification must keep sustained concurrent cycles; reducing stress cycles to make a release green is forbidden.

## Protected boundaries

Never modify:

- `/fenxi/`
- `functions/fenxi/`
- `functions/_middleware.js`

`functions/_lib/release-contract.js` must continue exporting both `LN_RANK_RELEASE_CONTRACT` and `RELEASE_CONTRACT`.

Do not rebuild or replace LocalStrength static data, 211 static data, major-bands static buckets or the stable Worker bucket package merely to align filenames with the current release.
