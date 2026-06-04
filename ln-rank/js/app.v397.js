import { state } from './state/app-state.js';
import { debounce } from './core/debounce.js';
import { toInt } from './core/number-utils.js';
import { REGION_OPTIONS } from './config/region-options.js';
import { fetchMajorBands } from './feature/major-pool/major-bands-api.v397.js';
import { renderBandTabs } from './feature/score-bands/score-bands-render.v397.js';
import { renderMajorResults } from './feature/major-pool/major-pool-render.js';

function resetVisible(){ state.visible = { upper: 16, near: 16, steady: 16 }; }
function hasValidScore(){ return Number.isFinite(Number(state.candidateScore)) && Number(state.candidateScore) > 0; }

function renderRegionOptions(){
  const select = document.getElementById('region');
  select.innerHTML = REGION_OPTIONS.map(o => `<option value="${o.key}">${o.label}</option>`).join('');
  select.value = state.filters.region;
}

function renderAll(){
  renderBandTabs(state, (band) => { state.activeBand = band; renderAll(); });
  renderMajorResults(state, { onMore: (band) => { state.visible[band] = (state.visible[band] || 16) + 16; renderAll(); } });
}

async function loadData(){
  if (!hasValidScore()) {
    state.bands.loading = false;
    state.bands.error = null;
    state.bands.data = null;
    state.bands.message = '请输入考生分数后查看专业列表。';
    renderAll();
    return;
  }

  state.bands.loading = true; state.bands.error = null; state.bands.message = '';
  renderAll();
  try {
    state.bands.data = await fetchMajorBands({ candidateScore: state.candidateScore, rangePreset: state.rangePreset, filters: state.filters });
  }
  catch(e){ state.bands.error = e.message || String(e); state.bands.data = null; }
  finally { state.bands.loading = false; renderAll(); }
}

const debouncedLoad = debounce(loadData, 300);

function bind(){
  const input = document.getElementById('candidateScore');
  input.value = '';
  input.addEventListener('input', (e)=>{
    const raw = e.target.value.trim();
    state.candidateScore = raw ? toInt(raw, null) : null;
    resetVisible();
    if (hasValidScore()) debouncedLoad(); else loadData();
    renderAll();
  });

  document.getElementById('rangeButtons').addEventListener('click', (e)=>{
    const btn=e.target.closest('[data-preset]'); if(!btn) return;
    state.rangePreset=btn.dataset.preset; resetVisible();
    document.querySelectorAll('[data-preset]').forEach(el=>el.classList.toggle('is-active',el===btn));
    loadData();
  });
  document.getElementById('region').addEventListener('change', (e)=>{ state.filters.region=e.target.value; resetVisible(); loadData(); });
  document.getElementById('schoolKeyword').addEventListener('input', (e)=>{ state.filters.schoolKeyword=e.target.value; resetVisible(); debouncedLoad(); });
  document.getElementById('majorKeyword').addEventListener('input', (e)=>{ state.filters.majorKeyword=e.target.value; resetVisible(); debouncedLoad(); });
  document.getElementById('reloadButton').addEventListener('click', loadData);
}

renderRegionOptions();
bind();
renderAll();
loadData();
