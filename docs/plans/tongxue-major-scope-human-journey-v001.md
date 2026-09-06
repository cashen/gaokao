# Tongxue / ln-rank / major-path scope clarity plan v001

## Goal

Make the three-module journey understandable without requiring a user to infer data scope from a disclaimer. The product has one Tongxue surface with two tasks:

- school scope: students talking about one school as a whole;
- major scope: students at different schools talking about one confirmed undergraduate major;
- school × major scope: not available from the current student-voice source and must never be implied.

The major scope is not a Ministry of Education “major category” result and is not a review of the selected school’s major. It is an exact canonical major code/name aggregated across schools.

## Invariants

1. Every student-voice entry, result heading, badge, and return action names its object and scope.
2. A cross-school major review is never visually presented as the selected school’s major experience.
3. A missing or overlong decision context is represented as partial context, never as an “independent query”.
4. The current decision-context and return-snapshot owners remain the only context/return state owners.
5. Existing school, major, pathway, score, filter, and scroll restoration behavior remains intact.
6. School-level and major-level source boundaries remain fail-closed; no copy or fallback invents a school-major review.
7. Major and school review failures remain locally retryable and preserve already-rendered content.
8. The release revision and changelog advance with this change.

## Implementation phases

### MPX-00 — contract and checkpoint

- Add this plan and a durable progress checkpoint.
- Add a static scope-contract verifier covering school, major, and unsupported school-major semantics.
- Record the exact base SHA and preserve unrelated worktree changes.

### MPX-01 — navigation/context truth

- Upgrade student-voice navigation to carry `sourceSurface` and an explicit `contextState` (`available`, `partial`, or `none`).
- Mark the context as partial when the encoded decision context is omitted for URL length, while retaining a safe return target.
- Let Tongxue render a source-aware partial-context strip instead of claiming an independent query.
- Keep all return targets same-origin and allowlisted.

### MPX-02 — ln-rank handoff semantics

- Migrate active handoff consumers to the current major-path navigation contract.
- Group actions by object: “这所学校” and “这个专业”. Keep the three capabilities, but do not render three equal ambiguous chips.
- Remove repeated school-level actions from every school-major row where the destination is identical.
- Ensure major-all has distinct school-level and cross-school-major continuations.

### MPX-03 — Tongxue information hierarchy and copy

- Replace symmetric but vague scope labels with explicit task language.
- School result title/badge must say “学生谈这所学校”.
- Major result title/badge must say “跨校同专业留言”.
- Put student messages before long professional source/pathway material; keep the pathway as a compact preview/full-map continuation.
- Use plain-language source boundaries and avoid identity/authority overclaims such as “真正读过的人”.

### MPX-04 — major-path exit and weak-network behavior

- Make the major-path student-voice heading and CTA explicitly cross-school.
- Provide a major retry action in the same result state as school retry.
- Preserve existing results during source/profile failure and only retry the failed segment.
- Keep 44px touch targets, keyboard focus, reduced-motion behavior, and 360/390px layouts stable.

### MPX-05 — verification and release

- Run static owner, source-scope, human-copy, navigation, and tree-integrity checks.
- Run browser journeys for score → school voice, score → cross-school major voice, school-all, major-all, major-path → Tongxue, back/scroll restoration, long URL context omission, offline/timeout/retry, and scope switching.
- Verify production/preview resource identity and final head SHA.
- Update the root and Tongxue changelogs and merge only the tested final head into `main`.

## Acceptance matrix

| Journey | Required visible truth | Required return behavior |
|---|---|---|
| score result → school voice | “学生谈这所学校” | restore score/filter/card/scroll |
| score result → major voice | “跨校同专业留言；不代表当前学校” | restore score/filter/card/scroll |
| school-all | one school action at result level; row actions are major/path | no repeated identical school CTA |
| major-all | school action and cross-school-major action are distinct | preserve major query and row |
| major-path → Tongxue | student messages are the first task content | return to exact major-path anchor |
| URL context omitted | “部分条件未随链接带入” | safe return target remains usable |
| offline/timeout | known content remains; retry is visible | local retry, no full-page reset |
| scope switch | new object is stated before query | no stale school/major labels |

## Out of scope

- No new router, global store, duplicate source registry, or AI-generated review summary.
- No change to admissions data, ranking algorithms, or protected `/fenxi/` paths.
- No use of cross-school major comments as a substitute for school × major evidence.
