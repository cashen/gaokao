export const AI_WORKSPACE_CONTRACT_VERSION = 'ai-workspace-contract-v3990_0';
export const AI_EVENT_CONTRACT_VERSION = 'ai-event-contract-v3990_0';
export const AI_RESULT_DELTA_VERSION = 'ai-result-delta-v3990_0';

export const AI_INTENT_TYPES = Object.freeze([
  'question',
  'hard_constraint',
  'soft_preference',
  'correction',
  'branch',
  'simulation',
  'comparison',
  'verification',
  'navigate',
  'save_decision',
  'undo',
  'resume'
]);

const MAX_EVENTS = 240;
const MAX_TASKS = 40;
const MAX_DECISIONS = 80;

function nowIso() {
  try { return new Date().toISOString(); } catch { return ''; }
}

function id(prefix = 'id') {
  const cryptoId = globalThis.crypto?.randomUUID?.();
  return cryptoId ? `${prefix}:${cryptoId}` : `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2, 9)}`;
}

function clone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function clean(value, max = 240) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function uniqueStrings(values, max = 20) {
  return [...new Set((Array.isArray(values) ? values : []).map(value => clean(value, 120)).filter(Boolean))].slice(0, max);
}

export function createAiWorkspace(seed = {}) {
  const createdAt = seed.createdAt || nowIso();
  return {
    contractVersion: AI_WORKSPACE_CONTRACT_VERSION,
    id: clean(seed.id, 120) || id('workspace'),
    version: Number(seed.version || 1),
    examContext: {
      province: '辽宁',
      subject: '物理类',
      dataYear: 2026,
      audienceYear: 2027,
      score: Number.isFinite(Number(seed?.examContext?.score)) ? Number(seed.examContext.score) : null,
      rank: Number.isFinite(Number(seed?.examContext?.rank)) ? Number(seed.examContext.rank) : null
    },
    mainTaskId: clean(seed.mainTaskId, 120),
    tasks: Array.isArray(seed.tasks) ? seed.tasks.slice(0, MAX_TASKS) : [],
    hardConstraints: Array.isArray(seed.hardConstraints) ? seed.hardConstraints.slice(0, 40) : [],
    softPreferences: Array.isArray(seed.softPreferences) ? seed.softPreferences.slice(0, 40) : [],
    facts: seed.facts && typeof seed.facts === 'object' ? seed.facts : {},
    evidence: Array.isArray(seed.evidence) ? seed.evidence.slice(0, 80) : [],
    decisions: Array.isArray(seed.decisions) ? seed.decisions.slice(0, MAX_DECISIONS) : [],
    pendingChecks: Array.isArray(seed.pendingChecks) ? seed.pendingChecks.slice(0, 80) : [],
    selectionSnapshot: seed.selectionSnapshot && typeof seed.selectionSnapshot === 'object' ? seed.selectionSnapshot : null,
    lastResult: seed.lastResult && typeof seed.lastResult === 'object' ? seed.lastResult : null,
    lastTurn: seed.lastTurn && typeof seed.lastTurn === 'object' ? seed.lastTurn : null,
    events: Array.isArray(seed.events) ? seed.events.slice(-MAX_EVENTS) : [],
    createdAt,
    updatedAt: seed.updatedAt || createdAt
  };
}

function constraintFromIntent(intent = {}) {
  const parts = [];
  if (Array.isArray(intent.regionIncludeKeys) && intent.regionIncludeKeys.length) parts.push({ key: 'regionInclude', values: uniqueStrings(intent.regionIncludeKeys), label: intent.regionLabel || '地区范围' });
  if (Array.isArray(intent.regionExcludeKeys) && intent.regionExcludeKeys.length) parts.push({ key: 'regionExclude', values: uniqueStrings(intent.regionExcludeKeys), label: '明确排除地区' });
  if (Array.isArray(intent.majorKeywords) && intent.majorKeywords.length) parts.push({ key: 'major', values: uniqueStrings(intent.majorKeywords), label: '专业方向' });
  if (intent.bottomLineMode && intent.bottomLineMode !== 'all') parts.push({ key: 'bottomLineMode', values: [intent.bottomLineMode], label: '学校性质/费用底线' });
  return parts;
}

