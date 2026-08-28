import {
  createAiWorkspace,
  applyAiWorkspaceEvent,
  compactAiWorkspaceForServer,
  AI_WORKSPACE_CONTRACT_VERSION
} from '/shared/ai/ai-workspace-contract.v3990_0.js?v=3990_0';

const DB_NAME = 'gaokao-ai-workspace-v3990_0';
const STORE_NAME = 'workspace';
const WORKSPACE_KEY = 'current';
const SELECTION_POOL_KEY = 'lnRank.selectionPool.lnPhysics.2026.v3951';
const REGION_LABELS = Object.freeze({
  all: '不限', ln: '辽宁省内', shenyang: '沈阳', dalian: '大连', 'ln-other': '辽宁其他', outside: '省外',
  beijing: '北京', tianjin: '天津', hebei: '河北', shandong: '山东', jilin: '吉林', heilongjiang: '黑龙江',
  jiangzhehu: '江浙沪', guangdong: '广东', huazhong: '华中', southwest: '西南', northwest: '西北'
});

let workspace = createAiWorkspace();
let pendingIntent = null;
let pendingInput = '';

const $ = selector => document.querySelector(selector);
const els = {
  taskList: $('#taskList'), resultStream: $('#resultStream'), constraintList: $('#constraintList'), pendingList: $('#pendingList'), evidenceList: $('#evidenceList'),
  form: $('#promptForm'), input: $('#promptInput'), send: $('#sendButton'), starter: $('#starterPanel'), health: $('#healthBar'),
  importSelection: $('#importSelection'), importStatus: $('#importStatus'), newWorkspace: $('#newWorkspace'), exportWorkspace: $('#exportWorkspace'),
  confirmDialog: $('#confirmDialog'), confirmText: $('#confirmText'), confirmApply: $('#confirmApply')
};

