import { readFile, writeFile } from 'node:fs/promises';

await patchRuntime();
await patchPage();
await patchChangelog();
await patchDirectoryTest();
await patchShareTest();
await writeFile('tools/tongxue/verify-school-initials-v140.mjs',"await import('./verify-school-initials-v141.mjs');\n",'utf8');
console.log('TONGXUE_V141_MIGRATION_OK');

async function patchRuntime(){
  const path='tongxue/app/tongxue-performance-v112.js';
  let source=await readFile(path,'utf8');
  source=replaceOnce(source,
    "let resolver=null,resolverError=null,suggestions=[],activeSuggestion=-1,selectedOfficialName='',inputTimer=0,currentResolution=null,activeReviewState=null;",
    "let resolver=null,resolverError=null,suggestions=[],activeSuggestion=-1,selectedOfficialName='',inputTimer=0,currentResolution=null,activeReviewState=null,inputComposing=false;",
    '运行时状态');
  const oldInput=`schoolInput.addEventListener('input',()=>{\n  selectedOfficialName='';\n  currentResolution=null;\n  activeReviewState=null;\n  hideResolveHint();\n  updateButtonState();\n  clearTimeout(inputTimer);\n  inputTimer=setTimeout(updateSuggestions,110);\n});\nschoolInput.addEventListener('focus',()=>{if(schoolInput.value.trim().length>=2)updateSuggestions();});`;
  const newInput=`function resetSchoolInputState(){\n  selectedOfficialName='';\n  currentResolution=null;\n  activeReviewState=null;\n  hideResolveHint();\n  updateButtonState();\n}\nfunction scheduleSuggestions(){\n  clearTimeout(inputTimer);\n  if(!inputComposing)inputTimer=setTimeout(updateSuggestions,110);\n}\nschoolInput.addEventListener('compositionstart',()=>{inputComposing=true;clearTimeout(inputTimer);closeSuggestions();});\nschoolInput.addEventListener('compositionend',()=>{inputComposing=false;resetSchoolInputState();scheduleSuggestions();});\nschoolInput.addEventListener('input',event=>{\n  if(event.isComposing||inputComposing)return;\n  resetSchoolInputState();\n  scheduleSuggestions();\n});\nschoolInput.addEventListener('focus',()=>{if(!inputComposing&&schoolInput.value.trim().length>=2)updateSuggestions();});`;
  source=replaceOnce(source,oldInput,newInput,'输入事件');
  source=replaceOnce(source,"schoolInput.addEventListener('keydown',event=>{","schoolInput.addEventListener('keydown',event=>{\n  if(event.isComposing||inputComposing)return;",'键盘输入法保护');
  source=replaceOnce(source,"if(!resolver||query.length<2){closeSuggestions();return;}","if(inputComposing||!resolver||query.length<2){closeSuggestions();return;}",'候选输入法保护');
  const oldLabel="function matchTypeLabel(type){if(String(type).includes('official_exact'))return'正式校名';if(String(type).includes('alias_exact'))return'常用简称';if(String(type).includes('prefix'))return'名称匹配';if(String(type).includes('contains'))return'名称相近';if(String(type).includes('fuzzy'))return'可能是';if(type==='generic_shortcut')return'简称候选';return'学校候选';}";
  const newLabel="function matchTypeLabel(type){const value=String(type||'');if(value.includes('initial_exact'))return'首字母代码';if(value.includes('initial_prefix')||value.includes('initial_match'))return'首字母联想';if(value.includes('official_exact'))return'正式校名';if(value.includes('alias_exact'))return'常用简称';if(value.includes('prefix'))return'名称匹配';if(value.includes('contains'))return'名称相近';if(value.includes('fuzzy'))return'可能是';if(type==='generic_shortcut')return'简称候选';return'学校候选';}";
  source=replaceOnce(source,oldLabel,newLabel,'候选标签');
  await writeFile(path,source,'utf8');
}

async function patchPage(){
  const path='tongxue/index.html';
  let source=await readFile(path,'utf8');
  source=source.replace('同学你好 v1.4.0 · 更新于 2026-07-20 · 查看更新记录','同学你好 v1.4.1 · 更新于 2026-07-20 · 查看更新记录');
  source=source.replace('./app/tongxue-performance-v140.js?v=140','./app/tongxue-performance-v141.js?v=141');
  if(!source.includes('同学你好 v1.4.1')||!source.includes('tongxue-performance-v141.js?v=141'))throw new Error('页面版本迁移失败');
  await writeFile(path,source,'utf8');
}

