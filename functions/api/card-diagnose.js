import { buildCardDiagnoseMessages } from '../_lib/ai-card-prompt.js';
import { buildRuleOnlyDiagnosis } from '../_lib/ai-card-rules.js';
import { parseDiagnosisFromModel, normalizeDiagnosis } from '../_lib/ai-card-output-schema.js';
import { getKnowledgeContext } from '../_lib/kb/kb-retriever.js';
import { YEAR_CALIBER_KB } from '../_lib/kb/year-caliber-kb.generated.js';
import { resolveAiModel, buildAiModelDebug } from '../_lib/ai-model-resolver.js';
import { getHistoryScoreRankEvidence } from '../../shared/resources/exam/historical-score-rank-contract.js';

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

function finite(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function cleanRecord(input = {}) {
  const record = input && typeof input === 'object' ? input : {};
  const score2026 = finite(record.score2026 ?? record.score);
  const rank2026 = finite(record.rank2026 ?? record.rank);
  return {
    id: String(record.id || '').slice(0, 160),
    dataYear: finite(record.dataYear) || YEAR_CALIBER_KB.activeDataYear,
    school: String(record.school || '').slice(0, 80),
    major: String(record.major || '').slice(0, 120),
    statusLabel: String(record.statusLabel || '').slice(0, 40),
    position: String(record.position || '').slice(0, 60),
    scoreDelta: finite(record.scoreDelta),
    score: score2026,
    rank: rank2026,
    score2026,
    rank2026,
    historyEvidence: getHistoryScoreRankEvidence(record),
    displayLocation: String(record.displayLocation || '').slice(0, 80),
    geoEntity: String(record.geoEntity || '').slice(0, 100),
    locationWarning: String(record.locationWarning || '').slice(0, 140),
    natureLabel: String(record.natureLabel || '').slice(0, 60),
    schoolTags: Array.isArray(record.schoolTags) ? record.schoolTags.map(x => String(x).slice(0, 24)).slice(0, 8) : [],
    flags: Array.isArray(record.flags) ? record.flags.map(x => String(x).slice(0, 60)).slice(0, 8) : [],
    bottomLineTags: Array.isArray(record.bottomLineTags) ? record.bottomLineTags.map(x => String(x).slice(0, 40)).slice(0, 6) : [],
    tuition: String(record.tuition || '').slice(0, 80),
    specialProject: record.specialProject && typeof record.specialProject === 'object' ? record.specialProject : null
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

function ruleDiagnosis(record, candidateScore) {
  return normalizeDiagnosis(buildRuleOnlyDiagnosis(record, candidateScore), record, candidateScore);
}

function diagnosisCaliber() {
  return {
    activeDataYear: YEAR_CALIBER_KB.activeDataYear,
    rankTableYear: YEAR_CALIBER_KB.rankTableYear,
    audienceYear: YEAR_CALIBER_KB.audienceYear,
    primaryFact: '2026专业最低投档分和位次',
    historyYears: [2025, 2024],
    unknownYear: 2027,
    copy: YEAR_CALIBER_KB.aiCopy
  };
}

function successPayload(payload = {}) {
  return { ok: true, caliber: diagnosisCaliber(), ...payload };
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
      return json({ ok: false, message: '缺少学校或专业信息，无法解读。' }, 400);
    }
    if (!Number.isFinite(candidateScore) || candidateScore <= 0) {
      return json({ ok: false, message: '缺少有效参考分数。' }, 400);
    }
    if (!Number.isFinite(record.score2026) && !Number.isFinite(record.rank2026)) {
      return json({ ok: false, message: '当前卡片缺少2026最低投档分和位次，暂不生成AI解读。' }, 400);
    }

    const knowledgeContext = await getKnowledgeContext({ ...record, candidateScore }, context.request, context.env || {});
    const resolvedModel = resolveAiModel(context.env || {}, { specificKey: 'AI_CARD_MODEL' });
    const model = resolvedModel.model;

    if (!context.env?.AI || typeof context.env.AI.run !== 'function') {
      return json(successPayload({
        source: 'rules-only',
        model: '',
        modelDebug: buildAiModelDebug(resolvedModel),
        message: '未检测到 Cloudflare Workers AI 绑定，已按2026主数据返回基础解读。',
        knowledgeContext,
        diagnosis: ruleDiagnosis(record, candidateScore)
      }));
    }

    const messages = buildCardDiagnoseMessages({ record, candidateScore, knowledgeContext });

    let aiResult;
    try {
      aiResult = await context.env.AI.run(model, {
        messages,
        temperature: 0.1,
        max_tokens: 460
      });
    } catch (aiError) {
      if (isAiQuotaLimit(aiError)) {
        return json(successPayload({
          source: 'rules-only-quota',
          model,
          modelDebug: buildAiModelDebug(resolvedModel),
          message: 'AI额度暂不可用，已按2026最低投档记录生成基础解读。',
          knowledgeContext,
          diagnosis: ruleDiagnosis(record, candidateScore)
        }));
      }

      return json(successPayload({
        source: 'rules-only-error',
        model,
        modelDebug: buildAiModelDebug(resolvedModel),
        message: 'AI暂不可用，已按2026最低投档记录生成基础解读。',
        aiError: shortError(aiError),
        knowledgeContext,
        diagnosis: ruleDiagnosis(record, candidateScore)
      }));
    }

    const modelText = getAiText(aiResult);
    const diagnosis = modelText
      ? parseDiagnosisFromModel(modelText, record, candidateScore)
      : ruleDiagnosis(record, candidateScore);

    return json(successPayload({
      source: 'workers-ai',
      model,
      modelDebug: buildAiModelDebug(resolvedModel),
      knowledgeContext,
      diagnosis
    }));
  } catch (error) {
    return json({
      ok: false,
      message: error && error.message ? error.message : String(error),
      hint: '单条说明暂时没有生成成功，请稍后重试；这不影响专业初选。'
    }, 500);
  }
}
