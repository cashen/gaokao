# Repository operating rules

Before changing production runtime, release, UI ownership, cache behavior, navigation, page entrypoints or deployment checks, read and follow:

- `docs/skills/unified-site-release/SKILL.md`

The unified site release skill is mandatory for routine fixes as well as feature releases.

Do not create an isolated active module generation. The active site generation must be coherent across the release center, runtime contracts, page entrypoints, shared shell, CI and production verification.

Protected paths remain:

- `/fenxi/`
- `functions/fenxi/`
- `functions/_middleware.js`

`functions/_lib/release-contract.js` must retain both `LN_RANK_RELEASE_CONTRACT` and `RELEASE_CONTRACT` exports.
