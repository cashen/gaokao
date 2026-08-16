import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deterministicCommand } from '../functions/_lib/ai/command-interpreter.js';
import { orchestrateAiTurn } from '../functions/_lib/ai/turn-orchestrator.js';
import { onRequestGet as majorHistoryGet } from '../functions/api/ai/major-history.js';
import { runMajorRegionHistory } from '../functions/_lib/ai/tool-registry.js';
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
const spokenMajorCases = [
  ['省内机械电子 所有学校 包含这个专业的 分数 从高到底', '机械电子工程'],
  ['省内电气工程及自动化专业所有的分数', '电气工程及其自动化'],
  ['省内计科所有学校分数从高到低', '计算机科学与技术'],
  ['省内软工所有学校分数从高到低', '软件工程'],
  ['省内临床所有学校分数从高到低', '临床医学'],
  ['省内车辆所有学校分数从高到低', '车辆工程']
];
for (const [spokenInput, expectedMajor] of spokenMajorCases) {
  const spokenCommand = deterministicCommand(spokenInput, createAiWorkspace());
  assert(spokenCommand.agentTask === 'major_region_history', `spoken major did not route to history: ${spokenInput} -> ${spokenCommand.agentTask}`);
  assert(spokenCommand.majorKeywords?.includes(expectedMajor), `spoken major was not canonicalized: ${spokenInput} -> ${JSON.stringify(spokenCommand.majorKeywords)}`);
  assert(spokenCommand.regionKeys?.some(key => key === 'ln' || key === 'province:辽宁'), `spoken region was not parsed: ${spokenInput}`);
}
const multiInput = '省内机械电气测控都多少分';
const multiWorkspace = createAiWorkspace();
const multiCommand = deterministicCommand(multiInput, multiWorkspace);
assert(multiCommand.agentTask === 'major_region_history', `multi-major query task drifted: ${multiCommand.agentTask}`);
assert(JSON.stringify(multiCommand.majorKeywords) === JSON.stringify(['机械', '电气', '测控技术与仪器']), `multi-major parsing drifted: ${JSON.stringify(multiCommand.majorKeywords)}`);
const command = deterministicCommand(input, workspace);
assert(command.agentTask === 'major_region_history', `expected major_region_history, got ${command.agentTask}`);
assert(command.taskLocked === true, 'major region history must be task-locked');
assert(command.majorKeywords?.includes('测控技术与仪器'), `major alias not normalized: ${JSON.stringify(command.majorKeywords)}`);
assert(command.regionKeys?.some(key => key === 'ln' || key === 'province:辽宁'), `liaoning region not parsed: ${JSON.stringify(command.regionKeys)}`);

async function resolveMajorHistoryThroughBridge({majorKeyword,regionKeys=['all'],bottomLineMode='all'}) {
  const bridgeContext = { request: new Request('https://example.test/api/ai/turn', { method: 'POST' }), env: { ASSETS: assets }, aiDeterministicToolResults: {} };
  for (let round = 0; round < 4; round += 1) {
    const result = await runMajorRegionHistory(bridgeContext, { majorKeyword, regionKeys, bottomLineMode });
    if (result?.code !== 'client_tool_required') return { result, entries: bridgeContext.aiDeterministicToolResults, rounds: round + 1 };
    const requests = result.toolRequests?.length ? result.toolRequests : [result.toolRequest].filter(Boolean);
    for (const tool of requests) {
      const request = new Request(new URL(tool.url, 'https://example.test').toString(), { headers: { accept: 'application/json' } });
      const response = await majorHistoryGet({ request, env: { ASSETS: assets } });
      const payload = await response.json();
      assert(response.ok && payload.ok, `bridge page failed: ${tool.url} -> ${JSON.stringify(payload)}`);
      bridgeContext.aiDeterministicToolResults[tool.key] = { kind: 'major_history', key: tool.key, url: tool.url, status: response.status, payload };
    }
  }
  throw new Error('major history bridge did not converge inside the browser orchestration budget');
}

const globalElectricBridge = await resolveMajorHistoryThroughBridge({ majorKeyword: '电气工程及其自动化', regionKeys: ['all'] });
assert(globalElectricBridge.result?.ok === true, 'global electric history bridge did not complete');
assert(globalElectricBridge.result.complete === true, 'global electric history must exhaust all pages');
assert(globalElectricBridge.result.total === 283, `global electric truth count drifted: ${globalElectricBridge.result.total}`);
assert(globalElectricBridge.result.records.length === 283, 'global electric records were truncated after pagination');
assert(globalElectricBridge.result.queryResults?.[0]?.recordCount === 283, 'query delivered count must equal loaded truth set');
assert(globalElectricBridge.result.queryResults?.[0]?.availableCount === 283, 'query source total must remain visible');
assert(Object.keys(globalElectricBridge.entries).length === 3, `283 records should use exactly three deterministic pages, got ${Object.keys(globalElectricBridge.entries).length}`);
assert(Object.keys(globalElectricBridge.entries).some(key => key.includes('offset=100')) && Object.keys(globalElectricBridge.entries).some(key => key.includes('offset=200')), 'continuation offsets 100/200 are missing');

