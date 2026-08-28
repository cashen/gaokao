#!/usr/bin/env node
import { STANDARD_MAJOR_CATALOG } from '../functions/_lib/standard-major-catalog.js';
import { mapStandardMajor } from '../functions/_lib/standard-major-mapper.js';

const required = ['电气工程及其自动化','计算机科学与技术','会计学','临床医学','交通运输','石油工程','航空航天工程','护理学','法学'];
let fail = 0;
for (const name of required) {
  const m = mapStandardMajor({ majorName: name });
  if (!m.code || m.mappingStatus === 'unmapped') {
    console.error(`[FAIL] ${name} 未匹配`);
    fail += 1;
  }
}
const codes = new Set();
for (const item of STANDARD_MAJOR_CATALOG) {
  if (!item.code || !item.name) { console.error('[FAIL] 缺少 code/name', item); fail += 1; }
  if (codes.has(item.code)) { console.error('[FAIL] 重复 code', item.code); fail += 1; }
  codes.add(item.code);
}
if (fail) process.exit(1);
console.log(`[OK] standard major catalog entries=${STANDARD_MAJOR_CATALOG.length}`);
