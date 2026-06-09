import fs from 'node:fs';
const must=['ln-rank/index.html','ln-rank/selection-pool.html','ln-rank/self-check.html','ln-rank/major-trend-2025.html','ln-rank/js/app.v3918_4.js','ln-rank/js/selection-pool.v3918_4.js','ln-rank/js/self-check.v3918_4.js','ln-rank/js/major-trend-render.v3918_4.js','ln-rank/css/pages/selection-pool.css','functions/_lib/fenxi-session.js'];
const bad=['fenxi/','functions/fenxi/','functions/_middleware.js']; const errors=[];
for(const f of must) if(!fs.existsSync(f)) errors.push(`缺少：${f}`); for(const f of bad) if(fs.existsSync(f)) errors.push(`不应包含：${f}`);
const selection=fs.readFileSync('ln-rank/selection-pool.html','utf8'); const js=fs.readFileSync('ln-rank/js/selection-pool.v3918_4.js','utf8');
for(const s of ['确认考生分数','整理自选专业顺序','检查这套方案','生成报告','feishuSelectionStatus']) if(!selection.includes(s)) errors.push(`自选页缺少流程节点：${s}`);
if(!js.includes("lnRank.selectionPool.candidateScore'")) errors.push('未使用稳定 candidateScore key'); if(!js.includes('lnRank.selectionPool.candidateScore.v3959')) errors.push('未兼容旧 candidateScore key');
for(const w of ['冲一冲','前段尝试','主要承接','后段补充']) if(js.includes(w)) errors.push(`自选页仍残留旧术语：${w}`);
if(errors.length){console.error(errors.join('
'));process.exit(1)} console.log('ln-rank v3.9.18.4 release check passed');