function upsertConstraint(list = [], item = {}, sourceIntent = {}) {
  const index = list.findIndex(existing => existing?.key === item.key);
  const next = {
    id: index >= 0 ? list[index].id : id('constraint'),
    key: item.key,
    values: uniqueStrings(item.values),
    label: clean(item.label, 80),
    sourceText: clean(sourceIntent.rawText, 280),
    updatedAt: nowIso()
  };
  if (index >= 0) list[index] = next;
  else list.push(next);
}

function createTaskFromIntent(intent = {}, kind = 'main') {
  const major = uniqueStrings(intent.majorKeywords, 4).join(' / ');
  const title = clean(intent.taskTitle, 100)
    || (intent.topic === 'comparison' ? '比较候选' : major ? `${major}方向` : clean(intent.question, 80) || '当前问题');
  return {
    id: id('task'),
    parentTaskId: '',
    kind,
    type: intent.type || 'question',
    status: 'ready',
    title,
    intent: clone(intent),
    result: null,
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
}

export function applyAiWorkspaceEvent(workspaceLike, eventLike = {}) {
  const workspace = createAiWorkspace(workspaceLike || {});
  const event = {
    version: AI_EVENT_CONTRACT_VERSION,
    id: clean(eventLike.id, 120) || id('event'),
    type: clean(eventLike.type, 80),
    at: eventLike.at || nowIso(),
    payload: eventLike.payload && typeof eventLike.payload === 'object' ? clone(eventLike.payload) : {}
  };

  if (event.type === 'intent_committed') {
    const intent = event.payload.intent || {};
    if (Number.isFinite(Number(intent.score))) workspace.examContext.score = Number(intent.score);
    const constraints = constraintFromIntent(intent);
    if (intent.type === 'hard_constraint' || intent.type === 'correction') {
      for (const item of constraints) upsertConstraint(workspace.hardConstraints, item, intent);
    } else if (intent.type === 'soft_preference') {
      for (const item of constraints) upsertConstraint(workspace.softPreferences, item, intent);
    }

    const taskAction = clean(event.payload.taskAction, 30);
    if (!workspace.mainTaskId || taskAction === 'create_main') {
      const task = createTaskFromIntent(intent, 'main');
      workspace.tasks.unshift(task);
      workspace.mainTaskId = task.id;
    } else if (['branch', 'simulation', 'comparison'].includes(taskAction)) {
      const task = createTaskFromIntent(intent, taskAction);
      task.parentTaskId = workspace.mainTaskId;
      workspace.tasks.unshift(task);
    } else {
      const main = workspace.tasks.find(task => task.id === workspace.mainTaskId);
      if (main) {
        main.intent = clone(intent);
        main.updatedAt = nowIso();
      }
    }
  }

  if (event.type === 'result_committed') {
    const result = event.payload.result && typeof event.payload.result === 'object' ? clone(event.payload.result) : null;
    workspace.lastResult = result;
    workspace.lastTurn = event.payload.turn && typeof event.payload.turn === 'object' ? clone(event.payload.turn) : workspace.lastTurn;
    if (result?.rank?.rankEnd) workspace.examContext.rank = Number(result.rank.rankEnd);
    const taskId = clean(event.payload.taskId, 120) || workspace.mainTaskId;
    const task = workspace.tasks.find(item => item.id === taskId);
    if (task && result) {
      task.result = result;
      task.status = result.partial ? 'partial' : 'complete';
      task.updatedAt = nowIso();
    }
    if (Array.isArray(result?.evidence)) workspace.evidence = result.evidence.slice(0, 80);
    if (Array.isArray(result?.pendingChecks)) workspace.pendingChecks = result.pendingChecks.slice(0, 80);
  }

  if (event.type === 'selection_snapshot_imported') {
    const snapshot = event.payload.snapshot || {};
    workspace.selectionSnapshot = {
      version: clean(snapshot.version, 80) || 'ln-rank-selection-snapshot-v3990_0',
      importedAt: nowIso(),
      items: Array.isArray(snapshot.items) ? snapshot.items.slice(0, 112) : []
    };
  }

  if (event.type === 'decision_saved') {
    workspace.decisions.unshift({
      id: id('decision'),
      text: clean(event.payload.text, 360),
      taskId: clean(event.payload.taskId, 120) || workspace.mainTaskId,
      createdAt: nowIso()
    });
    workspace.decisions = workspace.decisions.slice(0, MAX_DECISIONS);
  }

  workspace.tasks = workspace.tasks.slice(0, MAX_TASKS);
  workspace.events.push(event);
  workspace.events = workspace.events.slice(-MAX_EVENTS);
  workspace.version += 1;
  workspace.updatedAt = nowIso();
  return workspace;
}

function recordIds(result = {}) {
  const records = Array.isArray(result?.candidates?.records) ? result.candidates.records : [];
  return new Set(records.map(record => clean(record?.id, 220)).filter(Boolean));
}

export function buildAiResultDelta(previous = null, next = null) {
  const prevIds = recordIds(previous || {});
  const nextIds = recordIds(next || {});
  const added = [...nextIds].filter(value => !prevIds.has(value));
  const removed = [...prevIds].filter(value => !nextIds.has(value));
  const previousCounts = previous?.candidates?.counts || {};
  const nextCounts = next?.candidates?.counts || {};
  const countChanges = {};
  for (const key of ['upper', 'near', 'steady', 'total']) {
    const before = Number(previousCounts?.[key] || 0);
    const after = Number(nextCounts?.[key] || 0);
    if (before !== after) countChanges[key] = { before, after, delta: after - before };
  }
  return {
    version: AI_RESULT_DELTA_VERSION,
    addedPreviewIds: added.slice(0, 50),
    removedPreviewIds: removed.slice(0, 50),
    unchangedPreviewCount: [...nextIds].filter(value => prevIds.has(value)).length,
    countChanges,
    changed: Boolean(added.length || removed.length || Object.keys(countChanges).length)
  };
}

function compactLastResultForServer(result = null) {
  if (!result || typeof result !== 'object') return null;
  const candidates = result.candidates && typeof result.candidates === 'object'
    ? {
        counts: result.candidates.counts || {},
        records: (Array.isArray(result.candidates.records) ? result.candidates.records : [])
          .map(record => ({ id: clean(record?.id, 220) }))
          .filter(record => record.id)
          .slice(0, 50)
      }
    : null;
  return {
    identity: clean(result.identity, 800),
    rank: result.rank?.rankEnd ? { rankEnd: Number(result.rank.rankEnd) } : null,
    candidates,
    execution: result.execution && typeof result.execution === 'object' ? {
      score: Number.isFinite(Number(result.execution.score)) ? Number(result.execution.score) : null,
      majorKeywords: uniqueStrings(result.execution.majorKeywords || [], 8),
      bottomLineMode: clean(result.execution.bottomLineMode, 60),
      region: result.execution.region && typeof result.execution.region === 'object' ? {
        includeKeys: uniqueStrings(result.execution.region.includeKeys || [], 8),
        excludeKeys: uniqueStrings(result.execution.region.excludeKeys || [], 8)
      } : null
    } : null
  };
}

function compactSelectionSnapshotForServer(snapshot = null) {
  if (!snapshot || typeof snapshot !== 'object') return null;
  return {
    version: clean(snapshot.version, 80),
    items: (Array.isArray(snapshot.items) ? snapshot.items : []).slice(0, 112).map(item => ({
      id: clean(item?.id, 180),
      school: clean(item?.school, 80),
      major: clean(item?.major, 120),
      rank2026: Number.isFinite(Number(item?.rank2026)) ? Number(item.rank2026) : null,
      bandKey: clean(item?.bandKey, 24),
      displayLocation: clean(item?.displayLocation, 60),
      tuition: clean(item?.tuition, 60)
    }))
  };
}

export function compactAiWorkspaceForServer(workspaceLike) {
  const workspace = createAiWorkspace(workspaceLike || {});
  return {
    contractVersion: workspace.contractVersion,
    id: workspace.id,
    version: workspace.version,
    examContext: workspace.examContext,
    mainTaskId: workspace.mainTaskId,
    tasks: workspace.tasks.slice(0, 12).map(task => ({ id: task.id, parentTaskId: task.parentTaskId, kind: task.kind, type: task.type, status: task.status, title: task.title, intent: task.intent })),
    hardConstraints: workspace.hardConstraints,
    softPreferences: workspace.softPreferences,
    selectionSnapshot: compactSelectionSnapshotForServer(workspace.selectionSnapshot),
    lastResult: compactLastResultForServer(workspace.lastResult),
    pendingChecks: workspace.pendingChecks.slice(0, 20).map(item => ({ key: clean(item?.key, 120), level: clean(item?.level, 40), text: clean(item?.text, 280) }))
  };
}