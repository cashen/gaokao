import { state } from '../../state/app-state.v3963_1.js?v=3963_1';
import { resolveMajorQueryCandidates } from '../../knowledge/major-understanding-resolver.js?v=3949_0';
import { createSelectionPoolAdapter, refreshSelectionPool } from '../selection-pool/index.v3964_0.js?v=3964_0';
import { buildSchoolAllHref } from '../../../../shared/resources/schools/school-resource-center.js?v=3990_2&r=r033-tongxue-school-entry';

export const MAJOR_ALL_MODE_VERSION = 'major-all-mode-v004';
const API_PATH = '/api/ai/major-history';
const MODE = 'major-all';
const INPUT_MODES = new Set(['score-bands', 'school-all', MODE]);
const PAGE_SIZE = 40;
const selectionPool = createSelectionPoolAdapter();
const view = { data: null, loading: false, error: '', dirty: false, offset: 0, requestId: 0 };
let mounted = false;
let lockedConfirmed = [];
const confirmedDirectionTerms = new Set();
const confirmedDirectionScopes = new Map();
const DEFAULT_MAJOR_PLACEHOLDER = '先输入一个，如：电气、机械或计算机';
const ADD_MAJOR_PLACEHOLDER = '继续添加一个，如：测控、材料或软件';