function node(tag, className = '', text = '') {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

function safeHref(value) {
  const text = String(value || '').trim();
  if (text.startsWith('/')) return text;
  try {
    const url = new URL(text);
    return url.protocol === 'https:' ? url.toString() : '';
  } catch { return ''; }
}

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function loadWorkspace() {
  try {
    const db = await openDb();
    const value = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const request = tx.objectStore(STORE_NAME).get(WORKSPACE_KEY);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
    db.close();
    workspace = value?.contractVersion === AI_WORKSPACE_CONTRACT_VERSION ? createAiWorkspace(value) : createAiWorkspace();
  } catch {
    workspace = createAiWorkspace();
  }
}

async function saveWorkspace() {
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(workspace, WORKSPACE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {}
}

function regionText(values = []) {
  return values.map(key => REGION_LABELS[key] || key).join('、');
}

function renderTasks() {
  els.taskList.replaceChildren();
  if (!workspace.tasks.length) {
    els.taskList.append(node('p', 'muted', '还没有任务。直接说一个真实问题即可开始。'));
    return;
  }
  for (const task of workspace.tasks) {
    const item = node('button', `task-item${task.id === workspace.mainTaskId ? ' is-main' : ''}`);
    item.type = 'button';
    const title = node('b', '', task.title || '未命名任务');
    const meta = node('small', '', task.id === workspace.mainTaskId ? `主任务 · ${task.status}` : `${task.kind || '旁支'} · ${task.status}`);
    item.append(title, meta);
    item.addEventListener('click', () => {
      const result = task.result;
      if (result) {
        workspace.lastResult = result;
        render();
      }
    });
    els.taskList.append(item);
  }
}

function renderConstraints() {
  els.constraintList.replaceChildren();
  const entries = [
    { label: '参考分数', text: workspace.examContext.score ? `${workspace.examContext.score}分` : '' },
    { label: '历史参考位次', text: workspace.examContext.rank ? `约第${Number(workspace.examContext.rank).toLocaleString('zh-CN')}位` : '' }
  ];
  for (const item of workspace.hardConstraints || []) {
    const values = item.key.startsWith('region') ? regionText(item.values || []) : (item.values || []).join(' / ');
    entries.push({ label: `硬条件 · ${item.label || item.key}`, text: values });
  }
  for (const item of workspace.softPreferences || []) {
    const values = item.key.startsWith('region') ? regionText(item.values || []) : (item.values || []).join(' / ');
    entries.push({ label: `偏好 · ${item.label || item.key}`, text: values });
  }
  if (workspace.selectionSnapshot?.items?.length) entries.push({ label: '已导入家庭方案', text: `${workspace.selectionSnapshot.items.length}项只读快照` });
  const visible = entries.filter(item => item.text);
  if (!visible.length) {
    els.constraintList.append(node('p', 'muted', '尚未确认硬条件。普通问题不会自动写入这里。'));
    return;
  }
  for (const entry of visible) {
    const box = node('div', 'constraint-chip');
    box.append(node('strong', '', entry.label), node('span', '', entry.text));
    els.constraintList.append(box);
  }
}

function renderPending() {
  els.pendingList.replaceChildren();
  const items = workspace.pendingChecks || [];
  if (!items.length) {
    els.pendingList.append(node('p', 'muted', '目前没有新增待核验事项。'));
    return;
  }
  for (const item of items) els.pendingList.append(node('div', 'pending-item', item.text || String(item)));
}

function renderEvidenceAside() {
  els.evidenceList.replaceChildren();
  const items = workspace.evidence || [];
  if (!items.length) {
    els.evidenceList.append(node('p', 'muted', '执行到需要核验的事实时，这里会出现官方入口。'));
    return;
  }
  for (const item of items.slice(0, 8)) {
    const box = node('div', 'evidence-item');
    const href = safeHref(item.sourceUrl);
    if (href) {
      const link = node('a', '', item.sourceName || '官方来源');
      link.href = href;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      box.append(link);
    } else box.append(node('span', '', item.sourceName || '官方来源'));
    box.append(node('small', '', `${item.level || 'A'}级 · ${item.scope || '核验入口'}`));
    els.evidenceList.append(box);
  }
}

function countGrid(counts = {}) {
  const grid = node('div', 'count-grid');
  const definitions = [['upper', '稍高目标'], ['near', '主要参考'], ['steady', '低分侧'], ['total', '合计']];
  for (const [key, label] of definitions) {
    const card = node('div', 'count-card');
    card.append(node('b', '', Number(counts[key] || 0).toLocaleString('zh-CN')), node('span', '', label));
    grid.append(card);
  }
  return grid;
}

function candidateList(records = []) {
  const list = node('div', 'candidate-list');
  for (const record of records.slice(0, 18)) {
    const item = node('div', 'candidate-item');
    item.append(
      node('b', '', record.school || record.schoolName || '学校待核'),
      node('span', '', record.major || record.majorName || '专业待核'),
      node('small', '', `${record.bandKey || record.band || ''}${record.rank2026 ? ` · ${Number(record.rank2026).toLocaleString('zh-CN')}位` : ''}`)
    );
    list.append(item);
  }
  return list;
}

function renderBlock(block) {
  const type = block?.type || 'plain';
  const classMap = { task_header: 'task-header', fact_summary: 'fact', delta: 'delta', clarification: 'warning', evidence: 'evidence', pending_checks: 'warning' };
  const box = node('section', `block ${classMap[type] || ''}`);
  if (block.title) box.append(node('h3', '', block.title));
  if (block.subtitle) box.append(node('p', '', block.subtitle));
  if (block.text) box.append(node('p', '', block.text));

  if (type === 'candidate_routes') {
    box.append(countGrid(block.counts || {}));
    if (block.records?.length) box.append(candidateList(block.records));
  }
  if (type === 'comparison') {
    const list = node('div', 'candidate-list');
    for (const item of block.items || []) {
      const row = node('div', 'candidate-item');
      row.append(node('b', '', item.school || '学校'), node('span', '', `${Number(item.result?.counts?.total || 0).toLocaleString('zh-CN')}条历史参考记录`), node('small', '', item.result?.ok ? '确定性执行' : '未完成'));
      list.append(row);
    }
    box.append(list);
  }
  if (type === 'delta') {
    const list = node('div', 'delta-list');
    const changes = block.delta?.countChanges || {};
    for (const [key, value] of Object.entries(changes)) {
      const labels = { upper: '稍高目标', near: '主要参考', steady: '低分侧', total: '合计' };
      list.append(node('div', 'delta-line', `${labels[key] || key}：${value.before} → ${value.after}（${value.delta > 0 ? '+' : ''}${value.delta}）`));
    }
    if (block.delta?.addedPreviewIds?.length) list.append(node('div', 'delta-line', `当前预览新增 ${block.delta.addedPreviewIds.length} 项。`));
    if (block.delta?.removedPreviewIds?.length) list.append(node('div', 'delta-line', `当前预览减少 ${block.delta.removedPreviewIds.length} 项。`));
    box.append(list);
  }
  if (type === 'evidence') {
    const list = node('div', 'evidence-items');
    for (const item of block.items || []) {
      const row = node('div', 'evidence-item');
      const href = safeHref(item.sourceUrl);
      if (href) {
        const link = node('a', '', item.sourceName || '官方来源');
        link.href = href; link.target = '_blank'; link.rel = 'noopener noreferrer'; row.append(link);
      }
      row.append(node('small', '', `${item.level || 'A'}级 · ${item.scope || ''}`));
      list.append(row);
    }
    box.append(list);
  }
  if (type === 'pending_checks') {
    const list = node('div', 'pending-items');
    for (const item of block.items || []) list.append(node('div', 'pending-item', item.text || String(item)));
    box.append(list);
  }
  if (type === 'action') {
    const actions = node('div', 'block-actions');
    for (const action of block.actions || []) {
      if (action.href) {
        const link = node('a', '', action.label || '打开');
        link.href = safeHref(action.href) || '/';
        actions.append(link);
      } else {
        const button = node('button', '', action.label || '继续');
        button.type = 'button';
        button.addEventListener('click', () => els.input.focus());
        actions.append(button);
      }
    }
    box.append(actions);
  }
  return box;
}

function renderResults() {
  els.resultStream.replaceChildren();
  const blocks = workspace.lastTurn?.blocks || [];
  els.starter.hidden = blocks.length > 0;
  if (!blocks.length) return;
  for (const block of blocks) els.resultStream.append(renderBlock(block));
}

function render() {
  renderTasks();
  renderConstraints();
  renderPending();
  renderEvidenceAside();
  renderResults();
}

async function checkHealth() {
  try {
    const response = await fetch('/api/ai/health', { headers: { accept: 'application/json' }, cache: 'no-store' });
    const data = await response.json();
    if (!response.ok || !data?.ok) throw new Error('health failed');
    const modelReady = data.provider?.workersModelConfigured || data.provider?.externalConfigured;
    els.health.className = `health-bar ${modelReady ? 'is-ok' : 'is-warn'}`;
    els.health.textContent = modelReady
      ? `工作台已就绪：确定性数据执行 + ${data.provider.primary} 意图解析。模型失败时会自动退回本地规则。`
      : '工作台已就绪：当前未配置专用AI模型，先使用确定性意图规则；位次和候选查询不受影响。';
  } catch {
    els.health.className = 'health-bar is-warn';
    els.health.textContent = '健康检查暂时不可用；已有工作区仍保存在本机，不会因此丢失。';
  }
}

function currentTaskIdAfterIntent(taskAction) {
  if (['branch', 'simulation', 'comparison'].includes(taskAction)) return workspace.tasks[0]?.id || workspace.mainTaskId;
  return workspace.mainTaskId;
}

async function executeTurn(input, confirmedIntent = null) {
  els.send.disabled = true;
  els.send.textContent = '执行中…';
  try {
    const response = await fetch('/api/ai/turn', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ workspace: compactAiWorkspaceForServer(workspace), input, confirmedIntent })
    });
    const data = await response.json();
    if (!response.ok || !data?.ok) throw new Error(data?.message || '本轮执行失败');
    if (data.pendingConfirmation) {
      pendingIntent = data.intent;
      pendingInput = input;
      els.confirmText.textContent = data.intent?.reason || '这条表达可能明显缩小结果，请确认是否作为硬条件执行。';
      els.confirmDialog.showModal();
      return;
    }

    workspace = applyAiWorkspaceEvent(workspace, data.event);
    const taskId = currentTaskIdAfterIntent(data.taskAction);
    workspace = applyAiWorkspaceEvent(workspace, {
      type: 'result_committed',
      payload: {
        taskId,
        result: data.result,
        turn: { blocks: data.blocks || [], intent: data.intent, delta: data.delta, provider: data.provider, at: new Date().toISOString() }
      }
    });
    await saveWorkspace();
    render();
    els.input.value = '';
  } catch (error) {
    const box = node('section', 'block warning');
    box.append(node('h3', '', '本轮没有修改工作区'), node('p', '', String(error?.message || error)));
    els.resultStream.prepend(box);
  } finally {
    els.send.disabled = false;
    els.send.textContent = '执行';
  }
}

