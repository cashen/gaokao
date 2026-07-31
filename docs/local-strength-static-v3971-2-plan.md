# LocalStrength v3.9.71.2 implementation boundary

- Build all Liaoning 2026 physics admission/background matches during CI/build time.
- Commit generated static JSON under `ln-rank/data/local-strength/`.
- Browser filters and paginates static records; no `/api/local-strength` route.
- Preserve existing `/api/major-bands` and school-query runtime unchanged.
- Validate Android, Pad and PC layouts, including complete score-band grids.
- Validate production health for score and school queries after merge.
