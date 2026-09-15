# Simulation v009 progress

- Base main: 16084475e508d230c3c6c68d82409ce53b295ba8
- Goal: keep the three-year score/rank reference visible while returning it to a compact single-line information band.
- UX contract: 学校 → 专业 → 一眼看到近3年分数/位次；不增加独立历史卡片高度。
- Responsive contract: `white-space: nowrap`; on narrow screens the row remains one visual line and may scroll horizontally instead of wrapping.
- Data contract: reuse existing `history.years` 2026/2025/2024; missing records are never invented.
- v009 static contract: pending CI
- v009 390px browser regression: pending CI
- Main merge: pending
