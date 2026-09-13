import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const base = process.env.SIMULATION_REPORT_BASE_URL || 'http://127.0.0.1:4173';
const url = `${base}/ln-rank/simulation-report.html`;
const output = process.env.SIMULATION_REPORT_PDF || '/tmp/simulation-report-v002.pdf';
const studentName = '纸面核对测试学生';
const volunteers = Array.from({ length: 30 }, (_, index) => ({
  id: `test-${index + 1}`,
  order: index + 1,
  school: `测试大学${index + 1}`,
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
    remark: ''
  },
  familyDecision: '',
  familyStatus: '',
  familyNote: ''
}));

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

  await page.addInitScript(({ storageKey, value }) => {
    localStorage.setItem(storageKey, JSON.stringify(value));
  }, {
    storageKey: 'gaokao:simulation-report:v002',
    value: {
      version: 2,
      studentName,
      subjectTrack: '辽宁物理类（物化生）',
      totalScore: '555',
      scores: { chinese: '', math: '', english: '', physics: '', chemistry: '', biology: '' },
      rank: null,
      volunteers
    }
  });

  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);

  const screenChecks = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    rowCount: document.querySelectorAll('#volunteerRows > tr').length,
    checkColumnHidden: getComputedStyle(document.querySelector('.col-check')).display === 'none'
  }));
  if (screenChecks.overflow !== 0) throw new Error(`PC horizontal overflow: ${screenChecks.overflow}`);
  if (screenChecks.rowCount !== 30) throw new Error(`Expected 30 volunteer rows, got ${screenChecks.rowCount}`);
  if (!screenChecks.checkColumnHidden) throw new Error('Printable check column must remain hidden on screen.');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: 'networkidle' });
  const mobileChecks = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    toggleCount: document.querySelectorAll('.manual-toggle').length
  }));
  if (mobileChecks.overflow !== 0) throw new Error(`Mobile horizontal overflow: ${mobileChecks.overflow}`);
  if (mobileChecks.toggleCount !== 30) throw new Error(`Expected 30 manual toggles, got ${mobileChecks.toggleCount}`);

  await page.emulateMedia({ media: 'print' });
  const printChecks = await page.evaluate(() => {
    const head = document.querySelector('.sheet-table thead');
    const studentHead = document.querySelector('.print-student-head');
    const firstCheck = document.querySelector('.print-check-block');
    return {
      paperWidth: getComputedStyle(document.querySelector('.sheet-table')).width,
      theadDisplay: getComputedStyle(head).display,
      studentHeadDisplay: getComputedStyle(studentHead).display,
      checkDisplay: getComputedStyle(firstCheck).display,
      hasWaitLabel: document.body.innerText.includes('学费：待核实') || document.body.innerText.includes('校区：待核实') || document.body.innerText.includes('2026招生计划：待核实')
    };
  });
  if (printChecks.theadDisplay !== 'table-header-group') throw new Error(`Print thead display is ${printChecks.theadDisplay}`);
  if (printChecks.studentHeadDisplay !== 'table-row') throw new Error(`Print student head display is ${printChecks.studentHeadDisplay}`);
  if (printChecks.checkDisplay !== 'block') throw new Error(`Print check block display is ${printChecks.checkDisplay}`);
  if (printChecks.hasWaitLabel) throw new Error('Printable output must not contain hardcoded 待核实 labels.');

  await page.pdf({ path: output, format: 'A4', landscape: true, printBackground: true, margin: { top: '8mm', right: '8mm', bottom: '8mm', left: '8mm' } });
  const stat = await fs.stat(output);
  if (stat.size < 1000) throw new Error(`Generated PDF is unexpectedly small: ${stat.size} bytes`);

  console.log(`simulation-report-v002-browser: PASS (${stat.size} bytes PDF)`);
  console.log('PC 1366: no horizontal overflow, 30 rows');
  console.log('Mobile 390: no horizontal overflow, 30 manual-check controls');
  console.log('Print: repeating thead contract, printable check block visible, no hardcoded 待核实');
} finally {
  await browser.close();
}
