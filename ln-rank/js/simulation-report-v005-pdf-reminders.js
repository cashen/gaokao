const STORAGE_KEY = 'gaokao:simulation-report:v002';
const PDF_LIBS = {
  html2canvas: 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',
  jsPDF: 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js'
};

let pdfLibPromise = null;
let reminderOpen = new Set();

const esc = value => String(value ?? '').replace(/[&<>\"']/g, char => ({ '&': '&lt;'.replace('&', '&'), '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

function readState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function rowInputs(rowId) {
  const root = document.querySelector(`tr[data-row-id="${CSS.escape(rowId)}"]`);
  if (!root) return {};
  const get = selector => root.querySelector(selector)?.value?.trim() || '';
  const manual = key => root.querySelector(`[data-field="manualCheck.${key}"]`)?.value?.trim() || '';
  return {
    school: get('[data-field="school"]'),
    majorCode: get('[data-field="majorCode"]'),
    majorName: root.querySelector(`[data-major-name="${CSS.escape(rowId)}"]`)?.textContent?.trim() || '',
    institutionCode: manual('institutionCode'),
    groupCode: manual('groupCode'),
    campus: manual('campus'),
    studyLocation: manual('studyLocation'),
    tuition: manual('tuition'),
    accommodationFee: manual('accommodationFee'),
    planCount: manual('planCount'),
    studyLength: manual('studyLength'),
    trainingMode: manual('trainingMode'),
    subjectRequirement: manual('subjectRequirement'),
    remark: manual('remark')
  };
}

function getReminders(row) {
  const input = rowInputs(row.id);
  const reminders = [];
  const majorName = input.majorName && !/^输入专业代码/.test(input.majorName) ? input.majorName : '';
  const historyYears = [2026, 2025, 2024].map(year => row.history?.years?.[year]);

  if (!input.school) reminders.push({ level: 'required', text: '还没有填写学校，这条志愿暂不完整。' });
  if (!input.majorCode) reminders.push({ level: 'required', text: '还没有填写专业代码，这条志愿暂不完整。' });
  else if (!majorName) reminders.push({ level: 'check', text: '专业代码已填写，请确认系统是否已匹配到正确的中文专业。' });
  if (historyYears.some(item => !item || (item.score == null && item.rank == null))) reminders.push({ level: 'info', text: '部分年份没有严格口径历史记录，不宜据此判断趋势。' });
  if (historyYears.some(item => item?.comparable === false && item?.recordStatus !== 'primary-record')) reminders.push({ level: 'check', text: '部分历史记录口径需要核验，请结合当年招生章程判断。' });
  const manualFilled = ['institutionCode', 'groupCode', 'campus', 'studyLocation', 'tuition', 'accommodationFee', 'planCount', 'studyLength', 'trainingMode', 'subjectRequirement', 'remark'].filter(key => input[key]);
  if (manualFilled.length) reminders.push({ level: 'check', text: `你已留下 ${manualFilled.length} 项人工核对记录，填报前请逐项与当年官方资料确认。` });
  if (row.familyStatus || row.familyNote) {
    const family = [row.familyStatus, row.familyNote].filter(Boolean).join(' · ');
    reminders.push({ level: 'family', text: `家庭处理：${family}` });
  }
  if (!reminders.length) reminders.push({ level: 'ok', text: '目前没有发现需要特别提醒的项目。' });
  return reminders.slice(0, 2);
}

function reminderPanel(row) {
  const open = reminderOpen.has(row.id);
  const reminders = getReminders(row);
  const items = reminders.map(item => `<div class="scenario-reminder scenario-${esc(item.level)}"><span class="scenario-icon">${item.level === 'ok' ? '✓' : item.level === 'required' ? '!' : '·'}</span><span>${esc(item.text)}</span></div>`).join('');
  return `<div class="scenario-wrap" data-scenario-wrap="${esc(row.id)}"><button type="button" class="scenario-toggle" data-v005-action="toggle" data-row-id="${esc(row.id)}" aria-expanded="${open}">${open ? '收起核对与提醒' : '核对与提醒'}</button><div class="scenario-panel" ${open ? '' : 'hidden'}><div class="scenario-list">${items}</div><p class="scenario-note">提醒只基于当前志愿已有数据与历史记录，不等于招生录取结论；正式填报请以当年官方招生资料为准。</p></div></div>`;
}

function decorateRows() {
  document.querySelectorAll('#volunteerRows tr[data-row-id]').forEach(rowEl => {
    const rowId = rowEl.dataset.rowId;
    const old = rowEl.querySelector('.manual-wrap');
    if (!old) return;
    if (rowEl.querySelector('.scenario-wrap')) return;
    old.replaceWith(document.createRange().createContextualFragment(reminderPanel({ id: rowId, ...readState()?.volunteers?.find(row => row.id === rowId) })));
  });
}

function installReminderStyles() {
  if (document.getElementById('simulation-v005-style')) return;
  const style = document.createElement('style');
  style.id = 'simulation-v005-style';
  style.textContent = `
    .scenario-wrap { margin-top: 9px; }
    .scenario-toggle { border:1px solid #cbd8d4; background:#f8faf9; color:#28453e; border-radius:9px; padding:6px 10px; font-size:12px; cursor:pointer; }
    .scenario-panel { margin-top:7px; padding:8px; border:1px solid #dfe7e4; border-radius:10px; background:#fbfcfc; }
    .scenario-list { display:grid; gap:6px; }
    .scenario-reminder { display:flex; gap:7px; align-items:flex-start; font-size:12px; line-height:1.5; color:#40514c; }
    .scenario-icon { flex:0 0 16px; width:16px; height:16px; line-height:16px; text-align:center; border-radius:50%; background:#e8efec; font-weight:700; }
    .scenario-required .scenario-icon { background:#f3e8e3; }
    .scenario-check .scenario-icon { background:#f0eee1; }
    .scenario-family .scenario-icon { background:#e7edf1; }
    .scenario-note { margin:7px 0 0; font-size:11px; line-height:1.45; color:#75827e; }
    .pdf-export-root { position:fixed; left:-100000px; top:0; width:794px; background:#fff; color:#20332e; z-index:-1; padding:28px; box-sizing:border-box; font-family:"Noto Sans SC","Microsoft YaHei",Arial,sans-serif; }
    .pdf-title { font-size:24px; font-weight:750; margin:0 0 7px; }
    .pdf-meta { font-size:12px; color:#60716c; padding-bottom:14px; border-bottom:1px solid #dbe4e1; }
    .pdf-card { border:1px solid #d8e2df; border-radius:12px; margin:0 0 12px; overflow:hidden; break-inside:avoid; }
    .pdf-card-head { padding:9px 12px; background:#f4f7f6; font-size:15px; font-weight:700; }
    .pdf-card-body { padding:11px 12px; }
    .pdf-grid { display:grid; grid-template-columns:1.3fr 1.3fr 1fr 1fr; gap:8px; }
    .pdf-cell b { display:block; font-size:10px; color:#72817d; font-weight:600; margin-bottom:2px; }
    .pdf-cell span { font-size:12px; line-height:1.4; }
    .pdf-reminder { margin-top:9px; padding-top:8px; border-top:1px dashed #d9e2df; font-size:11px; line-height:1.5; }
    .pdf-reminder strong { font-weight:700; }
    .pdf-history { margin-top:9px; display:grid; grid-template-columns:repeat(4,1fr); border-top:1px solid #e4ebe8; }
    .pdf-history div { padding:7px 6px; border-right:1px solid #e4ebe8; }
    .pdf-history div:last-child { border-right:0; }
    .pdf-history b { display:block; font-size:10px; color:#72817d; margin-bottom:2px; }
    .pdf-history span { font-size:11px; }
    .pdf-foot { margin-top:14px; padding-top:10px; border-top:1px solid #dbe4e1; font-size:10px; line-height:1.5; color:#6c7b77; }
    @media (max-width:760px) { .pdf-export-root { width:720px; } }
  `;
  document.head.appendChild(style);
}

function setUiText() {
  const printBtn = document.getElementById('printSheet');
  if (printBtn) printBtn.textContent = '生成 PDF';
  const status = document.getElementById('pageStatus');
  if (status) status.textContent = '每一行是一条志愿；可以拖动或使用上下箭头调整顺序。核对与提醒只在需要时展开。';
  document.querySelectorAll('.manual-toggle').forEach(btn => {
    btn.textContent = btn.getAttribute('aria-expanded') === 'true' ? '收起核对与提醒' : '核对与提醒';
  });
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-v005-lib="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === '1') resolve();
      else existing.addEventListener('load', resolve, { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.dataset.v005Lib = src;
    script.onload = () => { script.dataset.loaded = '1'; resolve(); };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function loadPdfLibs() {
  if (!pdfLibPromise) {
    pdfLibPromise = (async () => {
      await loadScript(PDF_LIBS.html2canvas);
      await loadScript(PDF_LIBS.jsPDF);
      if (!window.html2canvas || !window.jspdf?.jsPDF) throw new Error('PDF组件加载失败');
    })().catch(error => { pdfLibPromise = null; throw error; });
  }
  return pdfLibPromise;
}

function formatHistory(row, year) {
  const item = row.history?.years?.[year];
  if (!item || (item.score == null && item.rank == null)) return '无严格记录';
  const score = item.score == null ? '—' : `${item.score}分`;
  const rank = item.rank == null ? '—' : `${Number(item.rank).toLocaleString('zh-CN')}位`;
  return `${score} / ${rank}${item.comparable === false && item.recordStatus !== 'primary-record' ? ' · 需核验' : ''}`;
}

function buildPdfRoot() {
  const state = readState() || { volunteers: [] };
  const root = document.createElement('div');
  root.className = 'pdf-export-root';
  root.innerHTML = `<h1 class="pdf-title">辽宁物理类模拟志愿填报单</h1><div class="pdf-meta">姓名：${esc(state.studentName || '未填写')}　总分：${esc(state.totalScore || '—')}　参考位次：${Number(state.rank) > 0 ? Number(state.rank).toLocaleString('zh-CN') : '—'}　类型：${esc(state.subjectTrack || '辽宁物理类（物化生）')}　生成日期：${esc(new Date().toLocaleDateString('zh-CN'))}</div>`;
  (state.volunteers || []).forEach((row, index) => {
    const input = rowInputs(row.id);
    const majorName = input.majorName && !/^输入专业代码/.test(input.majorName) ? input.majorName : '未匹配中文专业';
    const reminders = getReminders(row);
    const reminderHtml = reminders.map(item => `<div><strong>${item.level === 'ok' ? '✓' : item.level === 'required' ? '需要补充' : '请核对'}</strong> ${esc(item.text)}</div>`).join('');
    const delta = row.history?.years?.[2026]?.rank && Number(state.rank) > 0 ? `${Number(row.history.years[2026].rank) - Number(state.rank) > 0 ? '+' : ''}${(Number(row.history.years[2026].rank) - Number(state.rank)).toLocaleString('zh-CN')}名` : '—';
    const card = document.createElement('section');
    card.className = 'pdf-card';
    card.innerHTML = `<div class="pdf-card-head">志愿 ${index + 1}　${esc(input.school || '未填写学校')}</div><div class="pdf-card-body"><div class="pdf-grid"><div class="pdf-cell"><b>专业（代码→中文）</b><span>${esc(input.majorCode || '未填写')} → ${esc(majorName)}</span></div><div class="pdf-cell"><b>相对当前位次</b><span>${esc(delta)}</span></div><div class="pdf-cell"><b>家庭处理</b><span>${esc(row.familyStatus || '待讨论')}</span></div></div><div class="pdf-history"><div><b>2026</b><span>${esc(formatHistory(row, 2026))}</span></div><div><b>2025</b><span>${esc(formatHistory(row, 2025))}</span></div><div><b>2024</b><span>${esc(formatHistory(row, 2024))}</span></div><div><b>家庭备注</b><span>${esc(row.familyNote || '—')}</span></div></div><div class="pdf-reminder"><strong>核对与提醒</strong><br>${reminderHtml}</div></div>`;
    root.appendChild(card);
  });
  const foot = document.createElement('div');
  foot.className = 'pdf-foot';
  foot.textContent = '本 PDF 是当前模拟志愿页面的记录快照。提醒只用于辅助核对，不代表录取概率或招生结论。具体招生计划、招生章程、专业限制等请以当年官方资料及志愿填报系统为准。';
  root.appendChild(foot);
  document.body.appendChild(root);
  return root;
}

async function generatePdf() {
  const button = document.getElementById('printSheet');
  if (button?.dataset.busy === '1') return;
  if (button) { button.dataset.busy = '1'; button.textContent = '正在生成…'; }
  try {
    const state = readState();
    if (!state?.volunteers?.length) throw new Error('当前没有可生成的志愿记录');
    await loadPdfLibs();
    const root = buildPdfRoot();
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const canvas = await window.html2canvas(root, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false, width: root.offsetWidth, windowWidth: root.offsetWidth });
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 8;
    const usableWidth = pageWidth - margin * 2;
    const fullPagePxHeight = Math.floor(canvas.width * ((pageHeight - margin * 2) / usableWidth));
    const headerSlicePxHeight = Math.min(Math.round(canvas.width * 0.18), 180);
    const headerMmHeight = headerSlicePxHeight / canvas.width * usableWidth;
    const contentPageMmHeight = pageHeight - margin * 2 - headerMmHeight;
    const contentPagePxHeight = Math.floor(canvas.width * (contentPageMmHeight / usableWidth));

    const addCanvasSlice = (offsetY, sliceHeight, topMm) => {
      const slice = document.createElement('canvas');
      slice.width = canvas.width;
      slice.height = sliceHeight;
      const ctx = slice.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, slice.width, slice.height);
      ctx.drawImage(canvas, 0, offsetY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
      const imageHeight = sliceHeight / canvas.width * usableWidth;
      pdf.addImage(slice.toDataURL('image/jpeg', 0.92), 'JPEG', margin, topMm, usableWidth, Math.min(imageHeight, pageHeight - topMm - margin), undefined, 'FAST');
    };

    addCanvasSlice(0, Math.min(fullPagePxHeight, canvas.height), margin);
    let offsetY = Math.min(fullPagePxHeight, canvas.height);
    while (offsetY < canvas.height) {
      pdf.addPage();
      const headerHeight = Math.min(headerSlicePxHeight, canvas.height);
      const headerCanvas = document.createElement('canvas');
      headerCanvas.width = canvas.width;
      headerCanvas.height = headerHeight;
      const headerCtx = headerCanvas.getContext('2d');
      headerCtx.fillStyle = '#fff';
      headerCtx.fillRect(0, 0, headerCanvas.width, headerCanvas.height);
      headerCtx.drawImage(canvas, 0, 0, canvas.width, headerHeight, 0, 0, canvas.width, headerHeight);
      pdf.addImage(headerCanvas.toDataURL('image/jpeg', 0.92), 'JPEG', margin, margin, usableWidth, headerMmHeight, undefined, 'FAST');
      addCanvasSlice(offsetY, Math.min(contentPagePxHeight, canvas.height - offsetY), margin + headerMmHeight);
      offsetY += contentPagePxHeight;
    }
    const stamp = new Date().toISOString().slice(0, 10).replaceAll('-', '');
    pdf.save(`辽宁物理类模拟志愿填报单-${stamp}.pdf`);
    root.remove();
  } catch (error) {
    document.querySelector('.pdf-export-root')?.remove();
    alert(`PDF生成未完成：${error?.message || '未知错误'}。请检查网络后重试。`);
  } finally {
    if (button) { button.dataset.busy = '0'; button.textContent = '生成 PDF'; }
  }
}

function install() {
  installReminderStyles();
  setUiText();
  const printBtn = document.getElementById('printSheet');
  printBtn?.addEventListener('click', generatePdf);
  const rows = document.getElementById('volunteerRows');
  rows?.addEventListener('click', event => {
    const button = event.target.closest('[data-v005-action="toggle"]');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    const rowId = button.dataset.rowId;
    if (reminderOpen.has(rowId)) reminderOpen.delete(rowId); else reminderOpen.add(rowId);
    const row = readState()?.volunteers?.find(item => item.id === rowId);
    const wrap = button.closest('.scenario-wrap');
    if (wrap && row) wrap.outerHTML = reminderPanel(row);
  }, true);
  const observer = new MutationObserver(() => { setUiText(); decorateRows(); });
  observer.observe(rows || document.body, { childList: true, subtree: true });
  decorateRows();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
else install();
