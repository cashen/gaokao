export const AI_WORKSPACE_CONTRACT_VERSION = 'ai-workspace-contract-v3990_2';
export const AI_EVENT_CONTRACT_VERSION = 'ai-event-contract-v3990_2';
export const AI_RESULT_DELTA_VERSION = 'ai-result-delta-v3990_2';
export const AI_ACTIVE_VIEW_VERSION = 'ai-active-view-v3990_2';

const MAX_EVENTS = 240;
const MAX_TASKS = 24;
const MAX_DECISIONS = 80;
const MAX_VIEW_HISTORY = 24;
const MAX_SELECTION_ITEMS = 112;

function nowIso() {
  try { return new Date().toISOString(); } catch { return ''; }
}

function id(prefix = 'id') {
  const cryptoId = globalThis.crypto?.randomUUID?.();
  return cryptoId ? `${prefix}:${cryptoId}` : `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2, 9)}`;
}

function clone(value) {
  if (value == null) return value;
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function clean(value, max = 240) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function uniqueStrings(values, max = 20) {
  return [...new Set((Array.isArray(values) ? values : []).map(value => clean(value, 120)).filter(Boolean))].slice(0, max);
}

function normalizedScore(value) {
  const score = Math.round(Number(value));
  return Number.isFinite(score) && score >= 150 && score <= 750 ? score : null;
}

function viewSeed(seed = {}, examContext = {}) {
  return {
    version: AI_ACTIVE_VIEW_VERSION,
    id: clean(seed.id, 120) || id('view'),
    target: clean(seed.target, 60) || 'candidates',
    score: normalizedScore(seed.score ?? examContext.score),
    majorKeywords: uniqueStrings(seed.majorKeywords || [], 8),
    regionKeys: uniqueStrings(seed.regionKeys || ['all'], 8).length ? uniqueStrings(seed.regionKeys || ['all'], 8) : ['all'],
    schoolNames: uniqueStrings(seed.schoolNames || [], 4),
    bottomLineMode: ['all', 'public_first', 'public_regular_only', 'public_include_sino'].includes(seed.bottomLineMode) ? seed.bottomLineMode : 'all',
    combination: ['replace', 'union'].includes(seed.combination) ? seed.combination : 'replace',
    inherited: uniqueStrings(seed.inherited || [], 12),
    sourceText: clean(seed.sourceText, 320),
    updatedAt: seed.updatedAt || nowIso()
  };
}

export function activeViewLabel(viewLike = {}) {
  const view = viewSeed(viewLike);
  const parts = [];
  if (view.score) parts.push(`${view.score}分`);
  if (view.regionKeys.length && !view.regionKeys.includes('all')) parts.push(view.regionKeys.join('、'));
  if (view.majorKeywords.length) parts.push(view.majorKeywords.join(' / '));
  if (view.schoolNames.length) parts.push(view.schoolNames.join(' / '));
  return parts.join(' · ') || '当前探索';
}

export function createAiWorkspace(seed = {}) {
  const createdAt = seed.createdAt || nowIso();
  const examContext = {
    province: '辽宁',
    subject: '物理类',
    dataYear: 2026,
    audienceYear: 2027,
    score: normalizedScore(seed?.examContext?.score),
    rank: Number.isFinite(Number(seed?.examContext?.rank)) ? Number(seed.examContext.rank) : null
  };
  const migratedView = seed.activeView || {
    score: examContext.score,
    majorKeywords: seed?.lastResult?.execution?.majorKeywords || [],
    regionKeys: seed?.lastResult?.execution?.region?.includeKeys || ['all'],
    bottomLineMode: seed?.lastResult?.execution?.bottomLineMode || 'all'
  };
  return {
    contractVersion: AI_WORKSPACE_CONTRACT_VERSION,
    id: clean(seed.id, 120) || id('workspace'),
    version: Number(seed.version || 1),
    examContext,
    mainTaskId: clean(seed.mainTaskId, 120),
    tasks: Array.isArray(seed.tasks) ? seed.tasks.slice(0, MAX_TASKS) : [],
    hardConstraints: Array.isArray(seed.hardConstraints) ? seed.hardConstraints.slice(0, 40) : [],
    softPreferences: Array.isArray(seed.softPreferences) ? seed.softPreferences.slice(0, 40) : [],
    activeView: viewSeed(migratedView, examContext),
    viewHistory: (Array.isArray(seed.viewHistory) ? seed.viewHistory : []).slice(0, MAX_VIEW_HISTORY).map(view => viewSeed(view, examContext)),
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

function viewIdentity(view = {}) {
  return JSON.stringify([
    normalizedScore(view.score),
    uniqueStrings(view.majorKeywords || [], 8),
    uniqueStrings(view.regionKeys || ['all'], 8),
    uniqueStrings(view.schoolNames || [], 4),
    clean(view.bottomLineMode, 40),
    clean(view.target, 60),
    clean(view.combination, 20)
  ]);
}

function pushViewHistory(workspace, view) {
  if (!view) return;
  const snapshot = viewSeed({ ...view, id: id('view-history'), inherited: [] }, workspace.examContext);
  if (workspace.viewHistory[0] && viewIdentity(workspace.viewHistory[0]) === viewIdentity(snapshot)) return;
  workspace.viewHistory.unshift(snapshot);
  workspace.viewHistory = workspace.viewHistory.slice(0, MAX_VIEW_HISTORY);
}

function upsertConstraint(list = [], item = {}, sourceText = '') {
  const index = list.findIndex(existing => existing?.key === item.key);
  const next = {
    id: index >= 0 ? list[index].id : id('constraint'),
    key: clean(item.key, 80),
    values: uniqueStrings(item.values),
    label: clean(item.label, 80),
    sourceText: clean(sourceText, 280),
    updatedAt: nowIso()
  };
  if (index >= 0) list[index] = next;
  else list.push(next);
}

function applyFamilyChanges(workspace, command = {}) {
  if (command.persistence !== 'family') return;
  const changes = command.familyChanges || {};
  if (Array.isArray(changes.regionIncludeKeys) && changes.regionIncludeKeys.length) {
    upsertConstraint(workspace.hardConstraints, { key: 'regionInclude', values: changes.regionIncludeKeys, label: '家庭长期地区范围' }, command.rawText);
  }
  if (Array.isArray(changes.regionExcludeKeys) && changes.regionExcludeKeys.length) {
    upsertConstraint(workspace.hardConstraints, { key: 'regionExclude', values: changes.regionExcludeKeys, label: '家庭明确排除地区' }, command.rawText);
  }
  if (Array.isArray(changes.majorExcludeKeywords) && changes.majorExcludeKeywords.length) {
    upsertConstraint(workspace.hardConstraints, { key: 'majorExclude', values: changes.majorExcludeKeywords, label: '家庭明确不接受专业' }, command.rawText);
  }
  if (changes.bottomLineMode && changes.bottomLineMode !== 'all') {
    upsertConstraint(workspace.hardConstraints, { key: 'bottomLineMode', values: [changes.bottomLineMode], label: '学校性质/费用底线' }, command.rawText);
  }
}

function createTaskFromCommand(command = {}, view = {}, kind = 'main') {
  return {
    id: id('task'),
    parentTaskId: '',
    kind,
    type: clean(command.operation, 40) || 'search',
    status: 'ready',
    title: clean(command.taskTitle, 100) || activeViewLabel(view),
    command: clone(command),
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

  if (event.type === 'command_committed') {
    const command = event.payload.command || {};
    const resolvedView = event.payload.resolvedView ? viewSeed(event.payload.resolvedView, workspace.examContext) : workspace.activeView;
    if (normalizedScore(resolvedView.score)) workspace.examContext.score = normalizedScore(resolvedView.score);
    applyFamilyChanges(workspace, command);

    if (event.payload.commitView !== false && viewIdentity(workspace.activeView) !== viewIdentity(resolvedView)) {
      pushViewHistory(workspace, workspace.activeView);
      workspace.activeView = { ...resolvedView, id: id('view'), updatedAt: nowIso() };
    }

    const taskAction = clean(event.payload.taskAction, 30) || 'update_main';
    if (taskAction === 'none') {
      // Family-profile-only commands persist constraints without manufacturing a candidate task.
    } else if (!workspace.mainTaskId || taskAction === 'create_main') {
      const task = createTaskFromCommand(command, resolvedView, 'main');
      workspace.tasks.unshift(task);
      workspace.mainTaskId = task.id;
    } else if (taskAction === 'branch') {
      const task = createTaskFromCommand(command, resolvedView, 'branch');
      task.parentTaskId = workspace.mainTaskId;
      workspace.tasks.unshift(task);
    } else {
      const main = workspace.tasks.find(task => task.id === workspace.mainTaskId);
      if (main) {
        main.command = clone(command);
        main.title = activeViewLabel(resolvedView);
        main.updatedAt = nowIso();
      }
    }
  }

  if (event.type === 'view_restored') {
    const restored = viewSeed(event.payload.view || {}, workspace.examContext);
    pushViewHistory(workspace, workspace.activeView);
    workspace.activeView = { ...restored, id: id('view'), updatedAt: nowIso() };
    if (restored.score) workspace.examContext.score = restored.score;
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
      version: clean(snapshot.version, 80) || 'ln-rank-selection-snapshot-v3990_2',
      importedAt: nowIso(),
      items: Array.isArray(snapshot.items) ? snapshot.items.slice(0, MAX_SELECTION_ITEMS) : []
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
          .map(record => ({
            id: clean(record?.id, 220),
            school: clean(record?.school || record?.schoolName, 80),
            major: clean(record?.major || record?.majorName, 120)
          }))
          .filter(record => record.id || record.school || record.major)
          .slice(0, 18)
      }
    : null;
  return {
    identity: clean(result.identity, 800),
    rank: result.rank?.rankEnd ? { rankEnd: Number(result.rank.rankEnd) } : null,
    candidates,
    execution: result.execution && typeof result.execution === 'object' ? {
      score: normalizedScore(result.execution.score),
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
    items: (Array.isArray(snapshot.items) ? snapshot.items : []).slice(0, MAX_SELECTION_ITEMS).map(item => ({
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
    tasks: workspace.tasks.slice(0, 8).map(task => ({ id: task.id, parentTaskId: task.parentTaskId, kind: task.kind, type: task.type, status: task.status, title: task.title, command: task.command })),
    hardConstraints: workspace.hardConstraints,
    softPreferences: workspace.softPreferences,
    activeView: viewSeed(workspace.activeView, workspace.examContext),
    viewHistory: workspace.viewHistory.slice(0, 8).map(view => ({
      id: view.id,
      score: view.score,
      majorKeywords: view.majorKeywords,
      regionKeys: view.regionKeys,
      schoolNames: view.schoolNames,
      bottomLineMode: view.bottomLineMode,
      target: view.target,
      combination: view.combination,
      updatedAt: view.updatedAt
    })),
    selectionSnapshot: compactSelectionSnapshotForServer(workspace.selectionSnapshot),
    lastResult: compactLastResultForServer(workspace.lastResult),
    pendingChecks: workspace.pendingChecks.slice(0, 20).map(item => ({ key: clean(item?.key, 120), level: clean(item?.level, 40), text: clean(item?.text, 280) }))
  };
}
