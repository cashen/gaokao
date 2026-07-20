import { performance } from 'node:perf_hooks';
import { readFile } from 'node:fs/promises';

const [runtime,ui,resolver,builder,indexText]=await Promise.all([
  readFile('tongxue/app/tongxue-performance-v112.js','utf8'),
  readFile('tongxue/app/tongxue-school-entity-ui-v141.js','utf8'),
  readFile('tongxue/data/school-name-resolver.js','utf8'),
  readFile('tools/tongxue/build-school-initial-index-v141.mjs','utf8'),
  readFile('tongxue/data/school-search-index.20260617.json','utf8')
]);
const failures=[];
const check=(label,passed)=>{if(!passed)failures.push(label);};
check('v141 UI 不得安装 MutationObserver',!ui.includes('MutationObserver'));
check('运行时不得现场计算拼音',!resolver.includes('Intl.Collator')&&!resolver.includes('createSchoolInitialCodes')&&!resolver.includes('school-pinyin-initials-v14'));
check('有限两字母桶',resolver.includes('initialBucketIndex')&&!resolver.includes('initialPrefixIndex')&&!resolver.includes('for (let size=2'));
check('单字母快速返回',resolver.includes("if (code.length < 2) return cacheSearch"));
check('中文输入法开始保护',runtime.includes("addEventListener('compositionstart'")&&runtime.includes('inputComposing=true'));
check('中文输入法结束恢复',runtime.includes("addEventListener('compositionend'")&&runtime.includes('inputComposing=false'));
check('组合输入不触发联想',runtime.includes('event.isComposing||inputComposing'));
check('候选标签直接渲染',runtime.includes("return'首字母代码'")&&runtime.includes("return'首字母联想'"));
check('构建脚本保留明确简称',builder.includes("'辽宁科技大学':['lkd']"));
const payload=JSON.parse(indexText);
check('索引数量完整',payload.count===2952&&payload.schools.length===2952);
check('索引是四字段代码数据',payload.schools.every(row=>Array.isArray(row[3])&&row[3].length));
const started=performance.now();
for(let i=0;i<10000;i+=1){const value=['d','l','ln','lnk','lnkj','lnkjd','lnkjdx','lkd'][i%8];value.normalize('NFKC').toLowerCase().replace(/[^a-z0-9]+/g,'');}
const normalizeMs=performance.now()-started;
check('连续输入轻量预算',normalizeMs<80);
console.log('TONGXUE_INPUT_FLUENCY_V141 '+JSON.stringify({normalizeMs:Number(normalizeMs.toFixed(3)),failures}));
if(failures.length)process.exitCode=1;
