# v3.9.33 Cloudflare Functions 503 修复

## 问题

v3.9.32 把全国第四轮学科评估和 944 所学校知识库直接生成在：

```text
functions/_lib/kb/school-kb.generated.js
functions/_lib/kb/national-discipline-assessment.generated.js
```

其中 `school-kb.generated.js` 接近 6MB，`national-discipline-assessment.generated.js` 超过 1MB。

Cloudflare Pages Functions 会把 `functions` 目录下的模块打包进 Worker，容易造成函数包过大、启动失败或 503。即使 `/api/major-bands` 没直接使用知识库，也可能受 Pages Functions 打包影响。

## 修复

本版把大型知识库移出 `functions`，改为静态 JSON：

```text
ln-rank/kb/school-kb.compact.json
```

后端只在 AI 诊断或知识库自检时读取该静态 JSON：

```text
/api/card-diagnose
/api/kb-inspect
/api/kb-health
```

`/api/major-bands` 不再被大型知识库拖累。

## 部署后测试

```text
/api/major-bands?candidateScore=630
/api/kb-health
/ln-rank/kb-layer-diagnostics.html
```
