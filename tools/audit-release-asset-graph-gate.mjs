import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const ln = path.join(root, 'ln-rank');
const htmls = ['index.html','local-mainline.html','211-mainline.html','selection-pool.html','major-trend-2025.html','self-check.html'];
const missing=[];
for (const h of htmls) {
  const p=path.join(ln,h); if (!fs.existsSync(p)) { missing.push(h); continue; }
  const s=fs.readFileSync(p,'utf8');
  for (const m of s.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css))(?:\?[^"']*)?["']/g)) {
    const rel=m[1].replace(/^\//, '');
    const fp=path.join(root, rel);
    if (!fs.existsSync(fp)) missing.push(`${h} -> ${rel}`);
    else {
      const head=fs.readFileSync(fp,'utf8').trimStart().slice(0,20).toLowerCase();
      if (head.startsWith('<!doctype') || head.startsWith('<html')) missing.push(`${h} -> ${rel} returned html`);
    }
  }
}
if (missing.length) { console.error(JSON.stringify({ok:false, missing},null,2)); process.exit(1); }
console.log(JSON.stringify({ok:true, checked:htmls.length},null,2));
