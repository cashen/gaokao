import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deterministicCommand } from '../functions/_lib/ai/command-interpreter.js';
import { orchestrateAiTurn } from '../functions/_lib/ai/turn-orchestrator.js';
import { onRequestGet as majorHistoryGet } from '../functions/api/ai/major-history.js';
import { createAiWorkspace } from '../shared/ai/ai-workspace-contract.v3992_0.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function assert(condition, message) { if (!condition) throw new Error(message); }
function jsonFileForUrl(url) { return path.join(ROOT, new URL(url).pathname.replace(/^\//, '')); }
const assets = {
  async fetch(request) {
    const file = jsonFileForUrl(request.url);
    if (!fs.existsSync(file)) return new Response('not found', { status: 404, headers: { 'content-type': 'text/plain' } });
    return new Response(fs.readFileSync(file), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } });
  }
};

const input = '测控专业 省内都多少分';
const workspace = createAiWorkspace();
const command = deterministicCommand(input, workspace);
assert(command.agentTask === 'major_region_history', `expected major_region_history, got ${command.agentTask}`);
assert(command.taskLocked === true, 'major region history must be task-locked');
assert(command.majorKeywords?.includes('测控技术与仪器'), `major alias not normalized: ${JSON.stringify(command.majorKeywords)}`);
assert(command.regionKeys?.some(key => key === 'ln' || key === 'province:辽宁'), `liaoning region not parsed: ${JSON.stringify(command.regionKeys)}`);

const context = { request: new Request('https://example.test/api/ai/turn', { method: 'POST' }), env: { ASSETS: assets } };
const first = await orchestrateAiTurn(context, { input, workspace, confirmedCommand: command });
assert(first.ok === true && first.pendingDeterministicTool === true, 'first turn must request deterministic major-history facts');
assert(first.toolRequest?.kind === 'major_history', `unexpected tool kind ${first.toolRequest?.kind}`);
assert(first.toolRequest?.url?.startsWith('/api/ai/major-history?'), `unexpected tool url ${first.toolRequest?.url}`);
assert(first.resolvedView?.majorKeywords?.includes('测控技术与仪器'), 'resolved view did not retain measurement major');
assert(first.resolvedView?.regionKeys?.some(key => key === 'ln' || key === 'province:辽宁'), 'resolved view did not retain Liaoning');

const toolRequest = first.toolRequest;
const apiRequest = new Request(new URL(toolRequest.url, 'https://example.test').toString(), { headers: { accept: 'application/json' } });
const apiResponse = await majorHistoryGet({ request: apiRequest, env: { ASSETS: assets } });
const payload = await apiResponse.json();
assert(apiResponse.ok && payload.ok, `major-history API failed: ${JSON.stringify(payload)}`);
assert(payload.total > 0, 'measurement major should return Liaoning score records');
assert(payload.records.length === payload.total, 'Liaoning measurement query should be complete in one response');
assert(payload.records.every(record => record.province === '辽宁'), 'major-history region filter leaked outside Liaoning');
assert(payload.records.every(record => Number.isFinite(Number(record.score2026))), 'major-history record missing 2026 score');
assert(Number.isFinite(Number(payload.summary?.minScore)) && Number.isFinite(Number(payload.summary?.maxScore)), 'score range summary missing');

const entry = { kind: 'major_history', key: toolRequest.key, url: toolRequest.url, status: apiResponse.status, payload };
const second = await orchestrateAiTurn(context, { input, workspace, confirmedCommand: command, deterministicToolResults: { [toolRequest.key]: entry } });
assert(second.ok === true && second.pendingDeterministicTool === false, 'continued turn did not complete');
assert(second.commitView === true, 'explicit region/major change must commit active view');
assert(second.result?.majorHistory?.ok === true, 'major history result missing');
assert(second.result.majorHistory.records.length > 0, 'major history result has no records');
const historyBlock = (second.blocks || []).find(block => block.type === 'history_records');
assert(historyBlock?.records?.length > 0, 'history records block missing');
assert(/分/.test(historyBlock.text || ''), `history summary did not answer score question: ${historyBlock.text || ''}`);
assert(!/需要参考分数/.test(historyBlock.text || ''), 'major history must not require candidate score');

const remembered = createAiWorkspace({ examContext: { score: 600 }, activeView: { target: 'candidates', score: 600, majorKeywords: [], regionKeys: ['all'], schoolNames: [], bottomLineMode: 'all', combination: 'replace' } });
const rememberedCommand = deterministicCommand(input, remembered);
assert(rememberedCommand.agentTask === 'major_region_history', 'remembered candidate score must not turn a history question into candidate search');

console.log(JSON.stringify({
  ok: true,
  input,
  agentTask: command.agentTask,
  major: command.majorKeywords[0],
  region: command.regionKeys,
  total: payload.total,
  schoolCount: payload.summary.schoolCount,
  minScore: payload.summary.minScore,
  maxScore: payload.summary.maxScore,
  complete: payload.complete,
  firstRecords: payload.records.slice(0, 8).map(record => ({ school: record.school, major: record.major, score2026: record.score2026, rank2026: record.rank2026 }))
}, null, 2));
