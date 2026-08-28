# Shared Resource Center

This directory is the only cross-product entry point for small, reusable facts and resolvers.

## Rules

1. **One fact, one source**
   - Exam years, control lines and audience years live in `exam/liaoning-physics.js`.
   - Region options and backend matching live in `geo/china-region-catalog.js`.
   - Cross-product school links and compact campus entities are accessed through `schools/school-resource-center.js`.

2. **Do not make every page load every dataset**
   - Small static configuration can be imported eagerly.
   - The 2,952-school Tongxue directory is lazy-loaded only when full name resolution is needed.
   - `loadTongxueSchoolDirectory()` uses a single shared Promise, so repeated callers reuse one request.
   - Result cards use only the compact campus/branch entity table; they do not fetch comments or the full directory.

3. **Keep compatibility adapters**
   - Existing imports such as `functions/_lib/exam-year-config.js`, `functions/_lib/region-rules.js` and `ln-rank/js/config/region-options.js` remain valid.
   - Adapters re-export shared resources so older modules can be migrated without a large rewrite.

4. **Business modules must not redefine public facts**
   - Do not write new copies of control lines, province groups or Tongxue URL builders in feature code.
   - Add or update the shared resource first, then consume it through an adapter.
   - `tools/audit-shared-resource-center-v3955.mjs` enforces the active contracts.

## Directory layout

- `exam/`: annual exam facts and score-boundary helpers.
- `geo/`: region labels, groups, normalization and matching.
- `schools/`: school-name normalization, compact entity resolution, Tongxue links and lazy directory loading.
- `resource-registry.js`: machine-readable ownership and loading policy.