async function patchChangelog(){
  const path='tongxue/changelog.html';
  let source=await readFile(path,'utf8');
  const marker='<main class="timeline">';
  const entry='\n    <article class="release"><div class="release-head"><div><span class="badge">当前版本</span><h2>v1.4.1 · 输入流畅性与代码语义修复</h2></div><time class="date">2026-07-20</time></div><ul><li>修复输入单字母或短首字母时页面卡死，删除会自我触发的候选框 DOM 监听。</li><li>学校拼音首字母改为构建阶段预生成，浏览器只读取代码并查询有限桶，不再现场计算全国高校拼音。</li><li>明确区分精确代码和前缀联想：lkd、lnkjdx、lnkjxy 可直达，lnkj 展示辽宁科技大学与辽宁科技学院候选。</li><li>单字母不搜索，未知字母不硬猜；增加中文输入法组合保护和连续输入性能回归。</li></ul></article>';
  if(!source.includes('v1.4.1 · 输入流畅性与代码语义修复'))source=replaceOnce(source,marker,marker+entry,'更新记录新增 v1.4.1');
  source=source.replace('<div><span class="badge">当前版本</span><h2>v1.4.0 · 拼音首字母联想</h2></div>','<h2>v1.4.0 · 拼音首字母联想</h2>');
  await writeFile(path,source,'utf8');
}

async function patchDirectoryTest(){
  const path='tools/tongxue/verify-directory.mjs';
  let source=await readFile(path,'utf8');
  source=source.replace("readFile('tongxue/app/tongxue-performance-v140.js','utf8')","readFile('tongxue/app/tongxue-performance-v141.js','utf8')");
  source=source.replace("'./app/tongxue-performance-v140.js?v=140'","'./app/tongxue-performance-v141.js?v=141'");
  source=source.replace("'同学你好 v1.4.0 · 更新于 2026-07-20'","'同学你好 v1.4.1 · 更新于 2026-07-20'");
  source=source.replace("requireText(changelog,'v1.4.0 · 拼音首字母联想','更新记录 v1.4.0');","requireText(changelog,'v1.4.1 · 输入流畅性与代码语义修复','更新记录 v1.4.1');\nrequireText(changelog,'v1.4.0 · 拼音首字母联想','更新记录 v1.4.0');");
  source=source.replace("if(!(changelog.indexOf('v1.4.0')<changelog.indexOf('v1.3.0')&&changelog.indexOf('v1.3.0')<changelog.indexOf('v1.2.0')))failures.push('更新记录未按倒序排列');","if(!(changelog.indexOf('v1.4.1')<changelog.indexOf('v1.4.0')&&changelog.indexOf('v1.4.0')<changelog.indexOf('v1.3.0')&&changelog.indexOf('v1.3.0')<changelog.indexOf('v1.2.0')))failures.push('更新记录未按倒序排列');");
  source=source.replace("\"installShareMetadataStabilizer('v1.4.0')\"","\"installShareMetadataStabilizer('v1.4.1')\"");
  source=source.replace("\"tongxue-performance-v112.js?v=140\"","\"tongxue-performance-v112.js?v=141\"");
  source=source.replace("if(!resolver.includes(\"school-pinyin-initials-v140.js\"))failures.push('首字母索引未接入解析器');","if(resolver.includes('school-pinyin-initials-v140.js')||resolver.includes('school-pinyin-initials-v141.js')||resolver.includes('Intl.Collator')||resolver.includes('createSchoolInitialCodes'))failures.push('浏览器运行时仍在计算拼音首字母');\nif(!resolver.includes('initialBucketIndex')||resolver.includes('initialPrefixIndex'))failures.push('首字母索引不是有限两字母桶');");
  await writeFile(path,source,'utf8');
}

async function patchShareTest(){
  const path='tools/tongxue/verify-share.mjs';
  let source=await readFile(path,'utf8');
  source=source.replace("readFile('tongxue/app/tongxue-performance-v140.js','utf8')","readFile('tongxue/app/tongxue-performance-v141.js','utf8')");
  source=source.replace("html.includes('同学你好 v1.4.0')&&html.includes('./app/tongxue-performance-v140.js?v=140')","html.includes('同学你好 v1.4.1')&&html.includes('./app/tongxue-performance-v141.js?v=141')");
  source=source.replace("wrapper.includes('tongxue-performance-v112.js?v=140')","wrapper.includes('tongxue-performance-v112.js?v=141')");
  await writeFile(path,source,'utf8');
}

function replaceOnce(source,from,to,label){
  if(source.includes(to))return source;
  const first=source.indexOf(from);
  if(first<0)throw new Error(`无法定位${label}`);
  if(source.indexOf(from,first+from.length)>=0)throw new Error(`${label}出现多次`);
  return source.slice(0,first)+to+source.slice(first+from.length);
}
