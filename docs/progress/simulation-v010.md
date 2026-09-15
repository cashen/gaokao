# Simulation v010 progress

- Base main: a0ae3bf92eb6e1e41d975afbd9e90bd360e779cc
- User issue: history row starts inside the major field and is clipped at the field width.
- UX contract: school / major fields remain the primary row; the three-year score-rank reference is a separate card-level information band aligned to the field content left edge.
- Desktop contract: history row spans the available card width and shows 2026 / 2025 / 2024 plus source without clipping.
- Mobile contract: history row stays one visual line; narrow screens may horizontally scroll rather than increase card height.
- Data contract: reuse existing `history.years` 2026/2025/2024; no fabricated records.
- v010 static contract: PASS
- v010 desktop + 390px browser regression: PASS
- PR: #281
- Main merge: completed after the v010 checks passed
