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
