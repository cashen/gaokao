# 发版自检清单

每次输出 ZIP 前后都按这张表检查。

---

## 一、版本号

检查：

```text
/ln-rank/VERSION.txt
/ln-rank/index.html 中 app.vXXXX.js
README.md 版本说明
```

确保版本一致。

---

## 二、前端模块

打开：

```text
/ln-rank/module-health.html
```

确认核心模块无报错。

重点看：

```text
app.vXXXX.js
major-pool-render.vXXXX.js
diagnose-controller.vXXXX.js
diagnose-render.vXXXX.js
```

---

## 三、专业池接口

测试：

```text
/api/major-bands?candidateScore=590
```

应返回 JSON，不能返回 HTML。

检查字段：

```text
score2025
rank2025
score2024
rank2024
historyCompare
displayLocation
schoolTags
```

---

## 四、主页面

测试：

```text
/ln-rank/index.html?v=当前版本
```

流程：

```text
输入分数
点击查看
切换上探/主体/稳妥
筛选地域
搜索学校
搜索专业
查看更多
```

---

## 五、AI诊断

测试：

```text
/ln-rank/ai-diagnostics.html
```

再在主页面点：

```text
AI诊断
```

检查：

```text
弹窗是否打开
PC/手机是否正常
关闭按钮是否有效
额度用完是否切换规则版
```

---

## 六、飞书报告

测试：

```text
/ln-rank/feishu-diagnostics.html
```

检查：

```text
能生成报告
能打开链接
匿名可读设置是否成功
```

---

## 七、学校地域

测试：

```text
/ln-rank/school-geo-audit.html
```

搜索：

```text
东北大学
哈尔滨工业大学
山东大学
北京交通大学
大连理工大学
```

重点确认：

```text
东北大学秦皇岛分校 → 河北 · 秦皇岛
哈尔滨工业大学深圳校区 → 广东 · 深圳
山东大学威海校区 → 山东 · 威海
大连理工大学盘锦校区 → 辽宁 · 盘锦
```

---

## 八、禁止事项

发版前确认没有：

```text
前端硬编码业务判断
新功能直接写进一个大文件
旧版本 app 被 index.html 引用
接口返回 HTML 当 JSON 解析
Cloudflare secret 写进前端
```
