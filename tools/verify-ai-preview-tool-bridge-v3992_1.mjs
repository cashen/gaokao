import assert from 'node:assert/strict';

const base = String(process.env.PREVIEW_URL || '').replace(/\/$/, '');
if (!/^https:\/\//.test(base)) throw new Error('PREVIEW_URL is required');

const workspace = {
  contractVersion: 'ai-workspace-contract-v3992_0',
  examContext: { score: 580 },
  activeView: { score: 580, regionKeys: ['all'], majorKeywords: [], schoolNames: [], bottomLineMode: 'all' },
  decisionProfile: { explicit: {}, inferred: {}, priorities: [], updatedAt: null },
  conversationMemory: { summary: '', facts: [], unresolved: [] },
  agentContext: { currentTask: '', focus: {}, contextUsage: {} },
  tasks: [],
  turnHistory: [],
  viewHistory: [],
  hardConstraints: [],
  pendingChecks: [],
  evidenceLedger: [],
  selectionSnapshot: { version: 'ln-rank-selection-snapshot-v3992_0', items: [] }
};

function compactMajorBands(payload = {}) {
  const band = key => ({
    count: Number(payload?.bands?.[key]?.count || 0),
    records: Array.isArray(payload?.bands?.[key]?.records) ? payload.bands[key].records.slice(0, 24) : []
  });
  return {
    ok: Boolean(payload.ok),
    meta: payload.meta || {},
    counts: payload.counts || {},
    bands: { upper: band('upper'), near: band('near'), steady: band('steady') },
    searchAdvices: Array.isArray(payload.searchAdvices) ? payload.searchAdvices.slice(0, 8) : [],
    filterConflicts: Array.isArray(payload.filterConflicts) ? payload.filterConflicts.slice(0, 8) : [],
    keywordWarnings: Array.isArray(payload.keywordWarnings) ? payload.keywordWarnings.slice(0, 8) : [],
    source: payload.source || {}
  };
}

async function postTurn(body) {
  const response = await fetch(`${base}/api/ai/turn`, {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => null);
  assert.equal(response.ok, true, `AI turn HTTP ${response.status}: ${JSON.stringify(data)}`);
  assert.equal(data?.ok, true, `AI turn not ok: ${JSON.stringify(data)}`);
  return data;
}

async function runTool(tool) {
  assert.equal(tool?.kind, 'major_bands');
  assert.equal(tool?.method, 'GET');
  assert.equal(typeof tool?.key, 'string');
  assert.equal(tool?.url, tool?.key);
  assert.match(tool.url, /^\/api\/major-bands\?/);
  const response = await fetch(`${base}${tool.url}`, {
    method: 'GET',
    headers: { accept: 'application/json' },
    cache: 'no-store'
  });
  const payload = await response.json().catch(() => null);
  assert.equal(response.ok, true, `major-bands HTTP ${response.status}: ${JSON.stringify(payload)}`);
  assert.equal(payload?.ok, true, `major-bands not ok: ${JSON.stringify(payload)}`);
  return {
    kind: 'major_bands',
    key: tool.key,
    url: tool.url,
    status: response.status,
    payload: compactMajorBands(payload)
  };
}

async function completeTurn(input) {
  const deterministicToolResults = {};
  let confirmedCommand = null;
  let last = null;
  for (let hop = 0; hop < 5; hop += 1) {
    last = await postTurn({ workspace, input, confirmedCommand, deterministicToolResults });
    assert.notEqual(last.pendingConfirmation, true, `unexpected clarification for ${input}`);
    if (!last.pendingDeterministicTool) return { final: last, hops: hop, deterministicToolResults };
    assert.ok(last.toolRequest, `missing tool request for ${input}`);
    const result = await runTool(last.toolRequest);
    deterministicToolResults[result.key] = result;
    confirmedCommand = last.command;
  }
  throw new Error(`deterministic tool bridge exceeded hop limit for: ${input}; last=${JSON.stringify(last)}`);
}

const candidate = await completeTurn('省内电气有哪些学校');
assert.ok(candidate.hops >= 1, 'candidate turn must cross browser deterministic tool bridge');
assert.deepEqual(candidate.final?.resolvedView?.regionKeys, ['ln']);
assert.ok(candidate.final?.resolvedView?.majorKeywords?.includes('电气'));
assert.equal(candidate.final?.result?.candidates?.ok, true);
assert.ok(Number(candidate.final?.result?.candidates?.counts?.total || 0) > 0);

const comparison = await completeTurn('电气和机械怎么选');
assert.ok(comparison.hops >= 2, 'major comparison must execute one canonical candidate query per compared major');
assert.equal(comparison.final?.result?.comparison?.kind, 'major');
assert.ok(Array.isArray(comparison.final?.result?.comparison?.items));
assert.ok(comparison.final.result.comparison.items.length >= 2);
assert.ok(Array.isArray(comparison.final?.result?.comparison?.pendingEvidenceDimensions));
assert.ok(comparison.final.result.comparison.pendingEvidenceDimensions.length > 0);

console.log(JSON.stringify({
  ok: true,
  version: 'ai-preview-tool-bridge-v3992_1',
  preview: base,
  candidateToolHops: candidate.hops,
  comparisonToolHops: comparison.hops,
  candidateTotal: candidate.final.result.candidates.counts.total,
  comparisonKind: comparison.final.result.comparison.kind
}, null, 2));
