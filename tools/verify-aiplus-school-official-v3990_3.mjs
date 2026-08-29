import './verify-aiplus-school-official-cache-v3990_3.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  AI_SCHOOL_OFFICIAL_ORIGIN,AI_SCHOOL_OFFICIAL_READER_ORIGIN,AI_SCHOOL_OFFICIAL_SOURCE_VERSION,AI_SCHOOL_OFFICIAL_TRANSPORT_VERSION,
  schoolOfficialTopic,schoolOfficialTopicLabel,htmlToOfficialPlainText,extractOfficialEvidenceExcerpt,buildOfficialDeterministicSummary,extractOfficialSchoolSearchMatch,extractOfficialSchoolNavigation,
  extractLatestCharterLink,loadOfficialSchoolEvidence
} from '../functions/_lib/ai/school-official-source.js';
import {deterministicCommand} from '../functions/_lib/ai/command-interpreter.js';
import {AI_SCHOOL_PROFILE_SUPPLEMENT_VERSION,AI_BAIDU_BAIKE_ORIGIN,AI_BAIDU_BAIKE_CARD_API,directorySchoolProfileSupplement,extractBaiduBaikeCard,extractBaiduBaikeProfile,loadSchoolProfileSupplement} from '../functions/_lib/ai/school-profile-supplement-source.js';
import {createAiWorkspace} from '../shared/ai/ai-workspace-contract.v3992_0.js';
import {runSchoolExperience} from '../functions/_lib/ai/tool-registry.js';
import {SCHOOL_PROFILE_SOURCE_META,resolveSchoolProfile} from '../shared/resources/schools/school-profile-center.js';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=relative=>fs.readFileSync(path.join(ROOT,relative),'utf8');

assert.equal(AI_SCHOOL_OFFICIAL_SOURCE_VERSION,'ai-school-official-source-v3990_3');
assert.equal(AI_SCHOOL_OFFICIAL_ORIGIN,'https://gaokao.chsi.com.cn');
assert.equal(AI_SCHOOL_OFFICIAL_READER_ORIGIN,'https://r.jina.ai');
assert.equal(AI_SCHOOL_OFFICIAL_TRANSPORT_VERSION,'chsi-only-reader-v3990_3');
assert.equal(AI_SCHOOL_PROFILE_SUPPLEMENT_VERSION,'ai-school-profile-supplement-v0.02');
assert.equal(AI_BAIDU_BAIKE_ORIGIN,'https://baike.baidu.com');
assert.equal(AI_BAIDU_BAIKE_CARD_API,'https://baike.baidu.com/api/openapi/BaikeLemmaCardApi');
assert.equal(schoolOfficialTopic('宿舍和食堂怎么样'),'living');
assert.equal(schoolOfficialTopic('2026招生章程要注意什么'),'charter');
assert.equal(schoolOfficialTopic('录取时有没有专业级差'),'admission_rule');
assert.equal(schoolOfficialTopic('学费多少钱'),'fees');
assert.equal(schoolOfficialTopicLabel('living'),'食宿条件');

const searchFixture=`<!doctype html><html><body>
<a href="/sch/schoolInfo--schId-999.dhtml">辽宁科技大学</a>
<a href="/sch/schoolInfo--schId-124,categoryId-1167668,mindex-1.dhtml"><span>辽宁石油化工大学</span></a>
</body></html>`;
const searchMatch=extractOfficialSchoolSearchMatch(searchFixture,'辽宁石油化工大学');
assert.equal(searchMatch?.schId,'124');
assert.equal(searchMatch?.name,'辽宁石油化工大学');
assert.ok(searchMatch?.href.startsWith(AI_SCHOOL_OFFICIAL_ORIGIN));

