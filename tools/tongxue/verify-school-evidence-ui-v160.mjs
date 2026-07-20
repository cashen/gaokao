import { readFile } from 'node:fs/promises';

const [page,entry,loader,view,style,core,api,headers,changelog,workflow]=await Promise.all([
  readFile('tongxue/index.html','utf8'),
  readFile('tongxue/app/tongxue-performance-v160.js','utf8'),
  readFile('tongxue/portrait/tongxue-school-portrait-v160.js','utf8'),
  readFile('tongxue/portrait/tongxue-school-portrait-view-v160.js','utf8'),
  readFile('tongxue/portrait/tongxue-school-portrait-style-v160.js','utf8'),
  readFile('functions/_lib/tongxue-school-portrait-core.js','utf8'),
  readFile('functions/api/tongxue-school-portrait.js','utf8'),
  readFile('_headers','utf8'),
  readFile('tongxue/changelog.html','utf8'),
  readFile('.github/workflows/tongxue-live-verification.yml','utf8')
]);
const failures=[];
const check=(label,passed)=>{if(!passed)failures.push(label);};
const count=(source,value)=>source.split(value).length-1;
const build='<meta name="tongxue-build" content="tongxue-v160-evidence-20260720">';

check('页面版本',page.includes('同学你好 v1.6.0')&&page.includes('./app/tongxue-performance-v160.js?v=160'));
check('构建标识唯一',count(page,build)===1);
check('证据说明',page.includes('样本、共识、分歧和待核验事项'));
check('入口版本',entry.includes("EXPECTED_BUILD='tongxue-v160-evidence-20260720'")&&entry.includes("tongxue-performance-v112.js?v=160"));
check('证据画像安装',entry.includes("tongxue-school-portrait-v160.js?v=160")&&entry.includes("pageVersion:'v1.6.0'"));
check('地域逻辑保留',entry.includes('installRegionUi();')&&entry.includes('installSchoolEntityUi();'));
check('画像 API 版本校验',loader.includes("data.version!==VERSION")&&loader.includes("data.evidence?.version!==VERSION"));
check('缓存模式隔离',loader.includes("schema:'160'")&&loader.includes("const cacheKey=VERSION+'|'+school"));
check('结果观察器无子树自反馈',loader.includes("observe(result,{childList:true})")&&!loader.includes("observe(result,{childList:true,subtree:true})"));
check('地域结果不加载画像',loader.includes("result.dataset.regionOwned==='1'"));
check('共识分歧界面',view.includes('共识与分歧')&&view.includes('相对一致')&&view.includes('分化明显'));
check('讨论信号边界',view.includes('高频讨论信号')&&view.includes('不表示事实已经确认'));
check('核验清单界面',view.includes('报考前核验清单')&&view.includes('把焦虑转成可以询问和确认的事项'));
check('原画像增强而非替换',view.includes('renderBasePortrait(mount,data,pageVersion)'));
check('移动端单列',style.includes('@media(max-width:700px)')&&style.includes('.portrait-evidence-grid,.portrait-topic-grid{grid-template-columns:1fr}'));
check('核心证据结构',core.includes("version:'v1.6.0'")&&core.includes('buildEvidenceInterpretation')&&core.includes('buildVerificationChecklist'));
check('不复制评论正文到主题信号',core.includes('sourceUrls')&&!core.includes('snippet:'));
check('官方事实边界',core.includes('不等于学校官方事实或统一排名'));
check('API 升级',api.includes("const API_VERSION = 'v1.6.0';")&&api.includes("url.searchParams.set('schema', API_VERSION)"));
check('版本资源缓存',headers.includes('/tongxue/app/tongxue-performance-v160.js')&&headers.includes('/tongxue/portrait/tongxue-school-portrait-v160.js')&&headers.includes('immutable'));
check('更新记录',changelog.includes('v1.6.0 · 证据解释层')&&changelog.indexOf('v1.6.0')<changelog.indexOf('v1.5.0'));
check('工作流执行证据回归',workflow.includes('verify-school-evidence-v160.mjs')&&workflow.includes('verify-school-evidence-ui-v160.mjs'));

console.log('TONGXUE_EVIDENCE_UI_V160_RESULTS '+JSON.stringify({failures}));
if(failures.length)process.exitCode=1;
