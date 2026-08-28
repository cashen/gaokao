import fs from 'node:fs';
const must=['ln-rank/index.html','ln-rank/selection-pool.html','ln-rank/self-check.html','ln-rank/major-trend-2025.html','ln-rank/js/app.v3918_5.js','ln-rank/js/selection-pool.v3918_5.js','ln-rank/js/self-check.v3918_5.js','ln-rank/js/major-trend-render.v3918_5.js','ln-rank/css/pages/selection-pool.css'];
const bad=['fenxi/','functions/fenxi/','functions/_middleware.js'];
const errors=[];
for(const f of must) if(!fs.existsSync(f)) errors.push(`缺少：${f}`);
for(const f of bad) if(fs.existsSync(f)) errors.push(`不应包含：${f}`);
const html=fs.readFileSync('ln-rank/selection-pool.html','utf8');
const js=fs.readFileSync('ln-rank/js/selection-pool.v3918_5.js','utf8');
for(const s of ['检查并生成报告','selectionActionHint','ln-selection-analysis-panel','feishuSelectionStatus']) if(!html.includes(s)) errors.push(`自选页缺少操作流节点：${s}`);
if(html.indexOf('id="feishuSelectionStatus"')>html.indexOf('id="analysisResult"')) errors.push('报告状态仍在诊断结果后方');
if(!js.includes('renderActionPanelState')) errors.push('缺少操作卡状态提示');
if(!js.includes('系统将先检查这套方案，再生成解读版报告')) errors.push('解读版报告缺少先检查提示');
for(const w of ['payload','raw','debug','model','JSON']) if(html.includes(w)) errors.push(`家长页面残留工程词：${w}`);
if(errors.length){ console.error(errors.join('\n')); process.exit(1); }
console.log('ln-rank v3.9.18.5 release check passed');
