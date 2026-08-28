# Unified major filter context v001

## Product contract

- Score, school, and major entry points share one professional draft/confirmation interaction.
- A professional keyword is an optional filter; unresolved natural input must be confirmed before query submit.
- Confirmed majors can be removed or extended through “＋再添加一个专业”; slash-separated input such as “机械/测控/材料” remains supported.
- “加入家庭方案” remains a concrete school-major record action and is not the same state as the professional filter.
- PC score cards keep one decision summary, two primary actions, and one relevant major-path entry; duplicate cross-school experience and school-review rows remain on their dedicated surfaces.
- Android region/secondary-condition disclosure preserves the user's open state in score mode and must not close/reflow the page on every draft update.

## Hard gates

- Preserve “稍高目标 / 主要参考 / 低分侧补充”; do not introduce “冲稳保”.
- Do not change major-bands algorithm, concurrency, resource ownership, or add a second catalog/state owner.
- Validate the exact PR head with static contracts, mobile interaction/visual preview, CI, and production/main recheck before merge.
- Merge only with the exact expected head SHA after all required checks are green.

## Release

- Base main: 1182c2b375fb60bf44623cd088a8e45babb91c09
- Feature revision: r023
- Major filter context: major-filter-context-v001