function selectionSnapshotFromStorage() {
  let parsed;
  try {
    const raw = localStorage.getItem(SELECTION_POOL_KEY);
    if (!raw) return { version: 'ln-rank-selection-snapshot-v3990_0', items: [] };
    parsed = JSON.parse(raw);
  } catch { return { version: 'ln-rank-selection-snapshot-v3990_0', items: [] }; }
  const items = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.items) ? parsed.items : []);
  return {
    version: 'ln-rank-selection-snapshot-v3990_0',
    items: items.slice(0, 112).map(item => ({
      id: String(item?.id || '').slice(0, 220),
      school: String(item?.school || '').slice(0, 120),
      major: String(item?.major || '').slice(0, 180),
      score2026: Number.isFinite(Number(item?.score2026 ?? item?.score)) ? Number(item.score2026 ?? item.score) : null,
      rank2026: Number.isFinite(Number(item?.rank2026 ?? item?.rank)) ? Number(item.rank2026 ?? item.rank) : null,
      bandKey: String(item?.bandKey || item?.band || '').slice(0, 40),
      displayLocation: String(item?.displayLocation || '').slice(0, 80),
      natureLabel: String(item?.natureLabel || '').slice(0, 60),
      tuition: String(item?.tuition || '').slice(0, 80),
      userNote: String(item?.userNote || '').slice(0, 240)
    }))
  };
}

