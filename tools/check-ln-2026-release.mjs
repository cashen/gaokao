import fs from 'node:fs';
const j=p=>JSON.parse(fs.readFileSync(p,'utf8'));const t=p=>fs.readFileSync(p,'utf8');const ok=(c,m)=>{if(!c)throw new Error(m)};
const m=j('fenxi/data/ln-rank-2026/manifest.json');ok(m.dataYear===2026,'manifest year');ok(m.totalRecords===11628,'record count');ok(m.schoolCount===956,'school count');
const r=j('fenxi/data/rank_2026_physics.json');for(const [s,v] of [[700,41],[600,14235],[508,49824],[344,119069],[150,141691]])ok(r[String(s)]===v,`rank anchor ${s}`);
const pages=['ln-rank/index.html','ln-rank/selection-pool.html','ln-rank/local-mainline.html','ln-rank/211-mainline.html','ln2026.html','lngk2026.html','index.html','e.html'];for(const p of pages){const x=t(p);ok(!/版本：v3\.9\.50\.0/.test(x),`${p} old footer`);if(p.startsWith('ln-rank/'))ok(x.includes('v3.9.51.0'),`${p} version`)}
ok(t('index.html').includes('./ln2026.html')&&t('index.html').includes('./lngk2026.html'),'root links');ok(t('e.html').includes('./ln2026.html')&&t('e.html').includes('./lngk2026.html'),'countdown links');
ok(!t('ln-rank/js/core/score-guard.js').includes('<400'),'no 400 guard');ok(t('functions/_lib/exam-year-config.js').includes('specialControlScore: 508')&&t('functions/_lib/exam-year-config.js').includes('undergraduateControlScore: 344'),'controls');
ok(t('functions/api/major-bands.js').includes('ln-rank-manifest.js'),'major bands data isolation');ok(t('functions/_lib/background-position-engine.js').includes('ln-rank-manifest.js'),'background data isolation');
console.log('LN 2026 release checks passed');
