# v3.9.27 高校知识库底层基座

## 本版目标

把你提供的辽宁物理类最低分底稿学校清单转成 Cloudflare 可直接读取的静态知识库。

## 生成内容

```text
functions/_lib/kb/school-kb.generated.js
functions/_lib/kb/major-kb.generated.js
functions/_lib/kb/kb-retriever.js
functions/api/kb-inspect.js
ln-rank/kb-diagnostics.html
```

## 当前知识库覆盖

```text
学校：944 所
专业规则种子：6 条
```

## 字段原则

- 985 / 211 / 双一流 / 双一流建设学科：硬标签，来自官方/准官方名单；
- 医学强校：校名、双一流学科、辽宁专业池医学关键词的初判；
- 行业特色：校名、双一流学科、辽宁专业池关键词的初判；
- A2/A3 只是线索，必须标记“需核验”，不能当作官方结论。

## Cloudflare 测试

部署后打开：

```text
/ln-rank/kb-diagnostics.html
```

可测试：

```text
辽宁大学 + 电气工程及其自动化
大连海事大学 + 交通运输
东北大学秦皇岛分校 + 计算机科学与技术
```

## AI诊断如何使用

`/api/card-diagnose` 会先读取：

```text
getKnowledgeContext(record)
```

再把 `knowledgeBaseContext` 传给模型。

提示词中已经加入硬规则：

```text
涉及学校层次、双一流学科、优势方向、地域和专业现实风险时，优先依据 knowledgeBaseContext。
知识库没有给出的事实，不要假装知道，只能说需要核验。
A2/A3若来自规则初判，必须使用“线索/需核验”口径。
```

## 仍待后续补充

```text
学校官网简介
招生章程校区说明
就业质量报告摘要
逐校优势学科/学院说明
人工高报师备注
```
