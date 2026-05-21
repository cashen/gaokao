# V2.93RC3.runtime-baseline-restore

## 目标

从 V2.92RC2.7 的稳定运行底座恢复：

- data manifest / chunks 正常读取
- iframe runtime 完整加载
- active JS 链保持 67 个正式文件
- `LN_ABC_POLICY_AUDIT_V292RC2` 能加载为 object
- full 36 审计可以真正开始跑
- index title / footer / debug title / toolVersion / stamp 统一显示为 V2.93RC3

## 明确不做

- 不继续改 A/B/C 公式权重
- 不继续加 fetch-inline / 多 base / 单脚本超时兜底实验
- 不为了压 PASS 调松审计
- 不新建业务逻辑命名体系

## 为什么这样做

V2.93RC1 / V2.93RC2 暴露的问题是工程运行基线问题：manifest 401、runtime boot 不完整、`abcAudit` 未加载、caseTotal=0。
这些结果不能作为高报公式判断依据。RC3 先恢复运行底座，再进行公式治理验证。

## 验收口径

下一次 `/fenxi/debug` 重点看：

```txt
index PASS
assets PASS
data PASS
chunks PASS
runtime-iframe PASS
abcAudit object
caseTotal 36
completed 36
timeouts 0
```
