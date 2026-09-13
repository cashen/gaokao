const STORAGE_KEY = 'gaokao:simulation-report:v002';
const PRINT_PATH = '/ln-rank/simulation-report.html?print=1';

function isAndroid() {
  return /Android/i.test(navigator.userAgent || '');
}

function readState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function syncCurrentFormToStorage() {
  const stored = readState() || {};
  const studentName = document.getElementById('studentName');
  const totalScore = document.getElementById('totalScore');
  const subjectTrack = document.getElementById('subjectTrack');
  const next = {
    ...stored,
    version: 2,
    studentName: studentName?.value.trim() || '',
    totalScore: totalScore?.value.trim() || '',
    subjectTrack: subjectTrack?.value.trim() || '辽宁物理类（物化生）'
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

function installFallbackStyles() {
  if (document.getElementById('android-print-fallback-style')) return;
  const style = document.createElement('style');
  style.id = 'android-print-fallback-style';
  style.textContent = `
    body.android-print-fallback { background:#fff; }
    body.android-print-fallback .screen-only { display:none !important; }
    body.android-print-fallback .print-only { display:table-row !important; }
    body.android-print-fallback .panel { border:0; box-shadow:none; border-radius:0; }
    body.android-print-fallback .table-wrap { overflow:visible; margin-top:0; }
    body.android-print-fallback .sheet-table { min-width:0; width:100%; table-layout:fixed; }
    body.android-print-fallback .sheet-table th,
    body.android-print-fallback .sheet-table td { padding:4px; }
    body.android-print-fallback .col-check { display:table-cell !important; min-width:0 !important; width:36%; }
    body.android-print-fallback .col-actions { display:none !important; }
    body.android-print-fallback .drag-handle { display:none; }
    body.android-print-fallback .school-suggestions { display:none !important; }
    body.android-print-fallback .footnote { display:none; }
    body.android-print-fallback .android-print-hint { display:block; margin:0 0 10px; padding:10px 12px; border:1px solid #d7e0dd; border-radius:10px; font-size:13px; line-height:1.45; background:#f8faf9; }

    @media screen and (max-width: 760px) {
      body.android-print-fallback .page { width:calc(100% - 20px); margin:12px auto 28px; }
      body.android-print-fallback .table-wrap { overflow:visible; }
      body.android-print-fallback .sheet-table { display:block; width:100%; min-width:0; table-layout:auto; }
      body.android-print-fallback .sheet-table thead { display:block; }
      body.android-print-fallback .sheet-table thead tr:not(.print-student-head) { display:none; }
      body.android-print-fallback .sheet-table .print-student-head { display:block !important; margin-bottom:10px; }
      body.android-print-fallback .sheet-table .print-student-head th { display:block !important; padding:0 0 6px; border:0; background:#fff; }
      body.android-print-fallback .print-head-row { display:block; }
      body.android-print-fallback .sheet-title { font-size:20px; line-height:1.3; }
      body.android-print-fallback .sheet-note { font-size:12px; line-height:1.55; margin-top:5px; }
      body.android-print-fallback .print-meta { margin-top:3px; font-size:11px; }
      body.android-print-fallback .sheet-table tbody { display:block; }
      body.android-print-fallback .sheet-table tbody tr { display:block; margin:0 0 12px; padding:0; border:1px solid #dbe4e1; border-radius:12px; overflow:hidden; background:#fff; box-shadow:0 2px 8px rgba(32,58,52,.04); }
      body.android-print-fallback .sheet-table tbody td { display:block; width:auto !important; min-width:0 !important; border:0; padding:8px 10px; }
      body.android-print-fallback .sheet-table tbody .col-order { padding:7px 10px; background:#f6f8f7; border-bottom:1px solid #e2e9e6; text-align:left !important; }
      body.android-print-fallback .sheet-table tbody .col-order b::before { content:'志愿 '; font-weight:500; }
      body.android-print-fallback .sheet-table tbody .col-school { padding-bottom:3px; }
      body.android-print-fallback .sheet-table tbody .col-school::before { content:'学校'; display:block; margin-bottom:3px; font-size:10px; color:#71807b; }
      body.android-print-fallback .sheet-table tbody .col-school .school-input { width:100%; min-height:38px; }
      body.android-print-fallback .sheet-table tbody .col-major { padding-top:3px; padding-bottom:8px; }
      body.android-print-fallback .sheet-table tbody .col-major::before { content:'专业（代码→中文）'; display:block; margin-bottom:3px; font-size:10px; color:#71807b; }
      body.android-print-fallback .sheet-table tbody .col-major .major-input { width:100%; min-height:38px; }
      body.android-print-fallback .sheet-table tbody .col-major .major-name { font-size:12px; margin-top:5px; min-height:0; }
      body.android-print-fallback .sheet-table tbody .col-major .manual-wrap { margin-top:8px; }
      body.android-print-fallback .sheet-table tbody .col-check { display:block !important; width:auto !important; padding:9px 10px; background:#f8faf9; border-top:1px solid #e2e9e6; }
      body.android-print-fallback .sheet-table tbody .col-check::before { content:'核对 / 重点提醒'; display:block; margin-bottom:5px; font-size:11px; font-weight:650; color:#60706d; }
      body.android-print-fallback .sheet-table tbody .history-cell,
      body.android-print-fallback .sheet-table tbody .delta-cell { display:inline-block !important; width:25% !important; vertical-align:top; padding:8px 6px; font-size:11px; background:#fff; border-top:1px solid #e2e9e6; }
      body.android-print-fallback .sheet-table tbody .history-cell::before { display:block; font-size:10px; color:#71807b; margin-bottom:2px; }
      body.android-print-fallback .sheet-table tbody .history-cell:nth-of-type(5)::before { content:'2026'; }
      body.android-print-fallback .sheet-table tbody .history-cell:nth-of-type(6)::before { content:'2025'; }
      body.android-print-fallback .sheet-table tbody .history-cell:nth-of-type(7)::before { content:'2024'; }
      body.android-print-fallback .sheet-table tbody .delta-cell::before { content:'相对当前位次'; display:block; font-size:10px; color:#71807b; margin-bottom:2px; }
      body.android-print-fallback .sheet-table tbody .col-actions { display:none !important; }
      body.android-print-fallback .sheet-table tbody .print-field { display:none !important; }
    }

    @media print {
      body.android-print-fallback .android-print-hint { display:none !important; }
      body.android-print-fallback .print-only { display:table-row !important; }
      body.android-print-fallback .col-check { display:table-cell !important; }
    }
  `;
  document.head.appendChild(style);
}

function syncFallbackPrintMeta() {
  const state = readState();
  if (!state) return;
  const values = {
    printStudentName: state.studentName || '',
    printTotalScore: state.totalScore || '',
    printRank: Number.isFinite(Number(state.rank)) && Number(state.rank) > 0 ? Number(state.rank).toLocaleString('zh-CN') : '—',
    printSubject: state.subjectTrack || '辽宁物理类（物化生）'
  };
  Object.entries(values).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  });
  const date = document.getElementById('printDate');
  if (date) date.textContent = new Date().toLocaleDateString('zh-CN');
}

