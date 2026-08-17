# AIPLuS Feedback Log · PR #168 durable status

This file is the durable architecture handoff for PR #168. It records stable implementation/ownership facts only. **Dynamic release status is never copied here as a second truth source:** whether a candidate may merge is determined by GitHub Checks and exact-head Preview evidence for the current PR head SHA.

## Dependency and release lock

- Repository: `cashen/gaokao`
- PR #166 branch: `agent/aiplus-family-decision-workbench`
- Frozen PR #166 implementation head: `c9c5871b286d9a5678b95d551b8a6cbdbec875cf`
- PR #166 merged to `main` as `ad4bbb711d068c8ae18db79626aa21183d2fb322`.
- PR #168 branch: `agent/aiplus-decision-workspace-vnext`
- PR #168 is a local Feedback Log follow-up only.
- PR #168 targets `main`; its formal candidate is a clean single commit directly based on the post-#166 `main`.
- User release rule: **both PR #166 and PR #168 must be complete, tested and mutually compatible before either is merged to `main`.** #166 entered main only after both stacked candidates completed Draft + same-SHA Ready proof; #168 still requires fresh proof after final main reconciliation.

Do not treat this document as evidence that CI is green. Always inspect the current exact head SHA, Cloudflare Pages check and required browser/workflow jobs.

## Single-owner architecture

PR #166 remains authoritative for:

- workspace schema and persistence;
- family Decision Profile;
- Decision Progress (`shared/ai/decision-progress.v003.js`);
- Decision Book;
- post-execution reflection;
- next-action ranking;
- selection review;
- topic vs family-profile semantics;
- AIPLuS app/render/UI runtime;
- admissions facts, evidence and semantic routing.

PR #168 owns only:

- `shared/ai/aiplus-feedback-bundle.v004.js` — pure privacy-preserving bundle projection using PR #166 `deriveDecisionProgress()`;
- `aiplus/feedback-log.v004.js` — bounded localStorage diagnostic trail (40 events, bundle last 12);
- `aiplus/feedback-log-ui.v004.js` — explicit user-opened/copy UI only;
- `aiplus/feedback-log.v004.css` — presentation;
- one Feedback Log entry/dialog mounted into the existing PR #166 Decision rail;
- Log-specific deterministic/browser/exact-Preview tests and workflow;
- one alignment update to the existing workspace browser verifier so it distinguishes the FDW core cache transaction from the Feedback Log additive cache transaction.

PR #168 must not own `/api/ai/turn`, candidate filters, deterministic admissions facts, a second workspace/history/profile/Decision Progress/Decision Book, polling, MutationObserver telemetry, or remote uploads.

## Privacy contract

Default feedback bundle includes only bounded technical/product context:

- release / runtime / advisor / decision / family-decision identities;
- workspace contract/id/version;
- current task/stage/focus;
- viewport size/device class;
- PR #166 canonical Decision Progress summary;
- bounded recent local diagnostic events;
- an optional problem note deliberately entered in the feedback dialog.

**Default bundle excludes current question and answer.** The current visible turn is included only after an explicit checkbox opt-in. There is no automatic GitHub issue creation, server submission or network upload path.

## Main reconciliation

The old construction head of PR #168 diverged from later PR #166 fixes. Before #166 merged, #168 was rebuilt as one clean Feedback Log commit on frozen #166 and the combined tree completed Draft + same-SHA Ready proof.

After #166 merged through a merge commit, a no-SHA retarget of that stacked head to `main` exposed a GitHub synthetic-merge-ref boundary: several protected-path gates failed with `origin/main...HEAD: no merge base` before product tests ran. No protected file had changed. The fix was **not** to weaken those gates; the same Feedback Log tree was rebuilt as one clean commit with post-#166 `main` as its direct parent, restoring normal PR ancestry.

That main-reconciled candidate then passed 13/14 Draft workflows. The only red gate was `Verify AI decision workspace v3990_1`, where the browser verifier assumed every stylesheet/module entry asset belonged to the FDW `fdw=003_0` cache transaction. The new Feedback Log CSS/JS intentionally form a separate additive `v=004_0` capability transaction. Production runtime, Feedback Log exact-Preview PC/Pad/Android proof, UI audit, site runtime and all other gates were green.

