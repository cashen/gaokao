# v3.9.7.0-ln-rank-ai-diagnostics-dual-check

本版只修 AI 模型诊断与模型变量解析，不改 `/fenxi`。

## 核心变化

1. 新增 `functions/_lib/ai-model-resolver.js`。
2. 单卡诊断 `/api/card-diagnose` 模型解析规则：
   - 优先 `AI_CARD_MODEL`
   - 其次 `AI_MODEL`
   - 最后默认 `@cf/meta/llama-3.1-8b-instruct`
3. 自选池诊断 `/api/path-analysis` 模型解析规则：
   - 优先 `AI_PATH_MODEL`
   - 其次 `AI_MODEL`
   - 最后默认 `@cf/meta/llama-3.1-8b-instruct`
4. `/ln-rank/ai-diagnostics.html` 改为双接口自检：
   - 单卡诊断 `/api/card-diagnose`
   - 自选池诊断 `/api/path-analysis`
5. 诊断返回增加 `modelDebug`，显示模型来自哪个变量。

## 推荐 Cloudflare 环境变量

全站统一：

```text
AI_MODEL=@cf/zai-org/glm-4.7-flash
```

或分别控制：

```text
AI_CARD_MODEL=@cf/zai-org/glm-4.7-flash
AI_PATH_MODEL=@cf/zai-org/glm-4.7-flash
```

## 不包含

- `/fenxi/`
- `functions/fenxi/`
- `functions/_middleware.js`
