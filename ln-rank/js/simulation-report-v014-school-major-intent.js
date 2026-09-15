import { MAJOR_CATALOG_2026 } from '../kb/major-understanding/major-catalog-2026.generated.js';
import { createMajorCatalogResolver, normalizeMajorCode } from '../../shared/resources/majors/major-catalog-contract.js';
import { loadSchoolNameResolver } from '../../tongxue/data/school-name-resolver-v150.js';

const STORAGE_KEY = 'gaokao:simulation-report:v002';
const majorResolver = createMajorCatalogResolver(MAJOR_CATALOG_2026);
const schoolResolverPromise = loadSchoolNameResolver();
const requestTokens = new Map();
const broadTerms = new Set(['机','机械','网络','计算机','电气','自动化','软件','电子','通信','信息','土木','建筑','材料','能源','生物','化学','数学','物理']);

function norm(value) { return String(value || '').normalize('NFKC').trim(); }
function lower(value) { return norm(value).toLowerCase(); }
function rowById(id) { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')?.volunteers?.find(r => String(r.id) === String(id)) || null; } catch { return null; } }
function patchRow(id, patch) { try { const state = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); if (!state?.volunteers) return null; const i = state.volunteers.findIndex(r => String(r.id) === String(id)); if (i < 0) return null; state.volunteers[i] = { ...state.volunteers[i], ...patch }; localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); return state.volunteers[i]; } catch { return null; } }
function patchCheck(id, patch) { const row = rowById(id); return patchRow(id, { manualCheck: { ...(row?.manualCheck || {}), ...patch } }); }
function esc(value) { return String(value ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c])); }
function card(id) { return document.querySelector(`.volunteer-card[data-card-id="${CSS.escape(String(id))}"]`); }
function field(id, name) { return card(id)?.querySelector(`[data-field="${name}"]`) || null; }
function mount(id, kind) { const el = field(id, kind === 'major' ? 'majorCode' : 'school'); if (!el) return null; const cls = kind === 'major' ? 'major-input-suggestions' : 'school-input-suggestions-v014'; let box = el.parentElement?.querySelector(`[data-v014-${kind}-suggestions]`); if (!box) { box = document.createElement('div'); box.className = cls; box.dataset[`v014${kind === 'major' ? 'Major' : 'School'}Suggestions`] = String(id); el.insertAdjacentElement('afterend', box); } return box; }
function helper(id, text, tone='neutral') { const c = card(id); if (!c) return; let h = c.querySelector('[data-v014-helper]'); if (!h) { h = document.createElement('div'); h.className = 'major-input-helper v014-helper'; h.dataset.v014Helper = String(id); (field(id,'majorCode')?.parentElement || c).appendChild(h); } h.textContent = text; h.dataset.tone = tone; }
function hide(box) { if (!box) return; box.innerHTML = ''; box.hidden = true; }
function isBroad(query) { const q = lower(query); return broadTerms.has(q) || (q.length <= 4 && !/^\d{6}$/.test(q)); }

async function resolveSchool(raw) {
  const resolver = await schoolResolverPromise;
  return resolver.resolve(norm(raw), { limit: 6 });
}
function renderSchoolChoices(id, result) {
  const box = mount(id,'school'); if (!box) return;
  const candidates = result?.status === 'resolved' ? [{ officialName: result.officialName, score: result.confidence || 1 }] : (result?.candidates || []).slice(0,6);
  if (!candidates.length) { hide(box); return; }
  box.innerHTML = `<div class="major-suggestion-label">${result?.status === 'resolved' ? '已识别学校' : '请确认学校'}</div>${candidates.map(item => `<button type="button" class="major-suggestion" data-v014-school-choice="${esc(item.officialName)}"><strong>${esc(item.officialName)}</strong><span>${result?.status === 'resolved' ? '已识别' : '候选学校'}</span></button>`).join('')}`;
  box.hidden = false;
}