els.form.addEventListener('submit', event => {
  event.preventDefault();
  const input = els.input.value.trim();
  if (input) executeTurn(input);
});

els.input.addEventListener('keydown', event => {
  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    els.form.requestSubmit();
  }
});

for (const button of document.querySelectorAll('[data-prompt]')) {
  button.addEventListener('click', () => {
    els.input.value = button.dataset.prompt || '';
    els.input.focus();
  });
}

els.confirmApply.addEventListener('click', async () => {
  if (!pendingIntent) return;
  els.confirmDialog.close();
  const intent = pendingIntent;
  const input = pendingInput;
  pendingIntent = null;
  pendingInput = '';
  await executeTurn(input, intent);
});

els.importSelection.addEventListener('click', async () => {
  const snapshot = selectionSnapshotFromStorage();
  workspace = applyAiWorkspaceEvent(workspace, { type: 'selection_snapshot_imported', payload: { snapshot } });
  await saveWorkspace();
  els.importStatus.textContent = snapshot.items.length ? `已导入${snapshot.items.length}项只读快照；原选择池未修改。` : '当前浏览器没有可导入的2026选择池记录。';
  render();
});

els.newWorkspace.addEventListener('click', async () => {
  if (!confirm('新建工作区会清空当前AI工作区，本来的 ln-rank 选择池不会受影响。继续吗？')) return;
  workspace = createAiWorkspace();
  await saveWorkspace();
  render();
});

els.exportWorkspace.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(workspace, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `gaokao-ai-workspace-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

await loadWorkspace();
render();
checkHealth();