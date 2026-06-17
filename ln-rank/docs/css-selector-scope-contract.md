# CSS Selector Scope Contract

禁止 active dist 使用 `[class*=card]` / `[class*=chip]` 进行布局或换行控制。

允许全站 token；组件行为必须用显式组件类。

`!important` 只能用于 legacy state override，新增 clean contract 不应依赖它。
