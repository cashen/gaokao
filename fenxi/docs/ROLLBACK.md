# V2.91RC0 回退说明

## 总原则

先关开关，再回退包。不要直接覆盖多个版本。

## 功能开关

### safeperf1

```js
window.LN_SAFE_PERF_OPT = false;
```

作用：关闭 major_name_model 非阻塞与相关安全性能优化。

### interact1

```js
window.LN_INTERACT_FIX_OPT = false;
```

作用：关闭抽屉关闭后的重算去重与延后。

### interact2

```js
window.LN_INTERACT_DEDUPE_OPT = false;
```

作用：关闭筛选控件重复 applyFilters 合并。

## 回退顺序

1. 如果只有筛选控件异常：先关闭 `LN_INTERACT_DEDUPE_OPT`。
2. 如果只有抽屉关闭异常：关闭 `LN_INTERACT_FIX_OPT`。
3. 如果加载或详情补全异常：关闭 `LN_SAFE_PERF_OPT`。
4. 如果无法判断：回退到上一稳定包 `V2.9RC.fix-interact2` 或 `V2.9RC.fix-interact1`。

## 回退后必须验证

- `/fenxi/debug.html` 可打开
- 600 分 / 辽宁 hard / 稳就业可出 A/B/C
- 兴趣抽屉可打开、选择、关闭
- 高级筛选入口可打开
- 导出入口存在
