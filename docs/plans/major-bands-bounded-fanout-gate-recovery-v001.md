# Major-bands bounded-fanout verification gate recovery v001

## Scope

This PR addresses only the verification workflow failure where the push-triggered
run completed with zero jobs. Main push now has an explicit source-audit path;
Pull Request runs retain the full bounded-fanout gate. It does not change the
major-bands runtime, query semantics, data, cache behavior, concurrency limits,
or Tongxue.

The separate live distinct-50 stress result with HTTP 503 remains an independent
runtime/performance gate and is not claimed fixed by this PR.

## Baseline evidence

- Repository: `cashen/gaokao`
- Base branch: `main`
- Base SHA: `c93ed2757e3dfe483ee17def3738fd8171d8a6af`
- Workflow: `.github/workflows/verify-major-bands-bounded-fanout-v3972_5.yml`
- Current push-triggered run: `33446423115`
- Observed state: `failure` with zero jobs; the checked-in workflow had only
  PR/manual triggers, so the event registration and source configuration were
  inconsistent.
- Related production-resource run `32819092504`: source-contract passed;
  production-graph failed only on the unrelated distinct-50 HTTP 503 stress sample.

## Subtasks

1. **BF-01 — Reconcile baseline**
   - Re-read this plan, the Tongxue recovery status, main SHA, open PRs,
     branch/head, workflow source, and the recorded run/job evidence.
   - Preserve the boundary between workflow recovery and the runtime 503 issue.
2. **BF-02 — Remove the zero-job push path**
   - Keep Pull Request path filtering and manual dispatch available.
   - Add an explicit main push source-audit path so a push event cannot finish
     as a zero-job failure.
   - Preserve all existing source, local, Preview, pagination, and concurrency
     jobs for pull requests.
   - Main production verification remains owned by the existing production
     resource/API checks; this PR must not weaken those checks.
3. **BF-03 — Static and local validation**
   - Validate YAML/source syntax and the workflow's trigger/job contract.
   - Run the existing bounded-fanout unit audit and relevant major-bands static
     checks without changing runtime files.
4. **BF-04 — PR CI and Preview validation**
   - Confirm exact-head PR checks are scheduled, jobs are non-empty, and all
     relevant jobs finish green.
   - Confirm Preview deployment and the existing real-concurrency/pagination
     checks complete against the exact PR head.
   - Do not reinterpret an HTTP 503 runtime stress result as fixed unless the
     dedicated runtime gate proves it.
5. **BF-05 — Ready, merge, and production recheck**
   - Reconcile the exact PR head SHA immediately before and after Ready.
   - Merge only the exact green head.
   - Re-read main SHA, all checks, production resource/API status, and this
     status file after merge.
   - Record the independent HTTP 503 item as pending if it remains observed.

## Acceptance contract

- A main push run has at least one evaluated source-audit job and cannot finish
  as a zero-job failure.
- Pull-request runs retain the source audit, local concurrency, Preview
  concurrency, and artifact publication jobs.
- Runtime behavior and fail-closed data semantics are unchanged.
- No Tongxue resource identity or status contract changes.
- No merge occurs with a pending required check or an unverified head SHA.

## Interruption and recovery

Before every continuation, read this plan and
`docs/status/major-bands-bounded-fanout-gate-recovery-v001-status.json`, then
verify live main, all open PRs, this branch/head, PR base/head, CI jobs, Preview,
and production checks. Treat timeouts, missing output, and transport failures as
unknown. Search by exact branch, PR title, and commit SHA before retrying any
write. Never create a duplicate branch, commit, PR, or merge. Resume from the
first incomplete BF task. Update the status file after every material state
transition and never mark a task complete before its tool result proves it.
