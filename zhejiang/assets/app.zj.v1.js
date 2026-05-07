(() => {
  const DATA_BASE = './data/';
  const state = {
    manifest: null,
    auditSummary: null,
    cache: new Map(),
    locator: null,
    schoolsIndex: null,
    majorsIndex: null,
    compareExact: null,
    rawFileCache: new Map(),
  };

  const $ = (id) => document.getElementById(id);
  const norm = (s) => String(s || '')
    .trim()
    .replace(/[（]/g, '(')
    .replace(/[）]/g, ')')
    .replace(/\s+/g, '')
    .toLowerCase();

  function setStatus(text, type = '') {
    const el = $('statusText');
    el.textContent = text;
    el.className = type;
  }

  async function fetchJson(path) {
    const url = path.startsWith('./') ? path : DATA_BASE + path;
    if (state.cache.has(url)) return state.cache.get(url);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`读取失败：${url}`);
    const data = await res.json();
    state.cache.set(url, data);
    return data;
  }

  async function init() {
    state.manifest = await fetchJson('manifest.json');
    state.auditSummary = await fetchJson('audit/audit_summary.json');
    renderAudit();
    bindEvents();
    setStatus('准备就绪。可以输入学校、专业或分数查询。');
  }

  function renderAudit() {
    const c = state.manifest.record_counts;
    $('auditText').innerHTML = `2024 全量 <b>${c['2024_total']}</b> 条，普通类 <b>${c['2024_normal_batch']}</b> 条；<br>2025 全量 <b>${c['2025_total']}</b> 条，普通类 <b>${c['2025_normal_batch']}</b> 条。`;
  }

  function bindEvents() {
    $('searchBtn').addEventListener('click', runSearch);
    $('demoBtn').addEventListener('click', () => {
      $('schoolInput').value = '辽宁科技大学';
      $('majorInput').value = '通信工程';
      $('scoreInput').value = '';
      $('rankInput').value = '';
      $('yearSelect').value = 'both';
      $('scoreModeSelect').value = 'analysis';
      $('provinceInput').value = '';
      $('normalOnly').checked = true;
      runSearch();
    });
    $('resetBtn').addEventListener('click', () => {
      ['schoolInput','majorInput','scoreInput','rankInput','provinceInput'].forEach(id => $(id).value = '');
      $('yearSelect').value = 'both';
      $('scoreModeSelect').value = 'analysis';
      $('normalOnly').checked = true;
      renderResults([]);
      renderCompare([]);
      setStatus('已重置。');
    });
  }

  async function ensureIndexes() {
    const tasks = [];
    if (!state.locator) tasks.push(fetchJson('index/record_locator.json').then(d => state.locator = d));
    if (!state.schoolsIndex) tasks.push(fetchJson('index/schools_index.json').then(d => state.schoolsIndex = d));
    if (!state.majorsIndex) tasks.push(fetchJson('index/majors_index.json').then(d => state.majorsIndex = d));
    await Promise.all(tasks);
  }

  async function getRecordsByIds(ids, limit = 800) {
    if (!ids || !ids.length) return [];
    if (!state.locator) state.locator = await fetchJson('index/record_locator.json');
    const clipped = ids.slice(0, limit);
    const byFile = new Map();
    for (const id of clipped) {
      const loc = state.locator[id];
      if (!loc) continue;
      if (!byFile.has(loc.raw_file)) byFile.set(loc.raw_file, []);
      byFile.get(loc.raw_file).push(id);
    }
    const out = [];
    for (const [file, wantIds] of byFile.entries()) {
      let data = state.rawFileCache.get(file);
      if (!data) {
        data = await fetchJson(file);
        state.rawFileCache.set(file, data);
      }
      const want = new Set(wantIds);
      for (const row of data) if (want.has(row.record_id)) out.push(row);
    }
    return out;
  }

  function idsFromIndexItem(item, yearValue) {
    const years = yearValue === 'both' ? ['2024', '2025'] : [yearValue];
    const ids = [];
    for (const y of years) {
      const part = item.years && item.years[y];
      if (part && part.record_ids) ids.push(...part.record_ids);
    }
    return ids;
  }

  function findSchoolItems(input) {
    const n = norm(input);
    if (!n) return [];
    const exact = state.schoolsIndex.filter(x => norm(x.school_name) === n || norm(x.school_name_norm) === n);
    if (exact.length) return exact;
    return state.schoolsIndex.filter(x => norm(x.school_name).includes(n) || norm(x.school_name_norm).includes(n)).slice(0, 30);
  }

  function findMajorItems(input) {
    const n = norm(input);
    if (!n) return [];
    const exact = state.majorsIndex.filter(x => norm(x.major_name_norm) === n || (x.major_name_samples || []).some(s => norm(s) === n));
    if (exact.length) return exact;
    return state.majorsIndex.filter(x => norm(x.major_name_norm).includes(n) || (x.major_name_samples || []).some(s => norm(s).includes(n))).slice(0, 80);
  }

  async function searchByName({school, major, year}) {
    await ensureIndexes();
    const schoolItems = school ? findSchoolItems(school) : [];
    const majorItems = major ? findMajorItems(major) : [];
    let ids = [];
    if (school && major) {
      const schoolIds = new Set(schoolItems.flatMap(x => idsFromIndexItem(x, year)));
      const majorIds = new Set(majorItems.flatMap(x => idsFromIndexItem(x, year)));
      ids = [...schoolIds].filter(id => majorIds.has(id));
    } else if (school) {
      ids = schoolItems.flatMap(x => idsFromIndexItem(x, year));
    } else if (major) {
      ids = majorItems.flatMap(x => idsFromIndexItem(x, year));
    }
    return getRecordsByIds([...new Set(ids)], 1000);
  }

  function rangeKeyForScore(score) {
    if (score == null || Number.isNaN(score)) return 'missing';
    if (score >= 700) return '700_plus';
    if (score >= 650) return '650_699';
    if (score >= 600) return '600_649';
    if (score >= 550) return '550_599';
    if (score >= 500) return '500_549';
    if (score >= 450) return '450_499';
    if (score >= 400) return '400_449';
    return 'under_400';
  }

  function shardList(year, mode) {
    const key = String(year);
    if (key === '2024') return state.manifest.score_shards['2024'].analysis;
    if (mode === 'final') return state.manifest.score_shards['2025'].final;
    if (mode === 'first_stage') return state.manifest.score_shards['2025'].first_stage;
    return state.manifest.score_shards['2025'].analysis;
  }

  async function searchByScore(score, yearValue, mode) {
    const years = yearValue === 'both' ? [2024, 2025] : [Number(yearValue)];
    const range = rangeKeyForScore(score);
    const out = [];
    for (const y of years) {
      const shards = shardList(y, mode);
      const item = shards.find(x => x.range === range);
      if (!item || item.count === 0) continue;
      const rows = await fetchJson(item.file);
      out.push(...rows.filter(r => Math.abs(getDisplayScore(r, mode) - score) <= 5));
    }
    return out.slice(0, 1200);
  }

  function getDisplayScore(row, mode = 'analysis') {
    if (!row || !row.score) return null;
    if (row.year === 2025) {
      if (mode === 'final') return row.score.final_score ?? row.score.min_score ?? row.score.analysis_score;
      if (mode === 'first_stage') return row.score.first_stage_min_score ?? row.score.analysis_score ?? row.score.min_score;
    }
    return row.score.analysis_score ?? row.score.min_score ?? row.score.first_stage_min_score;
  }

  async function runSearch() {
    try {
      const school = $('schoolInput').value.trim();
      const major = $('majorInput').value.trim();
      const scoreRaw = $('scoreInput').value.trim();
      const rankRaw = $('rankInput').value.trim();
      const year = $('yearSelect').value;
      const mode = $('scoreModeSelect').value;
      const province = $('provinceInput').value.trim();
      const normalOnly = $('normalOnly').checked;
      setStatus('正在查询...');
      let records = [];
      if (school || major) records = await searchByName({school, major, year});
      else if (scoreRaw) records = await searchByScore(Number(scoreRaw), year, mode);
      else {
        setStatus('请输入学校、专业或分数。');
        return;
      }
      if (province) records = records.filter(r => norm(r.school_province).includes(norm(province)));
      if (normalOnly) records = records.filter(r => r.batch_name === '普通类平行投档');
      if (rankRaw) {
        const targetRank = Number(rankRaw);
        records = records.filter(r => r.rank != null && Math.abs(Number(r.rank) - targetRank) <= 5000);
      }
      records.sort((a,b) => (a.year - b.year) || ((getDisplayScore(b, mode)||0) - (getDisplayScore(a, mode)||0)) || ((a.rank || 9999999) - (b.rank || 9999999)));
      renderResults(records.slice(0, 500), mode);
      await renderCompareForRecords(records.slice(0, 100));
      setStatus(`查询完成：命中 ${records.length} 条，当前显示 ${Math.min(records.length, 500)} 条。`);
    } catch (err) {
      console.error(err);
      setStatus(err.message + '。如果你是直接双击 HTML，请改用 python -m http.server 打开。', 'error');
    }
  }

  function levelTags(r) {
    return [
      ['985', r.is_985],
      ['211', r.is_211],
      ['双一流', r.is_double_first_class]
    ].map(([name,val]) => `<span class="tag ${val ? 'yes' : 'no'}">${name}${val ? '' : '否'}</span>`).join('');
  }

  function scoreCell(r, mode) {
    const s = getDisplayScore(r, mode);
    if (r.year === 2025) {
      const note = mode === 'final'
        ? `最终最低分；一段 ${r.score.first_stage_min_score ?? '—'}`
        : `一段优先；最终 ${r.score.final_score ?? r.score.min_score ?? '—'}`;
      return `${s ?? '—'}<div class="score-note">${note}</div>`;
    }
    return `${s ?? '—'}<div class="score-note">最低分；平均 ${r.score.avg_score ?? '—'}</div>`;
  }

  function renderResults(records, mode = 'analysis') {
    const body = $('resultBody');
    $('resultCount').textContent = `${records.length} 条`;
    if (!records.length) {
      body.innerHTML = '<tr><td colspan="10" class="empty">没有找到记录。</td></tr>';
      return;
    }
    body.innerHTML = records.map(r => `
      <tr>
        <td>${r.year}</td>
        <td>${escapeHtml(r.school_name)}</td>
        <td>${escapeHtml(r.school_code)}</td>
        <td>${escapeHtml(r.major_name)}</td>
        <td>源数据未提供</td>
        <td>${scoreCell(r, mode)}</td>
        <td>${r.rank ?? '—'}</td>
        <td>${escapeHtml(r.school_province || '')}</td>
        <td>${escapeHtml(r.batch_name || '')}</td>
        <td>${levelTags(r)}</td>
      </tr>`).join('');
  }

  async function renderCompareForRecords(records) {
    const keys = [...new Set(records.map(r => r.compare_key_exact).filter(Boolean))];
    if (!keys.length) return renderCompare([]);
    if (!state.compareExact) state.compareExact = await fetchJson('compare/compare_exact_normal.json');
    const keySet = new Set(keys);
    const hits = state.compareExact.filter(x => keySet.has(x.match_key)).slice(0, 20);
    renderCompare(hits);
  }

  function changeClass(x) {
    if (x === '变难') return 'change-hard';
    if (x === '变容易') return 'change-easy';
    return 'change-stable';
  }

  function renderCompare(items) {
    const panel = $('comparePanel');
    const box = $('compareCards');
    $('compareCount').textContent = `${items.length} 条`;
    if (!items.length) {
      panel.hidden = true;
      box.innerHTML = '';
      return;
    }
    panel.hidden = false;
    box.innerHTML = items.map(x => `
      <article class="compare-card">
        <h3>${escapeHtml(x.school_name)} · ${escapeHtml(x.major_name_2025)}</h3>
        <div class="compare-metrics">
          <div class="metric"><span>2024 分</span><b>${x.score_2024 ?? '—'}</b></div>
          <div class="metric"><span>2024 位次</span><b>${x.rank_2024 ?? '—'}</b></div>
          <div class="metric"><span>2025 分</span><b>${x.score_2025 ?? '—'}</b></div>
          <div class="metric"><span>2025 位次</span><b>${x.rank_2025 ?? '—'}</b></div>
        </div>
        <p class="${changeClass(x.difficulty_change)}"><b>${x.difficulty_change}</b>：位次变化 ${x.rank_change ?? '—'}，分数变化 ${x.score_change ?? '—'}。</p>
      </article>`).join('');
  }

  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  }

  init().catch(err => {
    console.error(err);
    setStatus(err.message + '。请确认 data/ 目录存在，并用本地服务器打开。', 'error');
  });
})();
