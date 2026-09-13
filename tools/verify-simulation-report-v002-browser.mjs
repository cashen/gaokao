import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const base = process.env.SIMULATION_REPORT_BASE_URL || 'http://127.0.0.1:4173';
const url = `${base}/ln-rank/simulation-report.html`;
const extracted = '/tmp/simulation-report-v002.txt';
const studentName = '纸面核对测试学生';
const makeVolunteer = (index, withLongRemark = false) => ({
  id: `test-${index}`,
  order: index,
  school: `测试大学${index}`,
  majorCode: '080301',
  majorName: '测控技术与仪器',
  history: null,
  loading: false,
  error: '',
  manualCheck: {
    institutionCode: '',
    groupCode: '',
    campus: '',
    studyLocation: '',
    tuition: '',
    accommodationFee: '',
    planCount: '',
    studyLength: '',
    trainingMode: '',
    subjectRequirement: '',
    remark: withLongRemark ? 'LONG_REMARK_CHECK：这是用于打印分页验收的长备注。家庭讨论时可记录专业备注、特殊限制、培养方向、校区安排和其他需要正式填报前再次核对的信息。' : ''
  },
  familyDecision: index % 3 === 0 ? '稳' : '',
  familyStatus: index % 4 === 0 ? '保留' : '',
  familyNote: withLongRemark ? 'LONG_FAMILY_NOTE_CHECK：打印验收长家庭备注，请与正式招生计划、招生章程及志愿填报系统再次对照。' : ''
});

