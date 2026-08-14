# Repository operating rules

At the **start of every engineering session**, before planning, debugging, code review, refactoring, performance work, UI work, architecture work, release work or incident repair, read and follow:

- `docs/skills/eastern-philosophy/SKILL.md`

The Eastern Philosophy skill is the mandatory first engineering skill for this repository. Apply its `益 → ownership → 损 → proof → re-audit` startup protocol before proposing or applying a change.

Before changing production runtime, release, UI ownership, cache behavior, navigation, page entrypoints or deployment checks, continue by reading and following:

- `docs/skills/unified-site-release/SKILL.md`

The unified site release skill is mandatory for routine fixes as well as feature releases.

After the required skills, read `docs/architecture/START-HERE.md` before changing code. It is the repository handoff/navigation map: it points to the canonical machine contracts and known compatibility boundaries, but it never overrides those contracts.

Do not create an isolated active module generation. The active site generation must be coherent across the release center, runtime contracts, page entrypoints, shared shell, CI and production verification.

Protected paths remain:

- `/fenxi/`
- `functions/fenxi/`
- `functions/_middleware.js`

`functions/_lib/release-contract.js` must retain both `LN_RANK_RELEASE_CONTRACT` and `RELEASE_CONTRACT` exports.
