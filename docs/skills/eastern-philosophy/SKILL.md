# 东方哲学 · Eastern Philosophy Engineering

> 为学日益，为道日损。损之又损，以至于无为。无为而无不为。

This skill is mandatory at the **start of every engineering session** in `cashen/gaokao`: planning, debugging, code review, refactoring, performance work, UI work, architecture work, release work and incident repair.

It is not a literary decoration. It is an engineering decision framework.

## 1. Core interpretation

### 为学日益 — increase knowledge before changing the system

Before editing code, increase understanding:

- read the latest `main`, relevant owners, contracts, tests and production evidence;
- identify the current source of truth, state owner, render owner, viewport owner, cache owner and deployment owner involved in the problem;
- reproduce or prove the problem before proposing a fix;
- distinguish facts from assumptions;
- prefer current evidence over remembered architecture.

Knowledge may increase. **Runtime ownership must not multiply merely because knowledge increased.**

### 为道日损 — reduce unnecessary degrees of freedom

After understanding the system, ask what can be removed, unified, forbidden or made impossible:

- remove duplicate owners rather than synchronize them;
- remove duplicate state machines rather than coordinate them;
- remove duplicate truth sources rather than invent precedence chains;
- remove patch chains rather than add another patch;
- remove invalid state transitions rather than handle them forever;
- remove unnecessary fan-out, retries, observers, wrappers and caches rather than tune them individually;
- reuse the current canonical owner when it already exists.

The target is not “less code” by itself. The target is **less accidental complexity and fewer invalid states**.

### 损之又损 — simplify repeatedly, but only after truth is preserved

A first simplification may still leave duplicated responsibility. Repeat the ownership review until the design has the smallest number of independent decision-makers compatible with correctness.

Preferred direction:

- one business truth;
- one owner per state transition;
- one render/viewport transaction owner;
- one canonical release identity;
- bounded resource readers;
- deterministic contracts;
- explicit fail-closed boundaries.

Do not stop at “the bug disappeared”. Ask whether the class of bug has become harder or impossible to recreate.

### 无为 — the system should require less human intervention

“无为” does **not** mean doing nothing. In engineering it means the structure carries the correctness burden.

A mature change should reduce the need for:

- manual recovery;
- special-case operator knowledge;
- repeated retries;
- device-specific patches;
- hidden sequencing assumptions;
- author-only understanding;
- production guesswork.

The best mechanism makes the correct path the natural path and makes invalid paths unavailable.

## 2. Mandatory startup protocol

Before proposing or applying any change, perform this sequence:

1. **Learn (`益`)** — inspect current `main`, relevant code, contracts, tests and live evidence.
2. **Name ownership** — identify who currently owns truth, state, execution, rendering, cache and deployment for the affected behavior.
3. **Search for subtraction (`损`)** — determine whether the problem can be solved by removing duplication, illegal transitions, stale compatibility or competing ownership.
4. **Reject a second system** — do not create a second resource graph, state machine, cache hierarchy, observer chain, renderer, viewport controller, source-of-truth or release identity when a canonical owner already exists.
5. **Choose the smallest sufficient architecture** — make the minimum structural change that removes the cause, not the minimum textual diff that hides the symptom.
6. **Prove preservation** — keep truth-set parity, protected boundaries, domain behavior, cross-device behavior and production evidence intact.
7. **Re-audit after implementation** — ask again what new mechanism can be removed or folded into the canonical owner before merge.

## 3. The Eastern Philosophy review questions

Every non-trivial change should be able to answer these questions:

- What did we learn before changing code?
- Which owner is responsible for this behavior now?
- Did this change create a second owner or a new competing truth source?
- What state, branch, observer, retry, cache, wrapper or compatibility path became unnecessary?
- Did the number of possible invalid states decrease?
- Can the same class of failure still arise through another path?
- Does the system require less manual intervention after this change?
- Is the result easier for the next engineer to understand without private historical knowledge?

If these answers are unclear, the design is not ready merely because tests pass.

## 4. Anti-patterns

Treat these as warning signals:

- “one bug, one fix” accumulation;
- a new `if Android` / `if Pad` business branch when a shared interaction contract should own the behavior;
- another `MutationObserver`, `setTimeout`, `scrollIntoView` or scroll-restoration path to compensate for unclear viewport ownership;
- another retry loop to mask a resource architecture failure;
- another cache without a declared owner, key contract and hard bound;
- another data copy because the existing provider is inconvenient;
- another adapter whose only purpose is to bridge two active generations;
- another fallback that allows fabricated or stale facts instead of failing closed;
- another release/version identity for one small module while the active site remains on a different generation;
- preserving obsolete runtime paths only because deleting ownership requires understanding them.

## 5. Critical non-misinterpretation: “损” is not destructive minimalism

This repository has historical evidence that aggressive file minimization can damage runtime behavior. Therefore:

- do **not** delete stable dependencies merely to reduce file count;
- do **not** restore `v3.9.46.3 pure`, pure-runtime packages or static-import-graph minimal packages;
- do **not** remove compatibility or safety boundaries without proving they are truly unowned and unnecessary;
- do **not** trade correctness, recall, source fidelity, accessibility, observability or rollback safety for fewer lines of code.

“损” means reducing **accidental complexity**, not reducing verified capability.

## 6. Relationship to other mandatory skills

This skill runs first because it governs how engineering decisions are made.

For production runtime, release, UI ownership, cache behavior, navigation, page entrypoints or deployment checks, immediately continue with:

- `docs/skills/unified-site-release/SKILL.md`

The two skills are complementary:

- **东方哲学** asks whether the architecture is becoming simpler, more canonical and less intervention-dependent.
- **Unified Site Release Governance** proves that the chosen change remains coherent across the active release graph and production deployment.

## 7. Definition of done

A change is not complete merely because code was added and tests are green.

It is complete when:

- correctness is proven;
- canonical ownership is clearer than before;
- no unnecessary second mechanism was introduced;
- invalid state space did not expand without explicit necessity;
- production operation requires no new hidden ritual;
- the next engineer can reason from repository contracts rather than from the original author's memory.

The engineering translation is:

> 初级工程通过增加代码处理问题；成熟工程通过减少问题产生的条件处理问题。
>
> 最好的架构，不是能够应付所有混乱，而是让大类混乱无从发生。