const context = { request: new Request('https://example.test/api/ai/turn', { method: 'POST' }), env: { ASSETS: assets } };
const globalInput = '电气工程及其自动化所有学校分数从高到低';
const globalWorkspace = createAiWorkspace();
const globalCommand = deterministicCommand(globalInput, globalWorkspace);
assert(globalCommand.agentTask === 'major_region_history', `global electric query task drifted: ${globalCommand.agentTask}`);
const globalEntries = {};
let globalTurn = null;
for (let round = 0; round < 4; round += 1) {
  globalTurn = await orchestrateAiTurn(context, { input: globalInput, workspace: globalWorkspace, confirmedCommand: globalCommand, deterministicToolResults: globalEntries });
  if (!globalTurn.pendingDeterministicTool) break;
  const requests = globalTurn.toolRequests?.length ? globalTurn.toolRequests : [globalTurn.toolRequest].filter(Boolean);
  for (const tool of requests) {
    const request = new Request(new URL(tool.url, 'https://example.test').toString(), { headers: { accept: 'application/json' } });
    const response = await majorHistoryGet({ request, env: { ASSETS: assets } });
    const fact = await response.json();
    assert(response.ok && fact.ok, `global electric fact failed: ${tool.url} -> ${JSON.stringify(fact)}`);
    globalEntries[tool.key] = { kind: 'major_history', key: tool.key, url: tool.url, status: response.status, payload: fact };
  }
}
assert(globalTurn?.ok === true && globalTurn.pendingDeterministicTool === false, 'global electric orchestrated turn did not converge');
assert(globalTurn.result?.majorHistory?.total === 283 && globalTurn.result.majorHistory.complete === true, 'orchestrated global electric result lost pagination completeness');
const globalHistoryBlock = (globalTurn.blocks || []).find(block => block.type === 'history_records');
assert(globalHistoryBlock?.records?.length === 283, `global electric presentation silently truncated records: ${globalHistoryBlock?.records?.length}`);
assert(/分页已经完整耗尽/.test(globalHistoryBlock?.text || ''), `presentation did not state pagination completeness: ${globalHistoryBlock?.text || ''}`);

const multiFirst = await orchestrateAiTurn(context, { input: multiInput, workspace: multiWorkspace, confirmedCommand: multiCommand });
assert(multiFirst.pendingDeterministicTool === true, 'multi-major history must request deterministic facts');
assert(multiFirst.toolRequests?.length === 3, `multi-major history expected three requests, got ${multiFirst.toolRequests?.length}`);
const multiEntries = {};
for (const tool of multiFirst.toolRequests) {
  const request = new Request(new URL(tool.url, 'https://example.test').toString(), { headers: { accept: 'application/json' } });
  const response = await majorHistoryGet({ request, env: { ASSETS: assets } });
  const fact = await response.json();
  assert(response.ok && fact.ok, `multi-major fact failed: ${tool.url} -> ${JSON.stringify(fact)}`);
  multiEntries[tool.key] = { kind: 'major_history', key: tool.key, url: tool.url, status: response.status, payload: fact };
}
const multiSecond = await orchestrateAiTurn(context, { input: multiInput, workspace: multiWorkspace, confirmedCommand: multiCommand, deterministicToolResults: multiEntries });
assert(multiSecond.ok === true && multiSecond.pendingDeterministicTool === false, 'multi-major continuation did not complete');
assert(multiSecond.result?.majorHistory?.queryResults?.length === 3, 'multi-major query statuses missing');
assert(multiSecond.result.majorHistory.queryResults.every(item => item.status === 'success'), 'multi-major query contains unexpected failure');
assert(multiSecond.result.majorHistory.records.length > 0, 'multi-major result has no records');
assert(multiSecond.result.majorHistory.records.every((item, index, list) => index === 0 || Number(list[index - 1].score2026) >= Number(item.score2026)), 'multi-major result is not sorted high to low');
assert(/3项查询均已完成/.test(multiSecond.blocks?.[0]?.text || ''), `multi-major completion is not explicit: ${multiSecond.blocks?.[0]?.text || ''}`);
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
assert(toolRequest.url.includes('bottomLineMode=all'), `default major history must include all project types: ${toolRequest.url}`);

const followupWorkspace = createAiWorkspace({
  activeView: { target: 'candidates', score: null, majorKeywords: ['测控技术与仪器'], regionKeys: ['ln'], schoolNames: [], bottomLineMode: 'all', combination: 'replace' },
  agentContext: { currentTask: 'major_region_history', focus: { major: '测控技术与仪器' } }
});
const followup = deterministicCommand('去掉中外', followupWorkspace);
assert(followup.agentTask === 'major_region_history', `project-scope follow-up left history task: ${followup.agentTask}`);
assert(followup.bottomLineMode === 'exclude_sino', `project-scope follow-up did not set exclude-sino mode: ${followup.bottomLineMode}`);

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
