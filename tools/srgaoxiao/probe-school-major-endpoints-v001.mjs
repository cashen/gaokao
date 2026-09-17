#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const out = process.argv[2] || 'tmp/srgaoxiao-label-source-probe-v001.json';
await fs.mkdir(path.dirname(path.resolve(out)), { recursive:true });
const browser = await chromium.launch({ headless:true });
try {
  const page = await browser.newPage();
  page.setDefaultTimeout(15000);
  const captures = [];
  page.on('response', async response => {
    const req = response.request();
    if (!['xhr','fetch'].includes(req.resourceType())) return;
    const url = response.url();
    if (!/^https:\/\/eo\.srgaoxiao\.com\/api\//i.test(url)) return;
    const ct = response.headers()['content-type'] || '';
    if (!/json|text/i.test(ct)) return;
    let text = '';
    try { text = (await response.text()).slice(0, 50000); } catch {}
    captures.push({ url, status:response.status(), method:req.method(), resourceType:req.resourceType(), text });
  });

  await page.goto('https://eo.srgaoxiao.com/schools', {waitUntil:'domcontentloaded'});
  await page.waitForTimeout(900);
  const schoolName = await page.locator('.sl-card').first().locator('.sl-card-name').innerText().catch(()=> '');
  const schoolCardHtml = await page.locator('.sl-card').first().evaluate(el => el.outerHTML).catch(()=> '');
  const schoolIdMatch = schoolCardHtml.match(/(?:schoolId|school_id|id)[^0-9]{0,24}(\d{1,6})/i);
  const schoolId = schoolIdMatch?.[1] || '';
  await page.locator('.sl-card').first().click().catch(()=> null);
  await page.waitForTimeout(1200);

  await page.goto('https://eo.srgaoxiao.com/specialties', {waitUntil:'domcontentloaded'});
  await page.waitForTimeout(900);
  const specialtyName = await page.locator('text=人工智能').first().innerText().catch(()=> '');
  const specialtyHtml = await page.locator('text=人工智能').first().evaluate(el => el.closest('a,button,[role="button"],div')?.outerHTML || el.outerHTML).catch(()=> '');
  const specialtyIdMatch = specialtyHtml.match(/(?:specialtyId|majorId|id)[^0-9]{0,24}(\d{1,6})/i);
  const specialtyId = specialtyIdMatch?.[1] || '';

  const ids = [...new Set([schoolId,'3','4'].filter(Boolean))];
  const endpointResults = [];
  for (const id of ids) {
    for (const requestPath of [
      `/api/schools/${id}`,
      `/api/schools/${id}/majors`,
      `/api/schools/${id}/specialties`,
      `/api/school/${id}`,
      `/api/school/${id}/majors`,
      `/api/school/${id}/specialties`,
      `/api/school-majors?schoolId=${id}`,
      `/api/school_specialties?schoolId=${id}`
    ]) {
      try {
        const response = await page.request.get(new URL(requestPath,'https://eo.srgaoxiao.com').href,{timeout:10000,failOnStatusCode:false});
        endpointResults.push({request:requestPath,status:response.status(),contentType:response.headers()['content-type']||'',text:(await response.text()).slice(0,50000)});
      } catch (error) {
        endpointResults.push({request:requestPath,status:0,error:String(error?.message||error)});
      }
    }
  }

  await fs.writeFile(out, JSON.stringify({
    schemaVersion:'srgaoxiao-label-source-probe-v001',
    collectedAt:new Date().toISOString(),
    source:{schoolsUrl:'https://eo.srgaoxiao.com/schools',specialtiesUrl:'https://eo.srgaoxiao.com/specialties'},
    clickProbe:{schoolName,schoolId,specialtyName,specialtyId,finalUrl:page.url()},
    apiCapture:{count:captures.length,records:captures},
    endpointResults
  },null,2));
  console.log(JSON.stringify({ok:true, schoolName, schoolId, specialtyName, specialtyId, captures:captures.length, endpointResults:endpointResults.length}));
} finally { await browser.close(); }