function byId(id) { return document.getElementById(id); }
function text(value) { return String(value == null ? '' : value).trim(); }
function esc(value) { return text(value).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
function liveFieldValue(id, fallback = '') {
  const field = byId(id);
  return text(field ? field.value : fallback);
}
function inputValue() { return liveFieldValue('majorKeyword', state.filters.majorKeyword); }
function scoreValue() { const raw = text(byId('candidateScore')?.value).replace(/[^0-9]/g,''); const n=Number(raw); return raw && Number.isFinite(n) && n>=150 && n<=750 ? Math.round(n) : null; }
function rawScorePresent() { return Boolean(text(byId('candidateScore')?.value)); }
function projectMode() { const v=text(byId('majorProjectMode')?.value||'all'); return ['all','ordinary-only','sino-only'].includes(v)?v:'all'; }
function regionValue() { return liveFieldValue('region', state.filters.region || 'all') || 'all'; }
function schoolValue() { return liveFieldValue('schoolKeyword', state.filters.schoolKeyword); }
function uniqueTerms(values=[]) { return [...new Set(values.flatMap(value => String(value || '').split(/[,，、/；;|]+/).map(item => item.trim()).filter(Boolean)))]; }
function draftMajorText() { return uniqueTerms([...lockedConfirmed, inputValue()]).join('/'); }
function restoreConfirmedFromUrl() {
  lockedConfirmed = [];
  confirmedDirectionTerms.clear();
  confirmedDirectionScopes.clear();
  const params = new URLSearchParams(location.search);
  const rawTerms = uniqueTerms([params.get('majorKeyword')]);
  if (!rawTerms.length) return;
  const confirmed = new Map();
  params.getAll('majorConfirmed').forEach(value => {
    const raw = text(value);
    const separator = raw.lastIndexOf(':');
    const term = text(separator >= 0 ? raw.slice(0, separator) : raw);
    const scope = text(separator >= 0 ? raw.slice(separator + 1) : 'core');
    if (term && ['core', 'related', 'admission-groups'].includes(scope) && rawTerms.includes(term)) {
      confirmed.set(term, scope);
    }
  });
  for (const [term, scope] of confirmed) {
    const item = resolveMajorQueryCandidates(term).items.find(candidate => candidate.input === term
      && candidate.intentLevel === 'direction'
      && candidate.intentStatus === 'ready');
    if (!item) continue;
    if (!lockedConfirmed.includes(term)) lockedConfirmed.push(term);
    confirmedDirectionTerms.add(term);
    confirmedDirectionScopes.set(term, scope);
  }
  if (!confirmed.size) return;
  const field = byId('majorKeyword');
  const draftTerms = rawTerms.filter(term => !confirmedDirectionTerms.has(term));
  if (field) {
    field.value = draftTerms.join('/');
    field.placeholder = ADD_MAJOR_PLACEHOLDER;
  }
  state.filters.majorKeyword = draftMajorText();
}
function setQueryUrl() {
  const url=new URL(location.href);
  if(state.resultMode===MODE) url.searchParams.set('mode',MODE);
  const q=draftMajorText(),score=text(byId('candidateScore')?.value).replace(/[^0-9]/g,''),region=regionValue(),school=schoolValue(),project=projectMode();
  if(q) url.searchParams.set('majorKeyword',q); else url.searchParams.delete('majorKeyword');
  url.searchParams.delete('majorConfirmed');
  lockedConfirmed.forEach(term => {
    if (confirmedDirectionTerms.has(term)) url.searchParams.append('majorConfirmed', `${term}:${confirmedDirectionScopes.get(term) || 'core'}`);
  });
  if(score) url.searchParams.set('score',score); else url.searchParams.delete('score');
  if(region&&region!=='all') url.searchParams.set('region',region); else url.searchParams.delete('region');
  if(school) url.searchParams.set('school',school); else url.searchParams.delete('school');
  if(project&&project!=='all') url.searchParams.set('projectMode',project); else url.searchParams.delete('projectMode');
  history.replaceState(history.state,'',url.pathname+url.search+url.hash);
}
function candidates() { return resolveMajorQueryCandidates(draftMajorText()); }
function selectedItems() { return candidates().items.filter(item => item.status==='resolved' || (item.intentLevel==='direction' && confirmedDirectionTerms.has(item.input))); }
function selectedNames() { return [...new Set(selectedItems().flatMap(item => { if(item.intentLevel!=='direction') return [item.name]; const scope=confirmedDirectionScopes.get(item.input)||'core'; return scope==='core' ? (item.coreMajorNames||[]) : [...(item.coreMajorNames||[]),...(item.relatedMajorNames||[])]; }).filter(Boolean))]; }
function queryReady() { const r=candidates(); return r.items.length>0 && r.items.every(item => item.status==='resolved' || (item.intentLevel==='direction' && confirmedDirectionTerms.has(item.input))) && selectedNames().length>0; }
function majorInputBlocking() { return Boolean(inputValue()) && !queryReady(); }
function inputState() { return Object.freeze({
  version: 'major-filter-context-v004',
  mode: state.resultMode,
  active: INPUT_MODES.has(state.resultMode),
  draftText: draftMajorText(),
  blocking: majorInputBlocking(),
  ready: queryReady(),
  selectedNames: [...selectedNames()],
  selectedItems: [...selectedItems()].map(item => Object.freeze({ input: item.input, name: item.name || item.intentLabel || '', code: item.code || '', intentLevel: item.intentLevel || '' })),
  confirmedTerms: [...lockedConfirmed]
}); }
function candidateSummary(item) { if(item.intentLevel==='direction') return '这是目录方向，不是一个单一专业；确认后默认查看该方向的核心专业集合。'; if(item.intentLevel==='broad-field'||item.intentLevel==='discipline') return '这个说法范围较宽，先选具体方向，避免把不同专业混在一起。'; if(item.status==='class-level') return '这是专业类/大类，请继续选择具体本科专业，不能静默代替具体查询。'; if(item.status==='unresolved') return '暂未在2026本科专业目录中确认，请换正式名称、简称或代码。'; return '请选择规范本科专业；确认后才会读取招生历史。'; }
function renderCandidates() {
  const root=byId('majorCandidatePanel'); if(!root)return; const r=candidates(),resolvedCount=selectedItems().length;
  if(!r.terms.length){ root.hidden=state.resultMode!=='major-all'; root.innerHTML=state.resultMode==='major-all'?'<div class="major-candidate-empty">先输入一个专业或方向；确认后可以继续添加第二个、第三个专业。</div>':''; return; }
  root.hidden=false;
  const sections=r.items.map(item=>{
    if(item.status==='resolved') return `<div class="major-candidate-row is-resolved"><span class="major-candidate-term">${esc(item.input)}</span><b>${esc(item.name)}</b><small>已确认 · ${esc(item.code)}</small><button type="button" class="ui-button ui-button--compact ui-button--tertiary" data-major-remove-term="${esc(item.input)}">移除</button></div>`;
    if(item.intentLevel==='direction' && confirmedDirectionTerms.has(item.input)) { const scope=confirmedDirectionScopes.get(item.input)||'core',names=scope==='core'?item.coreMajorNames||[]:[...(item.coreMajorNames||[]),...(item.relatedMajorNames||[])]; return `<div class="major-candidate-row is-resolved"><span class="major-candidate-term">${esc(item.input)}</span><b>${esc(item.intentLabel)}</b><small>${scope==='core'?'核心专业':scope==='related'?'核心 + 相关方向':'核心 + 学校招生大类记录'} · ${names.length} 个专业</small><button type="button" class="ui-button ui-button--compact ui-button--tertiary" data-major-remove-term="${esc(item.input)}">移除</button></div>`; }
    if(item.intentLevel==='direction' && item.intentStatus==='ready') { const directButtons=(item.candidates||[]).slice(0,12).map(c=>`<button type="button" class="major-candidate-choice" data-major-candidate-input="${esc(item.input)}" data-major-candidate-name="${esc(c.name)}"><b>${esc(c.name)}</b><small>${esc(c.code)} · 直接查看这个专业</small></button>`).join(''); return `<div class="major-candidate-row is-pending"><div><span class="major-candidate-term">${esc(item.input)}</span><p>${esc(candidateSummary(item))}</p></div><div class="major-candidate-choices"><button type="button" class="major-candidate-choice is-primary" data-major-direction-scope="core" data-major-direction-term="${esc(item.input)}"><b>按核心专业查看</b><small>${item.coreMajorCodes.length} 个专业 · ${esc(item.intentLabel)}</small></button>${item.relatedMajorCodes?.length?`<button type="button" class="major-candidate-choice" data-major-direction-scope="related" data-major-direction-term="${esc(item.input)}"><b>包含相关方向</b><small>核心 + 相关共 ${item.coreMajorCodes.length+item.relatedMajorCodes.length} 个专业</small></button>`:''}<button type="button" class="major-candidate-choice" data-major-direction-scope="admission-groups" data-major-direction-term="${esc(item.input)}"><b>查看学校招生大类</b><small>保留学校原始“类/试验班”名称，需逐校核对分流规则</small></button>${directButtons?`<small class="major-candidate-subtitle">也可以直接选一个具体专业</small>${directButtons}`:''}</div></div>`; }
    const buttons=(item.candidates||[]).slice(0,8).map(c=>`<button type="button" class="major-candidate-choice" data-major-candidate-input="${esc(item.input)}" data-major-candidate-name="${esc(c.name)}"><b>${esc(c.name)}</b><small>${esc(c.code)}${c.matchType?` · ${esc(c.matchType)}`:''}</small></button>`).join('');
    return `<div class="major-candidate-row is-pending"><div><span class="major-candidate-term">${esc(item.input)}</span><p>${esc(candidateSummary(item))}</p></div><div class="major-candidate-choices">${buttons||'<span class="major-candidate-none">没有可安全确认的候选</span>'}</div></div>`;
  }).join('');
  const addAction=queryReady()&&resolvedCount?'<button type="button" class="ui-button ui-button--compact ui-button--secondary major-candidate-add" data-major-add-another>＋再添加一个专业</button>':'';
  const title=resolvedCount?`已添加 ${resolvedCount} 个专业/方向`:'先确认具体本科专业或方向';
  const stateText=queryReady()?'已全部确认；还可以继续添加。':'还有专业待确认，确认后才查询。';
  root.innerHTML=`<div class="major-candidate-head"><div><b>${title}</b><span>${stateText}</span></div><div class="major-candidate-actions">${addAction}<button type="button" class="ui-button ui-button--compact ui-button--tertiary" data-major-clear>清空专业</button></div></div>${sections}`;
}
function positionText(r){ const rawCandidate=view.data?.candidateScore; const candidate=Number(rawCandidate); if(rawCandidate===null||rawCandidate===undefined||!Number.isFinite(candidate)) return '未填写参考分数'; const distance=Number(r.positionDistance2026); if(Number.isFinite(distance)) return `参考${candidate}分 · 相差约${distance.toLocaleString('zh-CN')}位`; const target=Number(view.data?.candidateReferenceRank2026); if(Number.isFinite(target)) return `参考${candidate}分 · 参考位次约第${target.toLocaleString('zh-CN')}位`; return `参考${candidate}分 · 历史位次待核验`; }
function yearText(r,y){ const s=Number(r[`score${y}`]), k=Number(r[`rank${y}`]), hasScore=Number.isFinite(s)&&s>0, hasRank=Number.isFinite(k)&&k>0; if(!hasScore&&!hasRank) return '暂无严格同口径记录'; return `${hasScore?`${s}分`:'分数待核验'} · ${hasRank?`第${k.toLocaleString('zh-CN')}位`:'位次待核验'}`; }
function trendText(r){ const years=[2024,2025,2026],ks=years.map(y=>Number(r[`rank${y}`])),scores=years.map(y=>Number(r[`score${y}`])); if(ks.some(value=>!Number.isFinite(value)||value<=0)||scores.some(value=>!Number.isFinite(value)||value<=0)) return '同校、同专业、同项目三年数据不完整，不能判断趋势'; const rankDeltas=[ks[1]-ks[0],ks[2]-ks[1]],scoreDeltas=[scores[1]-scores[0],scores[2]-scores[1]],rankStable=rankDeltas.map((d,i)=>Math.abs(d)<=Math.max(500,ks[i]*.025)),scoreStable=scoreDeltas.map(d=>Math.abs(d)<=2); const rankTrend=rankStable.every(Boolean)?'位次基本稳定':rankDeltas.every(d=>d<0)?'位次逐年靠前':rankDeltas.every(d=>d>0)?'位次逐年靠后':'位次有波动',scoreTrend=scoreStable.every(Boolean)?'分数基本稳定':scoreDeltas.every(d=>d>0)?'分数整体上升':scoreDeltas.every(d=>d<0)?'分数整体下降':'分数有波动'; return `三年同口径趋势：${rankTrend}，${scoreTrend}`; }
function recordKey(r){ return text(r.id)||[r.school,r.major,r.majorCode2026,r.score2026,r.rank2026].join('|'); }
function renderRecord(r){ const key=recordKey(r), on=selectionPool.has(r), project=r.projectLabel||(r.isSino?'中外合作/高收费（需核验）':'普通项目'), canonicalCode=r.standardMajorCode||r.majorCode2026, school=String(r.school||'学校名称待核验').trim(), schoolHref=buildSchoolAllHref({school:r.school,majorKeyword:draftMajorText(),score:scoreValue()||''}); return `<article class="major-all-record" data-major-record-key="${esc(key)}" data-major-path-record data-workspace-record-key="${esc(key)}"><header class="major-all-record-head"><div><a class="major-all-school-link" href="${esc(schoolHref)}" aria-label="查看${esc(school)}的在辽专业"><h3>${esc(school)}</h3></a><p>${esc(r.displayLocation||'地域待核验')} · ${esc(r.major||'专业名称待核验')}</p></div><span class="major-all-project ${r.isSino?'is-sino':''}">${esc(project)}</span></header><div class="major-all-record-meta"><span>专业代码 ${esc(canonicalCode||'待核验')}</span><span>${esc(positionText(r))}</span><span>2026历史投档记录</span></div><div class="major-all-years" aria-label="三年同口径历史数据"><div><b>2026</b><span>${esc(yearText(r,2026))}</span></div><div><b>2025</b><span>${esc(yearText(r,2025))}</span></div><div><b>2024</b><span>${esc(yearText(r,2024))}</span></div></div><p class="major-all-trend"><b>趋势：</b>${esc(trendText(r))}。仅对当前学校、专业、项目记录做历史对照。</p><div class="major-all-record-actions"><button type="button" class="ui-button ui-button--compact ui-button--secondary" data-major-selection-action="${on?'remove':'add'}" data-major-record-key="${esc(key)}" aria-pressed="${on}">${on?'移出家庭方案':'加入家庭方案'}</button><button type="button" class="ui-button ui-button--compact ui-button--tertiary" data-major-school="${esc(r.school)}">看这所学校的在辽专业</button></div><p class="major-all-boundary">这是历史投档数据，不是录取承诺；学费、校区、合作办学条件以当年招生计划和院校章程为准。</p></article>`; }
function mergeRecords(a,b){ const m=new Map((a||[]).map(r=>[recordKey(r),r])); (b||[]).forEach(r=>m.set(recordKey(r),r)); return [...m.values()]; }
function syncSelectionButtons(){ byId('majorAllContent')?.querySelectorAll('[data-major-selection-action]').forEach(btn=>{const r=(view.data?.records||[]).find(x=>recordKey(x)===btn.dataset.majorRecordKey); if(!r)return; const on=selectionPool.has(r); btn.dataset.majorSelectionAction=on?'remove':'add'; btn.setAttribute('aria-pressed',String(on)); btn.textContent=on?'移出家庭方案':'加入家庭方案';}); }
function renderResults(){ const root=byId('majorAllContent'), panel=byId('majorAllResultsPanel'); if(!root||!panel)return; const active=state.resultMode===MODE; panel.hidden=!active; byId('resultsPanel')?.toggleAttribute('hidden',active); byId('schoolAllResultsPanel')?.toggleAttribute('hidden',active||state.resultMode!=='school-all'); renderCandidates(); if(!active)return; const names=selectedNames(); if(view.loading&&!view.data){root.innerHTML='<div class="ui-state ui-state--loading major-all-message"><b>正在读取专业招生历史…</b><p>先保留你已经输入的条件。</p></div>';return;} if(view.error&&!view.data){root.innerHTML=`<div class="ui-state ui-state--error major-all-message"><b>这次没有读取成功</b><p>${esc(view.error)}</p><button type="button" class="ui-button ui-button--compact ui-button--secondary" data-major-retry>重新读取</button></div>`;return;} if(!view.data){root.innerHTML=`<div class="ui-state ui-state--pending major-all-message"><b>${names.length?'确认后点击查看专业招生历史':'先输入一个或多个专业方向'}</b><p>${names.length?'可选填写分数、地区、学校关键词和普通/中外项目条件。':'例如：电气、机械/测控/材料；模糊输入必须先确认规范名称。'}</p></div>`;return;} const d=view.data,s=d.summary||{},records=Array.isArray(d.records)?d.records:[]; const hasCandidateScore=d.candidateScore!==null&&d.candidateScore!==undefined&&Number.isFinite(Number(d.candidateScore)); root.innerHTML=`<div class="major-all-summary"><b>${esc(names.join('、'))}</b><span>当前条件下 ${Number(s.schoolCount||0).toLocaleString('zh-CN')} 所学校 · ${Number(s.total||d.total||0).toLocaleString('zh-CN')} 条招生记录 · ${hasCandidateScore?`参考${Number(d.candidateScore)}分，按历史位次排序`:'未填写参考分数'} · ${d.projectMode==='sino-only'?'仅中外/高收费':d.projectMode==='ordinary-only'?'仅普通项目':'普通与中外分开显示'}</span><small>2026为主口径，2025/2024只在同一学校、专业和项目可以对应时展示。</small></div><div class="major-all-record-list">${records.map(renderRecord).join('')}</div>${d.nextOffset!=null?'<button type="button" class="ui-button ui-button--compact ui-button--secondary major-all-load-more" data-major-load-more>继续加载专业结果</button>':'<p class="major-all-complete">当前条件下的专业招生记录已全部加载完成。</p>'}`; syncSelectionButtons();document.dispatchEvent(new CustomEvent('gaokao:major-result-render')); }
function syncAction(){ if(state.resultMode!==MODE){ renderCandidates(); document.dispatchEvent(new CustomEvent('gaokao:major-input-state',{detail:inputState()})); return; } const btn=byId('queryButton'), guide=byId('queryGuide'),ready=queryReady(),names=selectedNames(),invalid=rawScorePresent()&&scoreValue()===null; if(!btn)return; btn.disabled=Boolean(view.loading||!ready||invalid); if(view.loading){btn.textContent='正在读取专业招生历史…';btn.className='query-button is-loading';if(guide)guide.textContent='正在按已确认的专业、地区和项目条件读取数据。';}else if(!draftMajorText()){btn.textContent='先输入专业方向';btn.className='query-button is-waiting';if(guide)guide.textContent='先输入一个专业或方向；确认后可以继续添加。';}else if(!ready){btn.textContent='先确认具体本科专业';btn.className='query-button is-waiting';if(guide)guide.textContent='模糊输入会先出现候选，确认后才查询，专业类不会静默替换。';}else if(invalid){btn.textContent='分数需为150—750';btn.className='query-button is-waiting';if(guide)guide.textContent='分数可不填；填写时请输入150—750之间的整数。';}else if(view.error){btn.textContent='重新读取专业历史';btn.className='query-button is-error';if(guide)guide.textContent='读取异常，可以检查网络或稍后重试。';}else if(view.data&&view.dirty){btn.textContent='按新条件更新专业历史';btn.className='query-button is-ready';if(guide)guide.textContent='条件已变化，下面保留上一轮结果，确认后再更新。';}else{btn.textContent=`查询 ${names.length} 个已确认专业`;btn.className='query-button is-ready';if(guide)guide.textContent='可以继续添加专业；点击后一次查询全部已确认专业。';}}
function syncMode(){const active=state.resultMode===MODE,inputActive=INPUT_MODES.has(state.resultMode);restoreConfirmedFromUrl();byId('majorCandidatePanel')?.toggleAttribute('hidden',!inputActive);byId('majorAllResultsPanel')?.toggleAttribute('hidden',!active);byId('resultsPanel')?.toggleAttribute('hidden',active);byId('schoolAllResultsPanel')?.toggleAttribute('hidden',active||state.resultMode!=='school-all');byId('majorProjectMode')?.closest('.major-all-project-filter')?.toggleAttribute('hidden',!active);if(active){const params=new URLSearchParams(location.search),savedRegion=params.get('region'),savedProject=params.get('projectMode');if(savedRegion&&byId('region')){byId('region').value=savedRegion;state.filters.region=savedRegion;}if(savedProject&&byId('majorProjectMode'))byId('majorProjectMode').value=savedProject;setQueryUrl();document.dispatchEvent(new CustomEvent('gaokao:major-filter-restored'));}renderCandidates();if(active)renderResults();else document.dispatchEvent(new CustomEvent('gaokao:major-input-state',{detail:inputState()}));}
async function load(append=false){if(state.resultMode!==MODE||!queryReady()){syncAction();return;}if(rawScorePresent()&&scoreValue()===null){syncAction();return;}const names=selectedNames(),majorScope=[...confirmedDirectionScopes.values()].includes('admission-groups')?'admission-groups':'core',queryInputs=[...new Set([...names,...lockedConfirmed.filter(term=>confirmedDirectionScopes.get(term)==='admission-groups')])],id=++view.requestId,offset=append?Number(view.data?.nextOffset||0):0;view.loading=true;view.error='';view.dirty=false;renderResults();syncAction();try{const p=new URLSearchParams();queryInputs.forEach(n=>p.append('major',n));p.set('region',regionValue());p.set('schoolKeyword',schoolValue());p.set('majorScope',majorScope);p.set('projectMode',projectMode());p.set('bottomLineMode',state.filters.bottomLineMode||'all');p.set('sort',scoreValue()?'position-near':'score-desc');if(scoreValue()!==null)p.set('candidateScore',String(scoreValue()));p.set('offset',String(offset));p.set('limit',String(PAGE_SIZE));const response=await fetch(`${API_PATH}?${p.toString()}`,{headers:{accept:'application/json'}}),payload=await response.json();if(!response.ok||payload?.ok===false)throw new Error(payload?.message||'专业历史读取失败。');if(id!==view.requestId)return;view.data=append&&view.data?{...payload,records:mergeRecords(view.data.records,payload.records),nextOffset:payload.nextOffset}:payload;view.dirty=false;}catch(e){if(id!==view.requestId)return;view.error=e?.message||'专业历史读取失败。';}finally{if(id!==view.requestId)return;view.loading=false;renderResults();syncAction();refreshSelectionPool(state);}}
function markDirty(){state.filters.majorKeyword=draftMajorText();view.dirty=Boolean(view.data);renderCandidates();renderResults();syncAction();setQueryUrl();}
function bind(){byId('majorKeyword')?.addEventListener('input',()=>markDirty());byId('majorKeyword')?.addEventListener('focus',()=>{if(lockedConfirmed.length)byId('majorKeyword').placeholder=ADD_MAJOR_PLACEHOLDER;});byId('majorProjectMode')?.addEventListener('change',markDirty);byId('region')?.addEventListener('change',markDirty);byId('schoolKeyword')?.addEventListener('input',markDirty);byId('majorCandidatePanel')?.addEventListener('click',e=>{const field=byId('majorKeyword');const direction=e.target.closest('[data-major-direction-scope]');if(direction){const term=direction.dataset.majorDirectionTerm,scope=direction.dataset.majorDirectionScope||'core',remaining=uniqueTerms([inputValue()]).filter(item=>item!==term).join('/');if(!lockedConfirmed.includes(term))lockedConfirmed.push(term);confirmedDirectionTerms.add(term);confirmedDirectionScopes.set(term,scope);field.value=remaining;state.filters.majorKeyword=draftMajorText();field.placeholder=ADD_MAJOR_PLACEHOLDER;markDirty();field.focus();return;}if(e.target.closest('[data-major-add-another]')){lockedConfirmed=selectedItems().map(item=>item.intentLevel==='direction'?item.input:item.name);field.value='';state.filters.majorKeyword='';field.placeholder=ADD_MAJOR_PLACEHOLDER;markDirty();field.focus();return;}const remove=e.target.closest('[data-major-remove-term]');if(remove){const term=remove.dataset.majorRemoveTerm;lockedConfirmed=lockedConfirmed.filter(x=>x!==term);confirmedDirectionTerms.delete(term);confirmedDirectionScopes.delete(term);const next=uniqueTerms([inputValue()]).filter(x=>x!==term).join('/');field.value=next;if(!lockedConfirmed.length&& !next)field.placeholder=DEFAULT_MAJOR_PLACEHOLDER;state.filters.majorKeyword=next;markDirty();field.focus();return;}if(e.target.closest('[data-major-clear]')){lockedConfirmed=[];confirmedDirectionTerms.clear();confirmedDirectionScopes.clear();field.value='';state.filters.majorKeyword='';field.placeholder=DEFAULT_MAJOR_PLACEHOLDER;markDirty();field.focus();return;}const b=e.target.closest('[data-major-candidate-name]');if(!b)return;const term=b.dataset.majorCandidateInput,raw=inputValue(),parts=raw.split(/[,，、/；;|]+/).map(x=>x.trim()).filter(Boolean),replacement=b.dataset.majorCandidateName;let next=parts.map(x=>x===term?replacement:x).join('/');if(next===raw&&raw.includes(term)){const index=raw.indexOf(term);next=raw.slice(0,index)+replacement+raw.slice(index+term.length);}field.value=next;state.filters.majorKeyword=next;markDirty();field.focus();});byId('majorAllContent')?.addEventListener('click',e=>{const a=e.target.closest('[data-major-selection-action]');if(a){const r=(view.data?.records||[]).find(x=>recordKey(x)===a.dataset.majorRecordKey);if(!r)return;const out=a.dataset.majorSelectionAction==='remove'?selectionPool.remove(recordKey(r)):selectionPool.add(r);if(out?.changed!==false)refreshSelectionPool(state);syncSelectionButtons();return;}const school=e.target.closest('[data-major-school]');if(school){document.dispatchEvent(new CustomEvent('gaokao:view-school-all',{detail:{school:school.dataset.majorSchool}}));return;}if(e.target.closest('[data-major-load-more]'))load(true);if(e.target.closest('[data-major-retry]'))load(false);});document.addEventListener('gaokao:result-mode-change',syncMode);document.addEventListener('gaokao:major-action-sync',syncAction);document.addEventListener('gaokao:major-search-submit',()=>load(false));document.addEventListener('gaokao:workspace-state',e=>{if(e.detail?.mode===MODE){renderResults();syncAction();}});window.addEventListener('popstate',syncMode);}
export function mountMajorAllMode(){if(mounted)return globalThis.__GAOKAO_MAJOR_ALL_MODE__;mounted=true;bind();syncMode();const api=Object.freeze({version:MAJOR_ALL_MODE_VERSION,inputVersion:'major-filter-context-v004',submit:()=>load(false),isBlocking:()=>majorInputBlocking(),getInputState:()=>inputState(),getState:()=>({...view,input:inputState()})});globalThis.__GAOKAO_MAJOR_ALL_MODE__=api;return api;}
export const majorAllModeReady=Promise.resolve(mountMajorAllMode());
