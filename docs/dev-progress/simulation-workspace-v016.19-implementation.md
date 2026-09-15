# simulation workspace v016.19 implementation

Implemented on PR #290 branch target.

Focus: low-latency human input and explicit school-major consistency.

Acceptance gates:
- Local candidate UI is not blocked by strict school confirmation.
- Confirmed school is retained as row-scoped context.
- Major candidate display remains immediate/local while school fact verification is background.
- No serial six-query major fallback.
- Stale requests/results are cancelled/ignored on input changes.
- Browser tests cover responsiveness and school-major consistency.

Note: this file is the implementation record; code changes must be committed on the PR branch with release/revision incremented.
