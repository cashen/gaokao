import { buildAiResultDelta, AI_WORKSPACE_CONTRACT_VERSION } from '../../../shared/ai/ai-workspace-contract.v3990_0.js';
import { interpretAiIntent, deterministicIntent } from './intent-interpreter.js';
import { evidenceForIntent } from './evidence-registry.js';
import { resolveRegionExecution, runMajorBandSearch, runRankLookup, runSchoolComparison, AI_TOOL_REGISTRY_VERSION } from './tool-registry.js';

export const AI_TURN_ORCHESTRATOR_VERSION = 'ai-turn-orchestrator-v3990_0';

function clean(value, max = 300) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function unique(values, max = 16) {
  return [...new Set((Array.isArray(values) ? values : []).map(value => clean(value, 120)).filter(Boolean))].slice(0, max);
}

function hardConstraint(workspace = {}, key) {
  return (workspace?.hardConstraints || []).find(item => item?.key === key) || null;
}

function effectiveScore(intent, workspace) {
  const score = Number(intent?.score ?? workspace?.examContext?.score);
  return Number.isFinite(score) && score >= 150 && score <= 750 ? Math.round(score) : null;
}

function effectiveBottomLine(intent, workspace) {
  if (intent?.bottomLineMode && intent.bottomLineMode !== 'all') return intent.bottomLineMode;
  const value = hardConstraint(workspace, 'bottomLineMode')?.values?.[0];
  return ['public_first', 'public_regular_only', 'public_include_sino'].includes(value) ? value : 'all';
}

function effectiveMajors(intent, workspace) {
  if (Array.isArray(intent?.majorKeywords) && intent.majorKeywords.length) return unique(intent.majorKeywords, 8);
  const hard = hardConstraint(workspace, 'major')?.values || [];
  if (hard.length) return unique(hard, 8);
  const main = (workspace?.tasks || []).find(task => task?.id === workspace?.mainTaskId);
  return unique(main?.intent?.majorKeywords || [], 8);
}

function shouldQueryCandidates(intent, score) {
  if (!score) return false;
  if (['candidate_search', 'comparison'].includes(intent?.topic)) return true;
  return ['hard_constraint', 'soft_preference', 'correction', 'branch', 'simulation', 'comparison'].includes(intent?.type);
}

function pendingChecksFor(result, regionExecution) {
  const checks = [];
  if (regionExecution?.warning) checks.push({ key: 'region_scope', level: 'warn', text: regionExecution.warning });
  for (const warning of result?.candidates?.warnings || []) checks.push({ key: `candidate:${checks.length}`, level: 'warn', text: clean(warning, 280) });
  if (result?.candidates?.counts?.total > 0) {
    checks.push({ key: 'annual-plan', level: 'required', text: '正式填报前逐条核验当年招生计划、专业代码、计划数、校区、学费、选科和体检要求。' });
  }
  return checks.slice(0, 12);
}

function rankSummary(rank) {
  if (!rank?.ok) return '';
  if (rank.emptyScore) return `${rank.score}分在2026辽宁物理类表中没有同分考生，历史参考位置约到第${rank.rankEnd.toLocaleString('zh-CN')}位。`;
  if (rank.rankStart !== rank.rankEnd) return `${rank.score}分对应2026辽宁物理类历史参考位次约${rank.rankStart.toLocaleString('zh-CN')}—${rank.rankEnd.toLocaleString('zh-CN')}。`;
  return `${rank.score}分对应2026辽宁物理类历史参考位次约第${rank.rankEnd.toLocaleString('zh-CN')}位。`;
}

function candidateSummary(candidates, majors, regionExecution) {
  if (!candidates) return '';
  if (!candidates.ok) return candidates.message || '本轮候选查询没有成功完成。';
  const direction = majors.length ? `“${majors.join(' / ')}”` : '当前专业范围';
  const regions = regionExecution?.includeKeys?.length && !regionExecution.includeKeys.includes('all')
    ? `，执行地区：${regionExecution.includeKeys.join('、')}`
    : '';
  return `${direction}${regions}共召回 ${Number(candidates.counts?.total || 0).toLocaleString('zh-CN')} 条历史参考记录；当前工作台只展示最多${candidates.previewLimit || 48}条预览，完整分页仍由 ln-rank 位次内核负责。`;
}

function comparisonSummary(comparison) {
  if (!comparison?.ok) return comparison?.message || '';
  return comparison.items.map(item => `${item.school}：${Number(item.result?.counts?.total || 0).toLocaleString('zh-CN')}条历史参考记录`).join('；');
}

function buildBlocks({ intent, result, delta, provider, regionExecution }) {
  const blocks = [];
  blocks.push({
    type: 'task_header',
    title: intent.taskTitle || (intent.type === 'comparison' ? '比较任务' : '当前任务'),
    subtitle: intent.reason || '本轮已完成意图识别。',
    intentType: intent.type,
    source: intent.source
  });
  if (result.rank?.ok) {
    blocks.push({ type: 'fact_summary', title: '当前位置', text: rankSummary(result.rank), level: 'A', sourceUrl: result.rank.source?.sourceUrl || '' });
  }
  if (result.candidates) {
    blocks.push({
      type: 'candidate_routes',
      title: '确定性候选执行结果',
      text: candidateSummary(result.candidates, result.execution.majorKeywords, regionExecution),
      counts: result.candidates.counts,
      records: (result.candidates.records || []).slice(0, 18),
      previewOnly: true
    });
  }
  if (result.comparison) {
    blocks.push({ type: 'comparison', title: '学校比较', text: comparisonSummary(result.comparison), items: result.comparison.items || [] });
  }
  if (delta?.changed) {
    blocks.push({ type: 'delta', title: '这次修改带来的变化', delta });
  }
  if (regionExecution?.warning) {
    blocks.push({ type: 'clarification', title: '地区条件暂不自动缩水', text: regionExecution.warning, action: 'confirm_region_scope' });
  }
  if (Array.isArray(result.evidence) && result.evidence.length) {
    blocks.push({ type: 'evidence', title: '可核验的官方入口', items: result.evidence });
  }
  if (result.pendingChecks?.length) {
    blocks.push({ type: 'pending_checks', title: '还没有完成的核验', items: result.pendingChecks });
  }
  blocks.push({
    type: 'action',
    title: '可以继续',
    actions: [
      { id: 'continue', label: '继续问当前结果' },
      { id: 'open-ln-rank', label: '打开完整专业初选', href: '/ln-rank/' },
      { id: 'open-selection', label: '打开家庭方案', href: '/ln-rank/selection-pool.html' }
    ]
  });
  return blocks;
}