const makeState = count => ({
  version: 2,
  studentName,
  subjectTrack: '辽宁物理类（物化生）',
  totalScore: '555',
  scores: { chinese: '', math: '', english: '', physics: '', chemistry: '', biology: '' },
  rank: 29685,
  volunteers: Array.from({ length: count }, (_, index) => makeVolunteer(index + 1, index === 0 && count === 30))
});

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await context.newPage();
  await page.route('**/api/simulation-rank**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ ok: true, available: true, score: 555, rank: 29685, rankStart: 29685, rankEnd: 29685, sameCount: 1 })
  }));
  await page.route('**/api/ai/major-history**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ ok: true, records: [] })
  }));

  await page.goto(url, { waitUntil: 'networkidle' });

  const storageKey = 'gaokao:simulation-report:v002';
  const setState = async count => {
    await page.evaluate(({ storageKey, value }) => {
      localStorage.setItem(storageKey, JSON.stringify(value));
    }, { storageKey, value: makeState(count) });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(200);
  };

  await setState(30);
  const screenChecks = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    rowCount: document.querySelectorAll('#volunteerRows > tr').length,
    checkColumnHidden: getComputedStyle(document.querySelector('.col-check')).display === 'none'
  }));
  if (screenChecks.overflow !== 0) throw new Error(`PC horizontal overflow: ${screenChecks.overflow}`);
  if (screenChecks.rowCount !== 30) throw new Error(`Expected 30 volunteer rows, got ${screenChecks.rowCount}`);
  if (!screenChecks.checkColumnHidden) throw new Error('Printable check column must remain hidden on screen.');

  for (const [width, height] of [[820, 900], [390, 844], [360, 780]]) {
    await page.setViewportSize({ width, height });
    await page.reload({ waitUntil: 'networkidle' });
    const responsiveChecks = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      toggleCount: document.querySelectorAll('.manual-toggle').length
    }));
    if (responsiveChecks.overflow !== 0) throw new Error(`Responsive horizontal overflow at ${width}px: ${responsiveChecks.overflow}`);
    if (responsiveChecks.toggleCount !== 30) throw new Error(`Expected 30 manual toggles at ${width}px, got ${responsiveChecks.toggleCount}`);
  }

  await page.setViewportSize({ width: 1366, height: 900 });

  for (const count of [1, 5, 10, 20, 30]) {
    await setState(count);
    await page.emulateMedia({ media: 'print' });
    const printChecks = await page.evaluate(() => {
      const head = document.querySelector('.sheet-table thead');
      const studentHead = document.querySelector('.print-student-head');
      const firstCheck = document.querySelector('.print-check-block');
      return {
        rowCount: document.querySelectorAll('#volunteerRows > tr').length,
        theadDisplay: getComputedStyle(head).display,
        studentHeadDisplay: getComputedStyle(studentHead).display,
        checkDisplay: getComputedStyle(firstCheck).display,
        hasWaitLabel: document.body.innerText.includes('学费：待核实') || document.body.innerText.includes('校区：待核实') || document.body.innerText.includes('2026招生计划：待核实')
      };
    });
    if (printChecks.rowCount !== count) throw new Error(`Expected ${count} printable rows, got ${printChecks.rowCount}`);
    if (printChecks.theadDisplay !== 'table-header-group') throw new Error(`Print thead display is ${printChecks.theadDisplay}`);
    if (printChecks.studentHeadDisplay !== 'table-row') throw new Error(`Print student head display is ${printChecks.studentHeadDisplay}`);
    if (printChecks.checkDisplay !== 'block') throw new Error(`Print check block display is ${printChecks.checkDisplay}`);
    if (printChecks.hasWaitLabel) throw new Error('Printable output must not contain hardcoded 待核实 labels.');

    const countOutput = `/tmp/simulation-report-v002-${count}.pdf`;
    await page.pdf({ path: countOutput, format: 'A4', landscape: true, printBackground: true, margin: { top: '8mm', right: '8mm', bottom: '8mm', left: '8mm' } });
    const stat = await fs.stat(countOutput);
    if (stat.size < 1000) throw new Error(`${count} volunteers generated an unexpectedly small PDF: ${stat.size} bytes`);
    const { stdout: pdfInfo } = await execFileAsync('pdfinfo', [countOutput]);
    const pageMatch = pdfInfo.match(/^Pages:\s+(\d+)$/m);
    const pageCount = pageMatch ? Number(pageMatch[1]) : 0;
    if (pageCount < 1) throw new Error(`${count} volunteers generated no printable pages.`);
    if (count === 30 && pageCount < 2) throw new Error(`Expected 30 volunteers to span multiple pages, got ${pageCount} page(s).`);

    await execFileAsync('pdftotext', ['-layout', countOutput, extracted]);
    const text = await fs.readFile(extracted, 'utf8');
    const pages = text.split('\f').map(value => value.trim()).filter(Boolean);
    if (pages.length !== pageCount) throw new Error(`${count} volunteers PDF text extraction produced ${pages.length} pages but pdfinfo reports ${pageCount}.`);
    for (const [index, pageText] of pages.entries()) {
      for (const required of [
        '辽宁物理类模拟志愿填报单',
        `姓名：${studentName}`,
        '总分：555',
        '参考位次：29,685',
        '类型：辽宁物理类（物化生）',
        '志愿',
        '学校',
        '专业（代码→中文）',
        '报考核对'
      ]) {
        if (!pageText.includes(required)) throw new Error(`PDF ${count}-volunteer page ${index + 1} missing repeated header text: ${required}`);
      }
    }
    for (const forbidden of ['学费：待核实', '校区：待核实', '2026招生计划：待核实']) {
      if (text.includes(forbidden)) throw new Error(`PDF ${count}-volunteer output contains forbidden hardcoded placeholder: ${forbidden}`);
    }
    if (!text.includes('测试大学1') || (count === 30 && !text.includes('测试大学30'))) {
      throw new Error(`PDF lost expected volunteer rows for count ${count}.`);
    }
    if (count === 30) {
      if (!text.includes('LONG_REMARK_CHECK')) throw new Error('Long remark marker did not survive PDF output.');
      if (!text.includes('LONG_FAMILY_NOTE_CHECK')) throw new Error('Long family note marker did not survive PDF output.');
      if (!text.includes('长备注')) throw new Error('Long remark CJK text did not survive PDF output.');
      if (!text.includes('长家庭备注')) throw new Error('Long family note CJK text did not survive PDF output.');
    }
    console.log(`print boundary ${count}: PASS (${stat.size} bytes, ${pageCount} pages)`);
  }

  const legacyHistory = {
    years: {
      2026: { score: 550, rank: 30000, comparable: true, recordStatus: 'primary-record' }
    }
  };
  const legacyState = {
    version: 1,
    studentName,
    subjectTrack: '辽宁物理类（物化生）',
    totalScore: '555',
    scores: { chinese: '', math: '', english: '', physics: '', chemistry: '', biology: '' },
    rank: null,
    volunteers: [{
      ...makeVolunteer(1, false),
      history: legacyHistory,
      manualCheck: undefined,
      familyDecision: undefined,
      familyStatus: undefined,
      familyNote: undefined
    }]
  };
  await page.emulateMedia({ media: 'screen' });
  await page.evaluate(({ legacyKey, value, storageKey }) => {
    localStorage.removeItem(storageKey);
    localStorage.setItem(legacyKey, JSON.stringify(value));
  }, { legacyKey: 'gaokao:simulation-report:v001', value: legacyState, storageKey });
  await page.reload({ waitUntil: 'networkidle' });
  const migrationChecks = await page.evaluate(() => {
    const row = document.querySelector('#volunteerRows > tr');
    const firstManual = document.querySelector('[data-field="manualCheck.tuition"]');
    return {
      rowCount: document.querySelectorAll('#volunteerRows > tr').length,
      rowMajor: document.querySelector('.major-input')?.value || '',
      historyScore: row?.querySelector('.history-cell .history-main')?.textContent || '',
      manualInputs: document.querySelectorAll('[data-field^="manualCheck."]').length,
      hasManualTuitionInput: Boolean(firstManual)
    };
  });
  if (migrationChecks.rowCount !== 1) throw new Error(`Legacy v001 migration row count is ${migrationChecks.rowCount}`);
  if (migrationChecks.rowMajor !== '080301') throw new Error(`Legacy v001 migration lost major code: ${migrationChecks.rowMajor}`);
  if (migrationChecks.historyScore !== '550分') throw new Error(`Legacy v001 migration lost historical score: ${migrationChecks.historyScore}`);
  if (migrationChecks.manualInputs !== 11 || !migrationChecks.hasManualTuitionInput) throw new Error('Manual-check fields were not created during migration.');

  const persisted = await page.evaluate(({ storageKey }) => {
    const input = document.querySelector('[data-field="manualCheck.tuition"]');
    if (!input) return { edited: false };
    input.value = '4500';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const stored = JSON.parse(localStorage.getItem(storageKey) || 'null');
    return {
      edited: true,
      version: stored?.version ?? null,
      tuition: stored?.volunteers?.[0]?.manualCheck?.tuition ?? null
    };
  }, { storageKey });
  if (!persisted.edited) throw new Error('Could not edit migrated manual tuition field.');
  if (persisted.version !== 2 || persisted.tuition !== '4500') throw new Error('Edited migrated v001 state did not persist to v2 storage.');

  await page.reload({ waitUntil: 'networkidle' });
  const reloadPersistence = await page.evaluate(() => ({
    tuition: document.querySelector('[data-field="manualCheck.tuition"]')?.value || '',
    rowMajor: document.querySelector('.major-input')?.value || ''
  }));
  if (reloadPersistence.tuition !== '4500') throw new Error(`Persisted manual tuition lost after reload: ${reloadPersistence.tuition}`);
  if (reloadPersistence.rowMajor !== '080301') throw new Error(`Persisted migrated major changed after reload: ${reloadPersistence.rowMajor}`);

  console.log('simulation-report-v002-browser: PASS');
  console.log('Responsive: PC 1366 / Pad 820 / Android 390 / Android 360');
  console.log('Print boundaries: 1 / 5 / 10 / 20 / 30 volunteers');
  console.log('Print: repeated identity + column headers on every extracted page');
  console.log('Print: no hardcoded 待核实 placeholders; long note markers survive PDF');
  console.log('Migration: v001 retains major + history, then persists new manual-check data as v2');
} finally {
  await browser.close();
}
