import { readFile } from 'node:fs/promises';

const failures=[];
const html=await readFile('tongxue/index.html','utf8');
const wrapper=await readFile('tongxue/app/tongxue-performance-v158.js','utf8');
const share=await readFile('tongxue/share/tongxue-share-v130.js','utf8');
const canvasSource=await readFile('tongxue/share/tongxue-share-canvas-v113.js','utf8');
const qr=await readFile('tongxue/share/tongxue-share-qr-v113.js','utf8');

await import('node:fs/promises').then(async({writeFile})=>{
  const entities=await readFile('shared/resources/schools/school-identity-center.js','utf8');
  await writeFile('/tmp/school-entities-v150.mjs',entities);
  await writeFile('/tmp/tongxue-share-v113.mjs',share.replace("from'./tongxue-share-canvas-v113.js?v=130'","from'./tongxue-share-canvas-v113.mjs'").replace("from'../data/school-entities-v130.js'","from'./school-entities-v150.mjs'"));
  await writeFile('/tmp/tongxue-share-canvas-v113.mjs',canvasSource.replace("from './tongxue-share-qr-v113.js'","from './tongxue-share-qr-v113.mjs'"));
  await writeFile('/tmp/tongxue-share-qr-v113.mjs',qr);
});

const {buildShareUrl,chooseShareReviews,buildShareCacheKey}=await import('file:///tmp/tongxue-share-v113.mjs');
const canonical=buildShareUrl('https://gaokao.powers.org.cn/tongxue.html?old=1#x','哈尔滨工业大学（威海）','hit-weihai');
const sampleReviews=Array.from({length:8},(_,i)=>({id:i+1,content:'评论'+(i+1)}));
const pureChecks={
  canonicalUrl:canonical.includes('/tongxue/?school=')&&canonical.includes('entity=hit-weihai'),
  featuredThree:chooseShareReviews(sampleReviews,'featured').length===3,
  fullCurrent:chooseShareReviews(sampleReviews,'full').length===8,
  cacheVariant:buildShareCacheKey({mode:'recent_reviews',school:'辽宁大学',reviews:sampleReviews},'featured')!==buildShareCacheKey({mode:'recent_reviews',school:'辽宁大学',reviews:sampleReviews},'full')
};
for(const [name,passed] of Object.entries(pureChecks))if(!passed)failures.push(name);

class FakeContext{
  constructor(){this.fillStyle='';this.strokeStyle='';this.font='';this.lineWidth=1;this.textAlign='left';}
  fillRect(){} fillText(){} beginPath(){} moveTo(){} lineTo(){} stroke(){} arcTo(){} closePath(){} fill(){} drawImage(){}
  measureText(value){return{width:String(value||'').length*31};}
}
class FakeCanvas{
  constructor(){this.width=0;this.height=0;this.context=new FakeContext();}
  getContext(){return this.context;}
  toBlob(callback){callback(new Blob(['png'],{type:'image/png'}));}
}
globalThis.window={qrcode(){return{addData(){},make(){},getModuleCount(){return 21;},isDark(row,col){return (row+col)%3===0;}};}};
globalThis.document={fonts:{ready:Promise.resolve()},createElement(type){if(type==='canvas')return new FakeCanvas();return{};},head:{append(){}}};
if(typeof globalThis.File!=='function')globalThis.File=class File extends Blob{constructor(parts,name,options={}){super(parts,options);this.name=name;this.lastModified=Date.now();}};
const originalCreateObjectURL=URL.createObjectURL;
URL.createObjectURL=()=> 'blob:verification';
const {generateShareAssets}=await import('file:///tmp/tongxue-share-canvas-v113.mjs');
const longItems=Array.from({length:130},(_,i)=>`第${i+1}条很长的学校体验摘要，用于验证文字自动换行和多页图片生成，不允许内容溢出画布。`);
const summaryAssets=await generateShareAssets({mode:'ai_summary',school:'超长摘要测试大学',meta:['辽宁 · 沈阳','本科'],groups:[{title:'综合印象',attention:false,items:longItems}],reviews:[],shareUrl:canonical},'featured');
const longReviews=Array.from({length:18},(_,i)=>({author:'匿名同学',date:'2026/07/19',tags:['主校区'],content:`第${i+1}条评论：`+'校园生活与学习体验。'.repeat(90),rating:'4.2',dimensions:['宿舍 4.0','就业 4.3'],social:['👍 3 赞']}));
const reviewAssets=await generateShareAssets({mode:'recent_reviews',school:'长评论测试大学',meta:['辽宁 · 沈阳','18 条公开评价'],groups:[],reviews:longReviews,shareUrl:canonical},'full');
const executionChecks={
  summaryMultiPage:summaryAssets.files.length>1,
  reviewMultiPage:reviewAssets.files.length>1,
  pngFiles:[...summaryAssets.files,...reviewAssets.files].every(file=>file.type==='image/png'&&file.size>0),
  safeHeight:[...summaryAssets.files,...reviewAssets.files].length<100
};
if(originalCreateObjectURL)URL.createObjectURL=originalCreateObjectURL;
for(const [name,passed] of Object.entries(executionChecks))if(!passed)failures.push(name);

const checks={
  pageVersion:html.includes('同学你好 v1.5.8')&&html.includes('./app/tongxue-performance-v158.js?v=158'),
  newCopy:html.includes('找学校，看看大家怎么说')&&html.includes('输入学校、简称或地区')&&html.includes('看同学怎么说')&&html.includes('tongxue-logo-primary-v1.webp'),
  keepsQueryRuntime:wrapper.includes('tongxue-performance-v112.js?v=156'),
  installsShare:wrapper.includes('installTongxueShare'),
  installsPortrait:wrapper.includes('tongxue-school-portrait-v121.js?v=156')&&wrapper.includes('installSchoolPortrait'),
  button:share.includes('生成分享图'),
  variants:share.includes('分享精选图')&&share.includes('完整评论长图'),
  nativeShare:share.includes('navigator.share')&&share.includes('navigator.canShare'),
  saveFallback:share.includes('保存图片')&&share.includes('长按预览图'),
  localOnly:share.includes('图片在本机生成，不会上传'),
  canvas:canvasSource.includes('const W=1080,H=3600')&&canvasSource.includes('canvas.toBlob'),
  simpleBrand:canvasSource.includes("fillText('同学你好'")&&!canvasSource.includes('Gaokao OS'),
  multiPage:canvasSource.includes('${index+1}/${total}'),
  qr:qr.includes('qrcode-generator/1.4.4')&&canvasSource.includes('扫码查看最新内容'),
  currentReviews:share.includes("shell.querySelectorAll('.review-card')"),
  shareUrl:share.includes('history.replaceState')&&share.includes('entityId')&&canonical.includes('entity=hit-weihai'),
  accessibility:share.includes('aria-modal')&&share.includes("event.key==='Escape'"),
  identityOwner:entitiesOwnerCheck(await readFile('tongxue/data/school-entities-v150.js','utf8'))
};
for(const [name,passed] of Object.entries(checks))if(!passed)failures.push(name);
console.log('TONGXUE_SHARE_RESULTS '+JSON.stringify({checks,pureChecks,executionChecks,summaryPages:summaryAssets.files.length,reviewPages:reviewAssets.files.length,failures}));
if(failures.length)process.exitCode=1;

function entitiesOwnerCheck(source){return source.includes('shared/resources/schools/school-identity-center.js')&&!source.includes("E('dlut-panjin'");}
