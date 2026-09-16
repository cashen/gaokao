import { chromium } from 'playwright';

const seedState = {
  version: 2,
  studentName: '测试学生',
  subjectTrack: '辽宁物理类（物化生）',
  totalScore: '',
  rank: null,
  volunteers: [{
    id: 'note-r152-1',
    order: 1,
    school: '',
    confirmedSchool: '',
    majorCode: '',
    majorName: '',
    history: { years: {} },
    error: '',
    manualCheck: {},
    familyStatus: '还没决定',
    familyNote: ''
  }]
};

const longNote = '家里讨论后暂时保留。学费可以接受，但实际培养地点需要再核实；同时想再看看宿舍、专业培养方向和后续就业去向，再决定最终排序。';

const viewports = [
  { name: 'android', width: 390, height: 844 },
  { name: 'pad', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 900 }
];

const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport });
    await context.addInitScript(state => {
      localStorage.setItem('gaokao:simulation-report:v002', JSON.stringify(state));
    }, seedState);
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:4173/ln-rank/simulation-report.html', { waitUntil: 'networkidle' });

    const note = page.locator('[data-family-note]').first();
    if (!(await note.isVisible())) throw new Error(`${viewport.name}: family note textarea is not visible`);
    if (await page.locator('.family-note-input').count()) throw new Error(`${viewport.name}: legacy one-line family note UI remains`);

    await note.fill(longNote);
    const height = await note.evaluate(el => Number.parseFloat(getComputedStyle(el).height));
    if (!(height > 68)) throw new Error(`${viewport.name}: long note did not expand`);

    await page.waitForFunction(({ key, expected }) => {
      try {
        const stored = JSON.parse(localStorage.getItem(key) || 'null');
        return stored?.volunteers?.[0]?.familyNote === expected;
      } catch {
        return false;
      }
    }, { key: 'gaokao:simulation-report:v002', expected: longNote });

    await page.getByRole('button', { name: '候选' }).click();
    const afterDecision = await page.locator('[data-family-note]').first().inputValue();
    if (afterDecision !== longNote) throw new Error(`${viewport.name}: family decision change lost note`);

    await page.reload({ waitUntil: 'networkidle' });
    const persistedAfterReload = await page.locator('[data-family-note]').first().inputValue();
    if (persistedAfterReload !== longNote) throw new Error(`${viewport.name}: reload lost long note`);

    await context.close();
  }

  console.log('browser family-note r152: PASS');
} finally {
  await browser.close();
}