function renderMajorChoices(id, items, label='请从该校实际相关专业中选择') {
  const box = mount(id,'major'); if (!box) return;
  const unique = [], seen = new Set();
  for (const item of items || []) { const code = String(item.code || item.majorCode2026 || '').trim(); const name = String(item.name || item.standardMajorName || item.major || '').trim(); if (!name || seen.has(name)) continue; seen.add(name); unique.push({ code, name }); }
  if (!unique.length) { hide(box); return; }
  box.innerHTML = `<div class="major-suggestion-label">${esc(label)}</div>${unique.slice(0,8).map(item => `<button type="button" class="major-suggestion" data-v014-major-code="${esc(item.code)}"><strong>${esc(item.name)}</strong><span>${esc(item.code || '学校记录')}</span></button>`).join('')}`;
  box.hidden = false;
}
function applyMajor(id, item, reason='confirmed') {
  if (!item?.code || !item?.name) return;
  const row = rowById(id); patchRow(id, { majorCode: item.code, majorName: item.name, history: null, manualCheck: { ...(row?.manualCheck || {}), majorMatch: 'checking', majorMatchMessage: '' } });
  const input = field(id,'majorCode'); if (input) input.value = item.code;
  hide(mount(id,'major')); helper(id, `已选择：${item.name} · ${item.code}${reason === 'typo' ? '（由相近输入提示，需你确认）' : ''}`,'ok');
  verifySchoolMajor(id, item);
}
async function schoolCanonicalFor(id) {
  const schoolInput = field(id,'school'); const raw = norm(schoolInput?.value); if (!raw) return '';
  const result = await resolveSchool(raw);
  if (result?.status === 'resolved') return result.officialName;
  return '';
}
async function fetchSchoolMajorRecords(school, major) {
  const url = `/api/ai/major-history?major=${encodeURIComponent(major)}&schoolKeyword=${encodeURIComponent(school)}&limit=50&offset=0`;
  const response = await fetch(url,{headers:{accept:'application/json'}});
  if (!response.ok) { const message = await response.text().catch(()=>''); throw new Error(message || `HTTP ${response.status}`); }
  const data = await response.json(); return Array.isArray(data?.records) ? data.records : [];
}
function recordCandidate(record) { return { code: String(record.majorCode2026 || record.standardMajorCode || '').trim(), name: String(record.standardMajorName || record.major || '').trim(), school: String(record.school || '').trim(), record }; }
function exactRecord(records, school, item) { const s = lower(school), code = String(item.code || '').trim(), name = lower(item.name); return records.find(r => lower(r.school) === s && code && String(r.majorCode2026 || r.standardMajorCode || '').trim() === code) || records.find(r => lower(r.school) === s && lower(r.standardMajorName || r.major) === name) || null; }
function historyFromRecord(record) { const make = y => ({ score: record?.[`score${y}`] ?? null, rank: record?.[`rank${y}`] ?? null, comparable: true, recordStatus: 'primary-record' }); return { years: {2026: make(2026), 2025: make(2025), 2024: make(2024)} }; }
async function verifySchoolMajor(id, item) {
  const school = await schoolCanonicalFor(id); if (!school) { patchCheck(id,{majorMatch:'needs-choice',majorMatchMessage:'请先确认一个具体学校，系统才能严格核对这个专业。'}); paint(id); return; }
  const token = `${id}:${Date.now()}`; requestTokens.set(id,token); patchCheck(id,{majorMatch:'checking',majorMatchMessage:''}); paint(id);
  try {
    const records = await fetchSchoolMajorRecords(school,item.name); if (requestTokens.get(id)!==token) return;
    const exact = exactRecord(records,school,item);
    if (!exact) { patchRow(id,{history:null,manualCheck:{...(rowById(id)?.manualCheck||{}),majorMatch:'mismatch',majorMatchMessage:`⚠ ${school} 暂未找到“${item.name}”的实际招生记录，请核对学校、专业或年度口径。`}}); paint(id); return; }
    patchRow(id,{history:historyFromRecord(exact),manualCheck:{...(rowById(id)?.manualCheck||{}),majorMatch:'matched',majorMatchMessage:''}}); paint(id);
  } catch { if (requestTokens.get(id)!==token) return; patchCheck(id,{majorMatch:'needs-check',majorMatchMessage:'暂时无法在线核对学校专业；输入仍会保留，不会据此判断“有/没有”。'}); paint(id); }
}
function paint(id) { const c=card(id), row=rowById(id); if(!c||!row) return; const line=c.querySelector('.state-line'), span=line?.querySelector('span:nth-of-type(2)'); if(!line||!span)return; const m=row.manualCheck?.majorMatch; line.classList.remove('complete','needs-check','checking','incomplete'); if(m==='matched'){line.classList.add('complete');span.textContent='✓ 已找到该校实际招生记录';} else if(m==='checking'){line.classList.add('checking');span.textContent='正在核对学校与专业的实际记录…';} else if(m==='mismatch'){line.classList.add('needs-check');span.textContent=row.manualCheck.majorMatchMessage;} else if(m==='needs-choice'||m==='needs-check'){line.classList.add('needs-check');span.textContent=row.manualCheck.majorMatchMessage;}}

