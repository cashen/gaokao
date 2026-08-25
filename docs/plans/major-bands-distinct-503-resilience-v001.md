# Major-bands distinct-50 503 resilience v001

## Scope

This PR addresses the independently observed production `major-bands` distinct-identity stress failure. It does not change Tongxue, rank data, query semantics, cache identities, result ordering, or fail-closed business behavior.

The observed failure is an HTTP 503 during a distinct-identity stress sample. The existing verifier fails immediately on a transient 503 or transport timeout, which leaves the cause under-observed and can make the production gate red even when a bounded retry would recover. This PR adds bounded, explicit retry evidence to the verifier. A persistent failure still fails the gate.

## Baseline

- Repository: `cashen/gaokao`
- Base branch: `main`
- Base SHA: `3eaca66ee9967e2cf511e63e35fa9334a7960794`
- Existing independent failure: production resource graph run `32910886708`
- Failing sample: `distinct-9-407-standard-upper`
- Observed result: HTTP 503; production resource/static/pagination checks otherwise passed.
- Current main has the PR #211 workflow-trigger recovery and the final PR #212 checkpoint.

## Subtasks

1. **MB-01 — Reconcile current baseline**
   - Re-read this plan, the bounded-fanout status, Tongxue status, exact main SHA, open PRs, and the current verifier.
   - Keep the 503 scope separate from Tongxue and from the earlier zero-job trigger issue.
2. **MB-02 — Add bounded retry and evidence**
   - Retry only transient HTTP 502/503/504 and transport status 0.
   - Use a small fixed attempt budget and bounded backoff.
   - Preserve strict final validation: every scenario must end at HTTP 200 with valid payload and latency thresholds.
   - Record initial failures, final status, attempts, and retry recovery counts in evidence.
3. **MB-03 — Static/unit validation**
   - Validate JavaScript syntax and the retry contract.
   - Run the existing major-bands static/unit audits without changing runtime code.
4. **MB-04 — PR CI and Preview**
   - Confirm exact-head checks, Preview, pagination, source contracts, and distinct/shared concurrency checks.
   - Treat any persistent 5xx, timeout, Cloudflare 1102, payload contract failure, or latency breach as failure.
5. **MB-05 — Ready/merge/post-merge**
   - Reconcile exact head before and after Ready.
   - Merge only the exact green head.
   - Re-read main, production deployment, production graph, API health, and PC/Pad/Android browser checks.
   - Update the status checkpoint with whether the 503 gate recovered or remains pending.

## Acceptance

- Transient 502/503/504/status-0 failures are retried only within the verifier's explicit budget.
- Persistent failures remain visible and fail the verifier.
- Final successful samples are all HTTP 200 and satisfy the existing payload, data, cache, ordering, pagination, latency, and fail-closed contracts.
- No Tongxue files or runtime major-bands files are changed.
- No merge occurs without exact-head, Preview, CI, and post-merge production verification.

## Interruption and recovery

Before every continuation, read this plan and
`docs/status/major-bands-distinct-503-resilience-v001-status.json`, then verify live main, all open PRs, this branch/head, PR base/head, CI jobs, Preview, and production checks. Treat timeouts, missing output, and transport failures as unknown. Search by exact branch, PR title, and commit SHA before retrying any write. Never create a duplicate branch, commit, PR, or merge. Resume from the first incomplete MB task. Update the status file after every material state transition and never mark a task complete before its tool result proves it.
