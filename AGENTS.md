# Repository operating rules

At the **start of every engineering session**, before planning, debugging, code review, refactoring, performance work, UI work, architecture work, release work or incident repair, read and follow:

- `docs/skills/eastern-philosophy/SKILL.md`

The Eastern Philosophy skill is the mandatory first engineering skill for this repository. Apply its `益 → ownership → 损 → proof → re-audit` startup protocol before proposing or applying a change.

Immediately after Eastern Philosophy, read and follow:

- `docs/skills/human-copy/SKILL.md`

Human Copy is the repository-wide second foundation skill. It governs every user-visible string, including page copy, buttons, links, status/error/empty states, generated reports, Tongxue student-voice presentation and AIPLuS deterministic/model-assisted answers. Engineering terminology, AI process narration and template-like assistant language must not leak into normal public copy merely because the implementation uses those concepts. Precise admissions terminology, official-source boundaries and uncertainty remain mandatory.

Before changing production runtime, release, UI ownership, cache behavior, navigation, page entrypoints or deployment checks, continue by reading and following:

- `docs/skills/unified-site-release/SKILL.md`

The unified site release skill is mandatory for routine fixes as well as feature releases.

After the required skills, read `docs/architecture/START-HERE.md` before changing code. It is the repository handoff/navigation map: it points to the canonical machine contracts and known compatibility boundaries, but it never overrides those contracts.

For AIPLuS education/admissions knowledge explanation, policy concepts, professional/discipline concepts, authoritative-source routing, knowledge freshness, ambiguity handling or knowledge coverage work, also read and follow:

- `docs/skills/aiplus-authoritative-education-knowledge/SKILL.md`
- `docs/architecture/AIPLUS-AEK-STATUS.md`

The AEK program is a single release line covering `AEK-00` through `AEK-10` plus `AEK-QA`. Do not merge its program branch after only one work package is complete; the durable status file owns cross-session continuation and the all-packages merge gate.

Do not create an isolated active module generation. The active site generation must be coherent across the release center, runtime contracts, page entrypoints, shared shell, CI and production verification.

Protected paths remain:

- `/fenxi/`
- `functions/fenxi/`
- `functions/_middleware.js`

`functions/_lib/release-contract.js` must retain both `LN_RANK_RELEASE_CONTRACT` and `RELEASE_CONTRACT` exports.

## T0 tree-integrity rule

The 2026-08-28 T0 visual outage was caused by merging a pull request whose
head tree contained only three files into a `main` tree containing 2394 files.
The merge completed, but it silently replaced the deployable site tree with a
sparse tree; the browser then received HTML without the shared shell and core
CSS resources.

This failure mode is now a release blocker:

- Every pull request targeting `main` must pass
  `tools/verify-main-tree-integrity-v001.mjs` through
  `.github/workflows/verify-main-tree-integrity-v001.yml`.
- The pull-request check compares the recursive file count of the proposed
  head with its base and fails when a mature tree shrinks below 90% of its
  base, or when any required entrypoint, release contract, deployment workflow,
  data index or critical CSS sentinel is missing.
- The `push` check repeats the sentinel and minimum-tree checks on the exact
  commit that reached `main`; a green deployment alone is not evidence of a
  complete source tree.
- A merge must use the final reviewed head SHA. If the head changes after
  verification, the PR returns to Draft/verification and must not be merged
  from stale evidence.
- After merge, verify the exact main SHA, recursive tree count, critical CSS
  HTTP 200/content type, runtime/API health and production data SHA parity.

The incident record and evidence are maintained in
`docs/status/t0-visual-tree-loss-incident-2026-08-28.md`.
