import fs from 'node:fs';
const j=p=>JSON.parse(fs.readFileSync(p,'utf8'));const t=p=>fs.readFileSync(p,'utf8');const ok=(c,m)=>{if(!c)throw new Error(m)};
const m=j('fenxi/data/ln-rank-2026/manifest.json');ok(m.dataYear===2026,'manifest year');ok(m.totalRecords===11628,'record count');ok(m.schoolCount===956,'school count');
const r=j('fenxi/data/rank_2026_physics.json');for(const [s,v] of [[700,41],[600,14235],[508,49824],[344,119069],[150,141691]])ok(r[String(s)]===v,`rank anchor ${s}`);
const pages=['ln-rank/index.html','ln-rank/selection-pool.html','ln-rank/local-mainline.html','ln-rank/211-mainline.html','ln-rank/major-trend-2026.html','ln2026.html','lngk2026.html','index.html','e.html'];for(const p of pages){const x=t(p);ok(!/版本：v3\.9\.50\.0/.test(x),`${p} old footer`)}
ok(t('ln-rank/index.html').includes('v3.9.52.0'),'main version');ok(t('ln-rank/selection-pool.html').includes('v3.9.52.0'),'selection version');ok(t('ln2026.html').includes('v3.9.52.0'),'difficulty version');
const root=t('index.html');ok((root.match(/ln2026\.html/g)||[]).length===1,'root unified difficulty link');ok(!root.includes('lngk2026.html'),'root duplicate difficulty link');ok(!root.includes('/fenxi'),'root legacy runtime link');
ok(t('e.html').includes("location.replace('/')"),'e redirect');ok(t('lngk2026.html').includes('/ln2026.html#score-band'),'score-band redirect');ok(t('ln-rank/major-trend-2026.html').includes('/ln2026.html#overview'),'trend redirect');
ok(t('ln-rank/js/ux/family-presentation.v3952_0.js').includes('暂时没能读取专业数据'),'generic visible error');ok(t('ln-rank/css/dist/family-human-layer.v3952_0.css').includes('@media (min-width:761px) and (max-width:1199px)'),'tablet contract');
ok(!t('ln-rank/js/core/score-guard.js').includes('<400'),'no 400 guard');ok(t('functions/_lib/exam-year-config.js').includes('specialControlScore: 508')&&t('functions/_lib/exam-year-config.js').includes('undergraduateControlScore: 344'),'controls');
ok(t('functions/api/major-bands.js').includes('ln-rank-manifest.js'),'major bands data isolation');ok(t('functions/_lib/background-position-engine.js').includes('ln-rank-manifest.js'),'background data isolation');
console.log('LN 2026 human-language release checks passed');