const homeFixture=`<!doctype html><html><body>
<nav>
<a href="/sch/schoolInfo--schId-124,categoryId-1167668,mindex-1.dhtml">学校简介</a>
<a href="/sch/schoolInfo--schId-124,categoryId-1167668,mindex-4.dhtml">录取规则</a>
<a href="/sch/schoolInfo--schId-124,categoryId-1167668,mindex-6.dhtml">食宿条件</a>
</nav>
<div>学校信息更新时间：2026-05-28 16:54</div><p>这是学校官方介绍正文，用于模拟阳光高考院校页面的可读正文。正式运行时不会使用这里的测试文本。</p>
</body></html>`;
const nav=extractOfficialSchoolNavigation(homeFixture,'124');
assert.ok(nav.some(item=>item.text==='学校简介'));
assert.ok(nav.some(item=>item.text==='录取规则'));
assert.ok(nav.some(item=>item.text==='食宿条件'));
assert.match(htmlToOfficialPlainText(homeFixture),/学校官方介绍正文/);
assert.doesNotMatch(htmlToOfficialPlainText('<script>bad()</script><p>保留</p>'),/bad\(\)/);
const introFixture=`<nav>首页 院校库 专业库</nav><h1>学校简介</h1><p>测试大学始建于1950年，是一所以工科为主、工理经管文法艺等学科协调发展的本科院校。</p><p>学校坚持人才培养中心地位，现有多个本科专业和教学单位。</p><footer>学籍查询 学历查询 Copyright © 2003-2026</footer>`;
const introExcerpt=extractOfficialEvidenceExcerpt(introFixture,'测试大学','profile');
assert.match(introExcerpt,/始建于1950年/);
assert.match(introExcerpt,/人才培养中心地位/);
assert.doesNotMatch(introExcerpt,/学籍查询|Copyright/);
const detailFallback=buildOfficialDeterministicSummary({school:'测试大学',topic:'profile',topicLabel:'学校简介',coverage:'official_detail',evidenceText:introFixture});
assert.match(detailFallback,/根据阳光高考“学校简介”公开正文/);
assert.match(detailFallback,/始建于1950年/);
const cardFallback=buildOfficialDeterministicSummary({school:'辽宁科技大学',topic:'profile',topicLabel:'学校简介',coverage:'official_search_card',facts:{schoolCode:'10146',location:'辽宁',supervisor:'辽宁省教育厅',level:'本科',satisfaction:'4.2'}});
assert.match(cardFallback,/院校代码为10146/);
assert.match(cardFallback,/不是“学校简介”正文/);
assert.match(cardFallback,/不能据此补写学校沿革/);
const unavailableFallback=buildOfficialDeterministicSummary({school:'辽宁科技大学',topic:'profile',topicLabel:'学校简介',coverage:'official_source_unavailable',evidenceText:'本轮没有取得可验证的阳光高考官方资料，因此不生成学校事实结论。'});
assert.match(unavailableFallback,/没有取得可验证的阳光高考“学校简介”正文/);
assert.doesNotMatch(unavailableFallback,/根据阳光高考“学校简介”公开正文/);

