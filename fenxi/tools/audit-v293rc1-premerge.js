#!/usr/bin/env node
const fs=require('fs'); const path=require('path');
const root=path.resolve(__dirname,'..');
const idx=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=[...idx.matchAll(/<link[^>]+href="\.\/assets\/([^"]+\.css)\?/g)].map(m=>m[1]);
const arrMatch=idx.match(/const filesRulesBundled=(\[.*?\]);/);
const files=arrMatch?JSON.parse(arrMatch[1]):[];
const jsAssets=fs.readdirSync(path.join(root,'assets')).filter(f=>f.endsWith('.js'));
const report={
  version:'V2.93RC1',
  indexCssCount:css.length,
  bootJsCount:files.length,
  assetsJsTotal:jsAssets.length,
  mergedBundles:files.filter(f=>/v293rc1/.test(f)),
  legacyPatchInDefault:files.filter(f=>/v292rc1|v292rc2|frontfix|mdfix|errorfix/.test(f)),
  css
};
console.log(JSON.stringify(report,null,2));
