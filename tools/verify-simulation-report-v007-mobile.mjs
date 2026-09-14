import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await context.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
await page.goto('http://127.0.0.1:4173/ln-rank/simulation-report.html', { waitUntil: 'domcontentloaded', timeout: 15000 });
await page.waitForSelector('.volunteer-card', { timeout: 15000 });

const first = page.locator('.volunteer-card').first();
const school = first.locator('[data-field="school"]');
const major = first.locator('[data-field="majorCode"]');
const tools = first.locator('.card-tools');
const schoolBox = await school.boundingBox();
const majorBox = await major.boundingBox();
const toolsBox = await tools.boundingBox();
if (!schoolBox || !majorBox || !toolsBox) throw new Error('mobile card controls missing');
if (schoolBox.width < 280) throw new Error(`school input too narrow: ${schoolBox.width}`);
if (majorBox.width < 280) throw new Error(`major input too narrow: ${majorBox.width}`);
if (toolsBox.width < 260) throw new Error(`card actions too narrow: ${toolsBox.width}`);
if (majorBox.height > 80) throw new Error(`major field unexpectedly tall: ${majorBox.height}`);
if (!(majorBox.y > schoolBox.y)) throw new Error('major field should appear below school on mobile');
if (!(toolsBox.y > majorBox.y)) throw new Error('card actions should appear below major on mobile');

await school.fill('辽宁大学');
await major.fill('080301');
await page.waitForTimeout(700);
const caption = await first.locator('.major-caption').innerText();
if (caption.includes('尚未填写专业代码')) throw new Error(`major resolver did not update: ${caption}`);
if ((await first.getByRole('button', { name: '上移' }).innerText()) !== '↑ 上移') throw new Error('mobile action label missing');
if ((await first.getByRole('button', { name: '下移' }).innerText()) !== '↓ 下移') throw new Error('mobile action label missing');
if ((await first.getByRole('button', { name: '删除' }).innerText()) !== '删除') throw new Error('delete label missing');
if ((await page.locator('.sheet-table:visible').count())) throw new Error('legacy table must not be visible');
if ((await page.locator('body').innerText()).includes('冲稳保')) throw new Error('forbidden decision wording leaked into visible UI');
if (errors.length) throw new Error(`browser page errors: ${errors.join(' | ')}`);

await browser.close();
console.log('simulation-report-v007-mobile: PASS');