const baikeFixture=`Title: 测试大学_百度百科\n\nURL Source: https://baike.baidu.com/item/%E6%B5%8B%E8%AF%95%E5%A4%A7%E5%AD%A6\n\nMarkdown Content:\n概述\n测试大学创建于1950年，是一所以工科为主、多学科协调发展的本科院校。学校形成了长期服务区域产业发展的办学传统。现有在校生20000人。\n## 历史沿革\n后续内容不进入概述。`;
const baikeProfile=extractBaiduBaikeProfile(baikeFixture,'测试大学');
assert.equal(baikeProfile.ok,true);
assert.match(baikeProfile.answer,/非官方补充/);
assert.match(baikeProfile.answer,/创建于1950年/);
assert.doesNotMatch(baikeProfile.answer,/在校生20000人/);
assert.equal(new URL(baikeProfile.source.sourceUrl).origin,AI_BAIDU_BAIKE_ORIGIN);
assert.match(baikeProfile.boundary,/不是学校官方来源/);
assert.equal(extractBaiduBaikeProfile(baikeFixture,'另一所大学').ok,false);
const baikeCard=extractBaiduBaikeCard({title:'测试大学',abstract:'测试大学创建于1950年，是一所以工科为主、多学科协调发展的本科院校。现有在校生20000人。',totalUrl:'http://baike.baidu.com/item/测试大学/100'},'测试大学');
assert.equal(baikeCard.ok,true);
assert.match(baikeCard.answer,/创建于1950年/);
assert.doesNotMatch(baikeCard.answer,/在校生20000人/);
assert.equal(baikeCard.source.sourceUrl,'https://baike.baidu.com/item/%E6%B5%8B%E8%AF%95%E5%A4%A7%E5%AD%A6/100');
const directoryProfile=directorySchoolProfileSupplement('沈阳师范大学');
assert.equal(directoryProfile.ok,true);
assert.match(directoryProfile.answer,/位于辽宁 · 沈阳的公办本科高校/);
assert.match(directoryProfile.answer,/主管部门为辽宁省/);
assert.equal(new URL(directoryProfile.source.sourceUrl).hostname,'www.moe.gov.cn');
assert.equal(SCHOOL_PROFILE_SOURCE_META.count,2952,'AIPLuS school identity baseline must cover the full Ministry directory');
const vocationalIdentity=resolveSchoolProfile('辽宁省交通高等专科学校');
assert.equal(vocationalIdentity?.educationLevel,'专科');
const vocationalProfile=directorySchoolProfileSupplement('辽宁省交通高等专科学校');
assert.equal(vocationalProfile.ok,true);
assert.match(vocationalProfile.answer,/位于辽宁 · 沈阳的公办专科高校/);
let directoryExternalFetches=0;const directoryLoaded=await loadSchoolProfileSupplement({school:'沈阳师范大学',fetchImpl:async()=>{directoryExternalFetches++;throw new Error('directory profile must not need an external request');}});
assert.equal(directoryLoaded.mode,'moe_directory_baseline');
assert.equal(directoryExternalFetches,0,'known schools must retain a deterministic profile when external sources are unavailable');
let baikeFetches=0;const baikeLoaded=await loadSchoolProfileSupplement({school:'测试大学',fetchImpl:async url=>{baikeFetches++;return{ok:true,status:200,headers:new Headers(),text:async()=>JSON.stringify({title:'测试大学',abstract:'测试大学创建于1950年，是一所以工科为主、多学科协调发展的本科院校。',totalUrl:'http://baike.baidu.com/item/测试大学/100'})};}});
assert.equal(baikeLoaded.ok,true);
assert.equal(baikeFetches,1);
const experienceKey='/api/tongxue-summary?school=%E6%B5%8B%E8%AF%95%E5%A4%A7%E5%AD%A6&page=1&topic=general';
const experienceContext=payload=>({request:new Request('https://example.test/api/ai/turn'),aiDeterministicToolResults:{[experienceKey]:{kind:'school_experience',key:experienceKey,url:experienceKey,status:200,payload}}});
const summaryExperience=await runSchoolExperience(experienceContext({ok:true,mode:'ai_summary',school:'测试大学',summary:'校园氛围摘要',reviews:[{content:'不应展示'}],source:{url:'https://srgaoxiao.com/school/test'}}),{school:'测试大学'});
assert.equal(summaryExperience.mode,'summary');
assert.equal(summaryExperience.summary,'校园氛围摘要');
assert.deepEqual(summaryExperience.reviews,[]);
const recentExperience=await runSchoolExperience(experienceContext({ok:true,mode:'recent_reviews',school:'测试大学',reviews:Array.from({length:6},(_,index)=>({id:String(index),content:`留言${index}`,createdAt:`2026-08-${12-index}`})),source:{url:'https://srgaoxiao.com/school/test'}}),{school:'测试大学'});
assert.equal(recentExperience.mode,'recent_reviews');
assert.equal(recentExperience.reviews.length,4);
assert.deepEqual(recentExperience.reviews.map(item=>item.content),['留言0','留言1','留言2','留言3']);
assert.match(recentExperience.boundary,/用户生成内容/);


const markdownFixture=`Title: 辽宁石油化工大学_院校信息库_阳光高考\n\nURL Source: https://gaokao.chsi.com.cn/sch/schoolInfo--schId-124,categoryId-1167668,mindex-1.dhtml\n\nMarkdown Content:\n[学校简介](https://gaokao.chsi.com.cn/sch/schoolInfo--schId-124,categoryId-1167668,mindex-1.dhtml) [录取规则](https://gaokao.chsi.com.cn/sch/schoolInfo--schId-124,categoryId-1167668,mindex-4.dhtml)`;
const markdownNav=extractOfficialSchoolNavigation(markdownFixture,'124');
assert.ok(markdownNav.some(item=>item.text==='学校简介'));
assert.ok(markdownNav.some(item=>item.text==='录取规则'));
assert.doesNotMatch(htmlToOfficialPlainText(markdownFixture),/URL Source:/);

