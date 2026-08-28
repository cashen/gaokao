import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const targets=['functions/_lib','functions/api','ln-rank/js/feature/diagnose'];
const bad=[];
const patterns=[/方案解读解读/,/主要参考参考/,/规则稳妥补充版/,/命中已收录学科/,/行业特色相关：/,/录取概率/,/稳了/,/必录/,/捡漏/,/王牌/,/优势专业/,/强校/,/能上/,/保底/];
function walk(dir){ for (const e of fs.readdirSync(dir,{withFileTypes:true})) { const p=path.join(dir,e.name); if(e.isDirectory()) walk(p); else if(/\.(js|html|md)$/.test(e.name)){ const s=fs.readFileSync(p,'utf8'); for(const pat of patterns){ if(pat.test(s)) bad.push(`${path.relative(root,p)} :: ${pat}`); pat.lastIndex=0;} } } }
for (const t of targets) if(fs.existsSync(path.join(root,t))) walk(path.join(root,t));
// Allow policy code to mention words only inside the gate definition itself.
const allowed = [
  'functions/_lib/diagnosis-human-copy-gate.js',
  'functions/_lib/advisor-ai-prompt.js',
  'functions/_lib/ai-card-prompt.js',
  'functions/_lib/advisor-ai-validator.js',
  'functions/_lib/path-ai-prompt.js',
  'functions/_lib/path-ai-output-schema.js',
  'functions/_lib/kb/copy-policy-kb.generated.js',
  'functions/_lib/kb/kb-source-registry.js',
  'functions/api/ln-rank-self-check.js'
];
const filtered=bad.filter(x=>!allowed.some(a=>x.startsWith(a)));
if(filtered.length){ console.error(JSON.stringify({ok:false, findings:filtered.slice(0,80)},null,2)); process.exit(1); }
console.log(JSON.stringify({ok:true},null,2));
