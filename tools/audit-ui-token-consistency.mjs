import fs from 'node:fs';
const css = fs.readFileSync('ln-rank/css/tokens/ui-consistency.v3935.css','utf8') + fs.readFileSync('ln-rank/css/components/parent-guidance-contract.v3935.css','utf8');
const required = ['--ln-title-xl','--ln-primary','--ln-body','@media (max-width: 430px)','aux-background-entry','report-view'];
const missing = required.filter(x => !css.includes(x));
const out = { ok: missing.length === 0, missing, checked: required };
fs.writeFileSync('ln-rank/v3.9.35-ui-token-consistency-audit.json', JSON.stringify(out,null,2));
if (!out.ok) process.exit(1);