const charterFixture=`<html><body>
<a href="/zsgs/zhangcheng/listVerifedZszc--method-view,schId-124,infoId-2025.dhtml">辽宁石油化工大学2025年招生章程</a>
<a href="/zsgs/zhangcheng/listVerifedZszc--method-view,schId-124,infoId-2026.dhtml">辽宁石油化工大学2026年招生章程</a>
</body></html>`;
const charter=extractLatestCharterLink(charterFixture,'辽宁石油化工大学','124');
assert.equal(charter?.year,2026);
assert.match(charter?.href||'',/infoId-2026/);

const fakeResponses=new Map();
const searchUrl='https://gaokao.chsi.com.cn/sch/search.do?searchType=1&yxmc=%E8%BE%BD%E5%AE%81%E7%9F%B3%E6%B2%B9%E5%8C%96%E5%B7%A5%E5%A4%A7%E5%AD%A6&zymc=&sySsdm=&ssdm=&yxls=&yxlx=&xlcc=&bxlx=';
fakeResponses.set(searchUrl,searchFixture);
fakeResponses.set(searchMatch.href,homeFixture);
const livingUrl=nav.find(item=>item.text==='食宿条件').href;
fakeResponses.set(livingUrl,'<html><body><div>学校信息更新时间：2026-05-28 16:54</div><h1>食宿条件</h1><p>学生住宿安排以学校当年公布信息为准。这里继续补充测试页面结构，模拟官方院校信息页面通常包含的导航、说明和正文长度，目的是验证适配器不会把异常短的错误页当成学校证据。测试文本不进入正式运行，也不代表任何学校事实。</p><p>正式 AI Plus 只读取阳光高考实时返回的公开页面，并把官方来源链接、资料更新时间和检索边界一起交给回答层。</p></body></html>');
const fakeFetch=async url=>{
  const raw=String(url),prefix=`${AI_SCHOOL_OFFICIAL_READER_ORIGIN}/`;
  if(!raw.startsWith(prefix))return{ok:false,status:400,text:async()=>''};
  const target=raw.slice(prefix.length),body=fakeResponses.get(target);
  const readerBody=body?`Title: Test\n\nURL Source: ${target}\n\nMarkdown Content:\n${body}`:'';
  return{ok:Boolean(body),status:body?200:404,text:async()=>readerBody||'not found'};
};
const evidence=await loadOfficialSchoolEvidence({school:'辽宁石油化工大学',question:'宿舍怎么样',fetchImpl:fakeFetch});
assert.equal(evidence.ok,true);
assert.equal(evidence.school,'辽宁石油化工大学');
assert.equal(evidence.schId,'124');
assert.equal(evidence.topic,'living');
assert.equal(evidence.transportVersion,AI_SCHOOL_OFFICIAL_TRANSPORT_VERSION);
assert.match(evidence.evidenceText,/学生住宿安排/);
assert.equal(evidence.updatedAt,'2026-05-28 16:54');
assert.equal(evidence.sources[0].sourceName,'阳光高考·院校信息库');
assert.ok(evidence.sources.every(source=>new URL(source.sourceUrl).origin===AI_SCHOOL_OFFICIAL_ORIGIN));
assert.match(evidence.boundary,/CHSI-only/);
assert.match(evidence.boundary,/未抓到的事实不补猜/);

const maliciousFetch=async()=>({ok:true,status:200,text:async()=>`Title: bad\nURL Source: https://example.com/fake\nMarkdown Content:\n${homeFixture}`});
await assert.rejects(()=>loadOfficialSchoolEvidence({school:'辽宁石油化工大学',question:'学校怎么样',fetchImpl:maliciousFetch}),/Reader 未返回可验证的阳光高考 URL Source/);

