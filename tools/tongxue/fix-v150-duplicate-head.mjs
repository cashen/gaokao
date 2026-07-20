import{readFile,writeFile}from'node:fs/promises';
const path='tongxue/index.html';
let html=await readFile(path,'utf8');
const build='<meta name="tongxue-build" content="tongxue-v150-region-20260617">';
const importMap='<script type="importmap">{"imports":{"/tongxue/data/school-name-resolver.js":"/tongxue/data/school-name-resolver-v150.js?v=150","/tongxue/data/school-entities-v130.js":"/tongxue/data/school-entities-v150.js?v=150"}}</script>';
html=collapse(html,build);
html=collapse(html,importMap);
if(count(html,build)!==1||count(html,importMap)!==1)throw new Error('v1.5.0 页面头部版本配置无法安全去重');
await writeFile(path,html,'utf8');
console.log('TONGXUE_V150_HEAD_DEDUPED');
function collapse(source,value){const lines=source.split('\n'),out=[];let seen=false;for(const line of lines){if(line===value){if(seen)continue;seen=true;}out.push(line);}return out.join('\n');}
function count(source,value){return source.split(value).length-1;}
