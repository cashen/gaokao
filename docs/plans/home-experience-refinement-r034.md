# Homepage Experience Refinement r034

## Baseline

- Main base: `c96c80526ccf88f4c37070db0483b554ed9546b1`
- Release: `v3.9.90.3 / v3990_3`
- Information architecture baseline: `r033-home-problem-entry`
- Homepage runtime owner remains `/ln-rank/js/ux/family-home.v3990_3.js`

## Purpose

Refine the existing homepage experience without changing routes, business logic, protected paths, or the r033 information architecture.

## UX changes

1. Make the countdown read as a calm time instrument: the day count gets visual priority while hour/minute/second remain compact.
2. Add a lightweight `专业初选 → 模拟志愿` journey directly below the primary action.
3. Make the journey state-aware: new/score-ready users see the next step, returning users see that professional selection is already done and can continue organizing.
4. Remove `家庭方案` wording from returning-state homepage copy so it matches the r033 navigation vocabulary.
5. Keep `了解 / 证据 / 产业` secondary and preserve all existing disclosure, routing, countdown, and accessibility behavior.
6. Add a dedicated homepage experience revision identifier: `r034-home-experience-refinement`.

## Non-goals

No route changes, API changes, data changes, simulation-page duplication, or changes under `fenxi/` or `functions/fenxi/`.

## Verification

Required before merge:

- homepage browser regression across 360 / 390 / 768 / 1280
- pointer/touch interaction checks
- no horizontal overflow
- existing source-contract and production-resource gates
- exact Preview SHA = final PR head
- post-merge production release workflow
