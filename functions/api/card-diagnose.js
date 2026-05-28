import { buildCardDiagnoseMessages } from '../_lib/ai-card-prompt.js';
import { buildRuleOnlyDiagnosis } from '../_lib/ai-card-rules.js';
import { parseDiagnosisFromModel, normalizeDiagnosis } from '../_lib/ai-card-output-schema.js';
import { getKnowledgeContext } from '../_lib/kb/kb-retriever.js';

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

async function readJson(request) {
  const text = await request.text();
  if (!text) return {};
  try { return JSON.parse(text); } catch { throw new Error('请求内容不是有效 JSON。'); }
}

function cleanRecord(input = {}) {
  const record = input && typeof input === 'object' ? input : {};
  return {
    id: String(record.id || '').slice(0, 160),
    school: String(record.school || '').slice(0, 80),
    major: String(record.major || '').slice(0, 120),
    statusLabel: String(record.statusLabel || '').slice(0, 40),
    position: String(record.position || '').slice(0, 60),
    scoreDelta: Number.isFinite(Number(record.scoreDelta)) ? Number(record.scoreDelta) : null,
    score: Number.isFinite(Number(record.score)) ? Number(record.score) : null,
    rank: Number.isFinite(Number(record.rank)) ? Number(record.rank) : null,
    score2025: Number.isFinite(Number(record.score2025)) ? Number(record.score2025) : null,
    rank2025: Number.isFinite(Number(record.rank2025)) ? Number(record.rank2025) : null,
    score2024: Number.isFinite(Number(record.score2024)) ? Number(record.score2024) : null,
    rank2024: Number.isFinite(Number(record.rank2024)) ? Number(record.rank2024) : null,
    historyCompare: record.historyCompare && typeof record.historyCompare === 'object' ? record.historyCompare : null,
    displayLocation: String(record.displayLocation || '').slice(0, 80),
    geoEntity: String(record.geoEntity || '').slice(0, 100),
    locationWarning: String(record.locationWarning || '').slice(0, 140),
    natureLabel: String(record.natureLabel || '').slice(0, 60),
    schoolTags: Array.isArray(record.schoolTags) ? record.schoolTags.map(x => String(x).slice(0, 20)).slice(0, 8) : []
  };
}

function getAiText(result) {
  if (!result) return '';
  if (typeof result.response === 'string') return result.response;
  if (typeof result.result === 'string') return result.result;
  if (typeof result.text === 'string') return result.text;
  if (Array.isArray(result.choices) && result.choices[0]?.message?.content) return result.choices[0].message.content;
  return JSON.stringify(result);
}

function errorText(error) {
  const parts = [
    error && error.message,
    error && error.name,
    error && error.code,
    error && error.status,
    error && error.cause && error.cause.message,
    error && error.stack
  ].filter(Boolean);
  return parts.join(' | ');
}

function isAiQuotaLimit(error) {
  const s = errorText(error).toLowerCase();
  return s.includes('3036')
    || s.includes('account limited')
    || s.includes('daily free allocation')
    || s.includes('10,000 neurons')
    || s.includes('10000 neurons')
    || s.includes('free allocation')
    || (s.includes('429') && s.includes('neuron'));
}

function shortError(error) {
  return errorText(error).replace(/\s+/g, ' ').slice(0, 240);
}


export async function onRequest(context) {
  if (context.request.method !== 'POST') {
    return json({ ok: false, message: '只支持 POST 请求。' }, 405);
  }

  try {
    const input = await readJson(context.request);
    const record = cleanRecord(input.record || {});
    const candidateScore = Math.round(Number(input.candidateScore || 0));

    if (!record.school || !record.major) {
      return json({ ok: false, message: '缺少学校或专业信息，无法诊断。' }, 400);
    }
    if (!Number.isFinite(candidateScore) || candidateScore <= 0) {
      return json({ ok: false, message: '缺少有效考生分数。' }, 400);
    }

    const model = String(context.env?.AI_CARD_MODEL || '@cf/meta/llama-3.1-8b-instruct').trim();

    // 没绑定 Workers AI 时，也返回规则版诊断，方便小白部署阶段先跑通页面。
    if (!context.env?.AI || typeof context.env.AI.run !== 'function') {
      return json({
        ok: true,
        source: 'rules-only',
        model: '',
        message: '未检测到 Cloudflare Workers AI 绑定，已返回规则版诊断。',
        knowledgeContext,
        knowledgeContext,
          knowledgeContext,
        diagnosis: buildRuleOnlyDiagnosis(record, candidateScore)
      });
    }

    const knowledgeContext = getKnowledgeContext(record);
    const messages = buildCardDiagnoseMessages({ record, candidateScore, knowledgeContext });

    let aiResult;
    try {
      aiResult = await context.env.AI.run(model, {
        messages,
        temperature: 0.2,
        max_tokens: 700
      });
    } catch (aiError) {
      if (isAiQuotaLimit(aiError)) {
        return json({
          ok: true,
          source: 'rules-only-quota',
          model,
          message: '今日 Cloudflare AI 免费额度已用完，已自动切换为规则版诊断。',
          diagnosis: buildRuleOnlyDiagnosis(record, candidateScore)
        });
      }

      return json({
        ok: true,
        source: 'rules-only-error',
        model,
        message: 'AI 调用暂时失败，已自动切换为规则版诊断。',
        aiError: shortError(aiError),
        diagnosis: buildRuleOnlyDiagnosis(record, candidateScore)
      });
    }

    const modelText = getAiText(aiResult);
    const diagnosis = modelText
      ? parseDiagnosisFromModel(modelText, record, candidateScore)
      : normalizeDiagnosis(null, record, candidateScore);

    return json({
      ok: true,
      source: 'workers-ai',
      model,
      knowledgeContext,
      diagnosis
    });
  } catch (error) {
    return json({
      ok: false,
      message: error && error.message ? error.message : String(error),
      hint: '请检查 Cloudflare Pages 是否绑定 Workers AI，绑定变量名是否为 AI，并配置 AI_CARD_MODEL。AI 额度用完时，本版会自动切换为规则版诊断。'
    }, 500);
  }
}