function resultIdentity({ score, majors, regionExecution, intent, bottomLineMode }) {
  return [score || '', majors.join('/'), (regionExecution?.includeKeys || []).join(','), (regionExecution?.excludeKeys || []).join(','), bottomLineMode, intent.type, intent.topic].join('|');
}

function validateConfirmedIntent(value, input, workspace) {
  if (!value || typeof value !== 'object') return null;
  const fallback = deterministicIntent(input, workspace);
  return {
    ...fallback,
    ...value,
    type: value.type || fallback.type,
    question: clean(value.question || input, 1000),
    rawText: clean(input, 1200),
    requiresConfirmation: false,
    confidence: Math.max(0.8, Number(value.confidence || 0.8)),
    source: `${clean(value.source, 30) || 'confirmed'}-confirmed`
  };
}

export async function orchestrateAiTurn(context, payload = {}) {
  const input = clean(payload.input, 1200);
  const workspace = payload.workspace && typeof payload.workspace === 'object' ? payload.workspace : {};
  if (!input && !payload.confirmedIntent) {
    return { ok: false, status: 400, message: '请输入当前想解决的问题。' };
  }
  if (workspace?.contractVersion && workspace.contractVersion !== AI_WORKSPACE_CONTRACT_VERSION) {
    return { ok: false, status: 409, message: '工作区版本不一致，请刷新页面后继续。' };
  }

  let interpreted;
  const confirmed = validateConfirmedIntent(payload.confirmedIntent, input || payload.confirmedIntent?.rawText || '', workspace);
  if (confirmed) {
    interpreted = { intent: confirmed, provider: { ok: false, provider: '', model: '', deterministicFallbackRequired: false, confirmed: true } };
  } else {
    interpreted = await interpretAiIntent(input, workspace, context.env || {});
  }
  const intent = interpreted.intent;
  if (intent.requiresConfirmation && !confirmed) {
    return {
      ok: true,
      pendingConfirmation: true,
      intent,
      provider: {
        provider: interpreted.provider?.provider || '',
        model: interpreted.provider?.model || '',
        source: intent.source,
        failures: interpreted.provider?.failures || []
      },
      blocks: [{ type: 'clarification', title: '这句话可能会缩小候选范围', text: intent.reason || '请先确认是否要把它作为硬约束执行。', action: 'confirm_intent' }],
      orchestratorVersion: AI_TURN_ORCHESTRATOR_VERSION
    };
  }

  const score = effectiveScore(intent, workspace);
  const majors = effectiveMajors(intent, workspace);
  const bottomLineMode = effectiveBottomLine(intent, workspace);
  const regionExecution = resolveRegionExecution(intent.type === 'soft_preference' ? { ...intent, regionIncludeKeys: [], regionExcludeKeys: [] } : intent, workspace);
  const result = {
    identity: '',
    partial: false,
    rank: score ? runRankLookup(score) : null,
    candidates: null,
    comparison: null,
    evidence: evidenceForIntent(intent),
    pendingChecks: [],
    execution: {
      score,
      majorKeywords: majors,
      bottomLineMode,
      region: regionExecution,
      toolRegistryVersion: AI_TOOL_REGISTRY_VERSION
    }
  };

  if (shouldQueryCandidates(intent, score)) {
    if (intent.type === 'comparison' && intent.schoolNames?.length >= 2) {
      result.comparison = await runSchoolComparison(context, { score, schoolNames: intent.schoolNames, majorKeywords: majors, bottomLineMode });
      result.partial = !result.comparison.ok;
    } else if (regionExecution.exact) {
      result.candidates = await runMajorBandSearch(context, {
        score,
        majorKeywords: majors,
        regionKeys: regionExecution.includeKeys,
        bottomLineMode,
        schoolKeyword: intent.schoolNames?.length === 1 ? intent.schoolNames[0] : ''
      });
      result.partial = !result.candidates.ok;
    } else {
      result.partial = true;
    }
  }

  result.identity = resultIdentity({ score, majors, regionExecution, intent, bottomLineMode });
  result.pendingChecks = pendingChecksFor(result, regionExecution);
  const delta = buildAiResultDelta(workspace?.lastResult || null, result);
  const blocks = buildBlocks({ intent, result, delta, provider: interpreted.provider, regionExecution });

  return {
    ok: true,
    pendingConfirmation: false,
    intent,
    taskAction: intent.taskAction,
    result,
    delta,
    blocks,
    event: {
      type: 'intent_committed',
      payload: { intent, taskAction: intent.taskAction }
    },
    provider: {
      provider: interpreted.provider?.provider || '',
      model: interpreted.provider?.model || '',
      source: intent.source,
      latencyMs: interpreted.provider?.latencyMs || 0,
      failures: interpreted.provider?.failures || []
    },
    orchestratorVersion: AI_TURN_ORCHESTRATOR_VERSION
  };
}