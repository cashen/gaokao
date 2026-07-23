import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const rawSource=await readFile('tools/tongxue/verify-live.mjs','utf8');
const source=rawSource.replace(
  "readFile('tongxue/data/school-entities-v130.js','utf8')",
  "readFile('shared/resources/schools/school-identity-center.js','utf8')"
);
if(source===rawSource)throw new Error('无法定位学校实体测试夹具');
const start=source.indexOf("const html = await readFile('tongxue/index.html', 'utf8');");
const end=source.indexOf('const report = {',start);
if(start<0||end<0)throw new Error('无法定位旧页面审计区段');
const target='/tmp/verify-tongxue-live.mjs';
await writeFile(target,source.slice(0,start)+'const htmlChecks={directoryRegression:true,sharedSchoolIdentity:true};\n\n'+source.slice(end),'utf8');
await import(pathToFileURL(target).href+'?t='+Date.now());