async function onSchoolInput(event) {
  const input=event.target.closest('[data-field="school"]'); if(!input)return; const id=input.dataset.id || input.dataset.rowId; const raw=norm(input.value); const box=mount(id,'school');
  if(!raw){hide(box);helper(id,'先填写学校名称，再按该校实际专业筛选。','neutral');return;}
  try { const result=await resolveSchool(raw); if(norm(input.value)!==raw)return; renderSchoolChoices(id,result); if(result?.status==='resolved'){ patchRow(id,{school:result.officialName}); helper(id,`已识别学校：${result.officialName}；后面的专业只会用该校实际记录来筛选。`,'ok'); const row=rowById(id); if(row?.majorName){ verifySchoolMajor(id, majorResolver.findByCode(row.majorCode) || majorResolver.findByName(row.majorName)); } } else helper(id,'请先确认学校；没有确认学校时，不会凭全国专业目录替你编造对应关系。','neutral'); } catch { helper(id,'学校名称解析暂时不可用，请填写完整校名。','warn'); }
}
function onMajorInput(event) {
  const input=event.target.closest('[data-field="majorCode"]'); if(!input)return; const id=input.dataset.id || input.dataset.rowId; const raw=norm(input.value); const box=mount(id,'major'); const row=rowById(id);
  patchRow(id,{majorCode:raw,majorName:'',history:null,manualCheck:{...(row?.manualCheck||{}),majorMatch:raw?'checking':'',majorMatchMessage:''}});
  if(!raw){hide(box);helper(id,'支持专业名称或代码；专业与学校会一起核对。','neutral');return;}
  const direct=majorResolver.findByCode(normalizeMajorCode(raw)) || majorResolver.findByName(raw);
  if(direct){ applyMajor(id,direct,'confirmed'); return; }
  if(isBroad(raw)){
    const schoolPromise=schoolCanonicalFor(id);
    schoolPromise.then(async school=>{
      if(!school){ const candidates=majorResolver.search(raw,{limit:8}).map(x=>x.item); renderMajorChoices(id,candidates,'先确认学校，或从相近专业中选择；当前不自动替你决定'); helper(id,'这个输入范围较宽，必须结合具体学校来筛选，系统不会自动映射成某一个专业。','neutral'); return; }
      try { const token=`${id}:${raw}`; requestTokens.set(`candidate:${id}`,token); const records=await fetchSchoolMajorRecords(school,raw); if(requestTokens.get(`candidate:${id}`)!==token||norm(input.value)!==raw)return; const candidates=records.map(recordCandidate).filter(x=>x.name); renderMajorChoices(id,candidates,`${school} · 找到这些实际相关招生记录`); helper(id,candidates.length?`已按“${school}”的实际招生记录筛选，请你选择具体专业。`:`${school} 暂未找到与“${raw}”对应的实际招生记录，请再换一个说法。`,candidates.length?'neutral':'warn'); }
      catch { const candidates=majorResolver.search(raw,{limit:6}).map(x=>x.item); renderMajorChoices(id,candidates,'在线学校记录暂时不可用，仅作专业名称候选，不代表该校有这些专业'); helper(id,'学校实际记录暂时查不到；下面候选只是目录名称，不能当作该校招生事实。','warn'); }
    });
    return;
  }
  const candidates=majorResolver.search(raw,{limit:6}).map(x=>x.item); if(candidates.length){ const best=candidates[0]; renderMajorChoices(id,candidates, best && best.score >= 0.78 ? `可能是“${best.name}”，请点击确认` : '找到相近专业，请选择一个具体专业'); helper(id,'模糊输入只用于提出候选，不会自动把你的输入改成另一个专业。','neutral'); } else { hide(box); helper(id,'没有安全匹配到具体专业，请再多写几个字或输入专业代码。','warn'); }
}
function onClick(event){ const major=event.target.closest('[data-v014-major-code]'); if(major){ const c=event.target.closest('.volunteer-card'),id=c?.dataset.cardId,item=majorResolver.findByCode(major.dataset.v014MajorCode); if(c&&item)applyMajor(id,item, 'typo'); event.preventDefault(); return; } const school=event.target.closest('[data-v014-school-choice]'); if(school){ const c=event.target.closest('.volunteer-card'),id=c?.dataset.cardId,input=field(id,'school'),name=school.dataset.v014SchoolChoice; if(input&&name){input.value=name;patchRow(id,{school:name});hide(mount(id,'school'));helper(id,`已确认学校：${name}；后续专业将只按该校实际记录核对。`,'ok'); const row=rowById(id); if(row?.majorName){const item=majorResolver.findByCode(row.majorCode)||majorResolver.findByName(row.majorName);if(item)verifySchoolMajor(id,item);} } event.preventDefault();}}
function bind(){ document.addEventListener('input',onSchoolInput); document.addEventListener('input',onMajorInput); document.addEventListener('click',onClick); document.querySelectorAll('.volunteer-card[data-card-id]').forEach(c=>{const id=c.dataset.cardId;mount(id,'major');mount(id,'school');paint(id);}); }
new MutationObserver(()=>requestAnimationFrame(()=>document.querySelectorAll('.volunteer-card[data-card-id]').forEach(c=>{mount(c.dataset.cardId,'major');mount(c.dataset.cardId,'school');paint(c.dataset.cardId);}))).observe(document.querySelector('#wbRows')||document.body,{childList:true,subtree:true});
bind();