function setupFallbackPage() {
  if (!new URLSearchParams(location.search).has('print')) return false;
  installFallbackStyles();
  document.body.classList.add('android-print-fallback');
  const hint = document.createElement('p');
  hint.className = 'android-print-hint';
  hint.textContent = '这是手机打印版。若未自动出现打印窗口，请打开浏览器菜单，选择“打印”或“保存为 PDF”。';
  const tableWrap = document.querySelector('.table-wrap');
  tableWrap?.parentNode?.insertBefore(hint, tableWrap);
  syncFallbackPrintMeta();
  return true;
}

function replaceAndroidPrintButton() {
  if (!isAndroid()) return;
  const button = document.getElementById('printSheet');
  if (!button || button.dataset.androidPrintReady === '1') return;
  const replacement = button.cloneNode(true);
  replacement.dataset.androidPrintReady = '1';
  replacement.textContent = '打印 A4';
  button.replaceWith(replacement);
  replacement.addEventListener('click', () => {
    syncCurrentFormToStorage();
    const opened = window.open(PRINT_PATH, '_blank', 'noopener');
    if (!opened) {
      window.location.href = PRINT_PATH;
      return;
    }
    opened.focus?.();
  });
}

const fallbackPage = setupFallbackPage();
if (!fallbackPage) {
  replaceAndroidPrintButton();
}