const workspace=createAiWorkspace({examContext:{score:580},agentContext:{currentTask:'school_official_qa',focus:{school:'辽宁石油化工大学'}}});
let command=deterministicCommand('辽宁石油化工大学怎么样',workspace,['辽宁石油化工大学']);
assert.equal(command.agentTask,'school_research');
assert.equal(command.focus.school,'辽宁石油化工大学');
assert.equal(command.executionPolicy.commitView,false);
command=deterministicCommand('辽宁石油化工大学宿舍怎么样',workspace,['辽宁石油化工大学']);
assert.equal(command.agentTask,'school_experience');
command=deterministicCommand('辽宁石油化工大学官方食宿条件',workspace,['辽宁石油化工大学']);
assert.equal(command.agentTask,'school_official_qa');
command=deterministicCommand('辽宁石油化工大学学校环境怎么样',workspace,['辽宁石油化工大学']);
assert.equal(command.agentTask,'school_experience');
command=deterministicCommand('辽宁石油化工大学2026招生章程要注意什么',workspace,['辽宁石油化工大学']);
assert.equal(command.agentTask,'school_official_qa');
command=deterministicCommand('辽宁石油化工大学最低录取分多少',workspace,['辽宁石油化工大学']);
assert.equal(command.agentTask,'school_history');
command=deterministicCommand('辽宁石油化工大学自动化最低录取分',workspace,['辽宁石油化工大学']);
assert.equal(command.agentTask,'school_major_history');
command=deterministicCommand('我580分能上辽宁石油化工大学吗',workspace,['辽宁石油化工大学']);
assert.equal(command.agentTask,'fit_assessment');
command=deterministicCommand('那宿舍呢',workspace,[]);
assert.equal(command.agentTask,'school_experience');
assert.equal(command.focus.school,'辽宁石油化工大学');

const sourceCode=read('functions/_lib/ai/school-official-source.js');
assert.match(sourceCode,/AI_SCHOOL_OFFICIAL_ORIGIN='https:\/\/gaokao\.chsi\.com\.cn'/);
assert.match(sourceCode,/AI_SCHOOL_OFFICIAL_READER_ORIGIN='https:\/\/r\.jina\.ai'/);
assert.match(sourceCode,/readerSourceUrl/);
assert.match(sourceCode,/target\.origin!==AI_SCHOOL_OFFICIAL_ORIGIN/);
assert.doesNotMatch(sourceCode,/new URL\([^\n]+question[^\n]+\)\.origin/);
const endpoint=read('functions/api/ai/school-official.js');
assert.match(endpoint,/loadOfficialSchoolEvidence/);
const plusPage=read('aiplus/index.html');
assert.match(plusPage,/data-ai-plus="family-advisor"/);
assert.match(plusPage,/阳光高考/);
const app=read('aiplus/app.v3990_3.js');
assert.match(app,/school_official/);
const registry=read('functions/_lib/ai/tool-registry.js');
assert.match(registry,/school_official_info/);
assert.match(registry,/school_experience/);
assert.match(registry,/runSchoolExperience/,'legacy school-experience compatibility entry must remain available');
assert.match(registry,/runUnifiedStudentVoice/,'legacy compatibility must delegate to the unified Student Voice adapter');
const orchestrator=read('functions/_lib/ai/turn-orchestrator.js');
assert.match(orchestrator,/school_official_qa/);
assert.match(orchestrator,/official\.detailAvailable&&evidence/);
assert.match(orchestrator,/official\.deterministicSummary/);
assert.match(orchestrator,/buildOfficialDeterministicSummary/);
assert.match(orchestrator,/loadSchoolProfileSupplement/);
assert.match(orchestrator,/!result\.officialSchool\?\.ok\|\|!result\.officialSchool\.detailAvailable/);
assert.match(orchestrator,/async function isolatedResult/);
assert.match(orchestrator,/isolatedResult\('official_profile'/);
assert.match(orchestrator,/isolatedResult\('admission_history'/);
assert.match(orchestrator,/isolatedResult\('school_background'/);
assert.match(orchestrator,/moe_directory_baseline/);
assert.match(orchestrator,/runStudentVoice/,'AIPLuS orchestrator must consume the unified Student Voice owner');
assert.doesNotMatch(orchestrator,/runSchoolExperience\(/,'AIPLuS orchestrator must not call the legacy school-experience path');
const presentation=read('functions/_lib/ai/advisor-presentation.js');
assert.match(presentation,/学校简介/);
assert.match(presentation,/学校环境/);
assert.match(presentation,/school_profile_supplement/);
assert.match(presentation,/school_experience/);
assert.match(presentation,/supportingText=value=>/);

console.log(JSON.stringify({ok:true,version:AI_SCHOOL_OFFICIAL_SOURCE_VERSION,transportVersion:AI_SCHOOL_OFFICIAL_TRANSPORT_VERSION,schoolMatch:searchMatch,topic:evidence.topic,task:'school_official_qa',officialOrigin:AI_SCHOOL_OFFICIAL_ORIGIN,readerOrigin:AI_SCHOOL_OFFICIAL_READER_ORIGIN},null,2));