The verifier is therefore aligned with the already-established ownership model instead of weakening it:

- `data-ai-family-decision` must remain `aiplus-family-decision-v0.03`;
- `data-ai-feedback-log` must be `aiplus-feedback-log-v0.04`;
- `/aiplus/feedback-log.v004.css?v=004_0` must appear exactly once;
- `/aiplus/feedback-log-ui.v004.js?v=004_0` must appear exactly once;
- all remaining core entry assets must retain `fdw=003_0`;
- unknown or duplicated additive assets still fail the browser contract.

This is a verifier ownership correction only; no product runtime, semantic owner, admissions truth source or viewport owner is added.

## Final clean-delta invariant

The formal post-#166 candidate must be one clean commit directly ahead of current `main`. Shared product files remain additive, never copied from stale construction history:

- `aiplus/index.html` keeps the Family Decision Workbench UI and only mounts Feedback Log CSS/capability/button/dialog/module;
- `tools/audit-aiplus-v002-ui.mjs` keeps current UI/background-direction assertions and adds Feedback Log ownership/privacy/cache assertions;
- `tools/audit-architecture-handoff-v3990_1.mjs` keeps current architecture checks and adds Feedback Log local-only/single-owner assertions;
- `tools/browser-ai-workspace-v3990_1.mjs` keeps every existing human journey and only makes entry-asset ownership explicit: FDW core vs Feedback Log additive transaction.

The final candidate must differ from post-#166 `main` in exactly these 13 paths:

1. `.github/workflows/verify-aiplus-feedback-log-v004.yml`
2. `aiplus/feedback-log-ui.v004.js`
3. `aiplus/feedback-log.v004.css`
4. `aiplus/feedback-log.v004.js`
5. `aiplus/index.html`
6. `docs/architecture/AIPLUS-FEEDBACK-LOG-STATUS.md`
7. `shared/ai/aiplus-feedback-bundle.v004.js`
8. `tools/audit-aiplus-v002-ui.mjs`
9. `tools/audit-architecture-handoff-v3990_1.mjs`
10. `tools/browser-ai-workspace-v3990_1.mjs`
11. `tools/browser-aiplus-feedback-log-preview-v004.mjs`
12. `tools/browser-aiplus-feedback-log-v004.mjs`
13. `tools/verify-aiplus-feedback-log-v004.mjs`

No old construction commit ancestry is required for the formal candidate.

## Verification contract

Merge eligibility is always decided from current-head Checks:

1. Feedback Log privacy/unit verifier passes.
2. Feedback Log PC / Pad / Android local browser journey passes.
3. Existing Family Decision Workbench mocked browser regression passes.
4. Existing AI workspace browser runs exact Preview PC / Pad / Android human semantic journeys and four-viewport mocked parent journeys, with core/additive asset ownership asserted.
5. Family Decision Workbench, parent semantics, AEK, major-region, UI audit, site runtime, production health and architecture regressions pass.
6. Protected paths remain unchanged.
7. Cloudflare Pages Preview is exact to the current PR #168 head.
8. Feedback Log exact-Preview PC / Pad / Android journey passes.
9. No duplicate Decision Workspace v0.04 files/owners reappear.
10. The candidate remains one clean commit ahead of `main`, not a diverged stacked head.

## Formal release sequence

1. Build the clean post-#166 candidate directly on current `main`, preserving only the 13-file Feedback Log + verifier delta.
2. Keep #168 Draft and complete all main-base Draft workflows, exact-head Cloudflare Preview and PC/Pad/Android/combo browser proof.
3. Freeze that final head SHA.
4. Mark #168 Ready **without changing the frozen head SHA** and complete the second full validation round.
5. Merge #168 with `expected_head_sha` semantics.
6. Verify final `main`, all exact-SHA push workflows, Cloudflare Production exact main SHA, Pages/custom domain and live AIPLuS Decision Workbench + Feedback Log behavior.

If the candidate changes SHA or any real gate turns red, freeze is invalid until the owning cause is fixed and the affected validation cycle is repeated.

## Continuation rule

After an interruption, re-fetch `main` and PR #168, read the repository startup skills and this file, then continue at the first real red/incomplete exact-head gate. Do not reconstruct work from chat memory and do not weaken tests to preserve a green badge.
