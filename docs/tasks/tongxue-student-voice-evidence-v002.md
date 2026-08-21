# Tongxue Student Voice Evidence Layer v002

## Purpose

Prevent context loss during disconnected sessions. This document is the persistent task contract for the next Tongxue development iteration.

## Product Goal

Tongxue should not only show a cold AI summary. It should establish a trust chain:

AI summary -> evidence explanation -> student original voice

Regardless of whether a summary exists, users should receive supporting student evidence.

## Rules

- If summary exists: show summary plus 3-5 representative student comments.
- If summary does not exist: do not show an empty failure state. Show that summary is unavailable and expose 3 representative raw comments when available.
- Do not create a second Student Voice data source.
- Do not create a second summary engine.
- Do not create a second Tongxue runtime owner.
- Keep existing protected boundaries unchanged.

## Evidence Selection

Evidence should not be random. Rank by:

1. Information density.
2. Scenario coverage.
3. Recency.
4. Deduplication.

Prefer coverage across:

- courses
- teachers
- campus/living
- employment
- postgraduate study
- workload

## Data Contract Target

The response layer should support:

summary
+
evidence[]

where evidence can carry category/reason metadata for future AIPLuS explanations.

## Acceptance Scenarios

Primary scenario:

Shenyang Jianzhu University -> Electrical Engineering and Automation (080601) -> Student Voice.

Verify:

- summary path returns evidence.
- no-summary path returns available raw evidence.
- PC/Pad/Android layouts remain stable.
- no horizontal overflow.

## Release Gate

Draft PR -> source checks -> tests -> browser checks -> exact-head Preview -> Ready -> same SHA checks -> expected_head_sha merge -> production verification.
