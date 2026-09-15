# Simulation workspace v016.19 performance architecture plan

Target: PR #290 /ln-rank/simulation-report.html

## Goals
1. School input must render local/fuzzy candidates without waiting for strict entity confirmation.
2. Once a school is chosen, store a confirmed SchoolContext and never re-resolve the same school on every major keystroke.
3. Major input shows local catalog candidates immediately; online school-fact verification runs in the background.
4. Remove serial fallback fan-out of up to six HTTP requests. Use one school-fact request and in-memory intersection.
5. Switching school/major cancels invalid work and prevents stale results.
6. Add browser gates for perceived responsiveness and school×major consistency.

## Implementation sequence
- Step 1: split school candidate search from strict confirmation; use the resolver's candidate search for typing feedback.
- Step 2: add per-row confirmed school context/cache.
- Step 3: add cached school-major fact set populated after school confirmation; reuse it for major filtering.
- Step 4: rewrite major verification to one fact query + local intersection; delete sequential six-item fallback.
- Step 5: add performance and consistency browser assertions on Android/desktop.
- Step 6: increment release/revision and re-run contract, browser, Pages Preview exact-head, then merge only after all gates pass.

## Non-goals
- No visual redesign.
- No weakening of final school/major/code fact validation.
- No increase of arbitrary test waits to hide latency.
