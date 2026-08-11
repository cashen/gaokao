import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  AI_SCHOOL_OFFICIAL_ORIGIN,AI_SCHOOL_OFFICIAL_READER_ORIGIN,AI_SCHOOL_OFFICIAL_SOURCE_VERSION,AI_SCHOOL_OFFICIAL_TRANSPORT_VERSION,
  schoolOfficialTopic,schoolOfficialTopicLabel,htmlToOfficialPlainText,extractOfficialSchoolSearchMatch,extractOfficialSchoolNavigation,
  extractLatestCharterLink,loadOfficialSchoolEvidence
} from '../functions/_lib/ai/school-official-source.js';
import {deterministicCommand} from '../functions/_lib/ai/command-interpreter.js';
import {createAiWorkspace} from '../shared/ai/ai-workspace-contract.v3992_0.js';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=relative=>fs.readFileSync(path.join(ROOT,relative),'utf8');

assert.equal(AI_SCHOOL_OFFICIAL_SOURCE_VERSION,'ai-school-official-source-v3990_2');
assert.equal(AI_SCHOOL_OFFICIAL_ORIGIN,'https://gaokao.chsi.com.cn');
assert.equal(AI_SCHOOL_OFFICIAL_READER_ORIGIN,'https://r.jina.ai');
assert.equal(AI_SCHOOL_OFFICIAL_TRANSPORT_VERSION,'chsi-only-reader-v3990_2');
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
assert.equal(command.agentTask,'school_official_qa');
assert.equal(command.focus.school,'辽宁石油化工大学');
assert.equal(command.executionPolicy.commitView,false);
command=deterministicCommand('辽宁石油化工大学宿舍怎么样',workspace,['辽宁石油化工大学']);
assert.equal(command.agentTask,'school_official_qa');
command=deterministicCommand('辽宁石油化工大学2026招生章程要注意什么',workspace,['辽宁石油化工大学']);
assert.equal(command.agentTask,'school_official_qa');
command=deterministicCommand('辽宁石油化工大学最低录取分多少',workspace,['辽宁石油化工大学']);
assert.equal(command.agentTask,'school_history');
command=deterministicCommand('辽宁石油化工大学自动化最低录取分',workspace,['辽宁石油化工大学']);
assert.equal(command.agentTask,'school_major_history');
command=deterministicCommand('我580分能上辽宁石油化工大学吗',workspace,['辽宁石油化工大学']);
assert.equal(command.agentTask,'fit_assessment');
command=deterministicCommand('那宿舍呢',workspace,[]);
assert.equal(command.agentTask,'school_official_qa');
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
assert.match(plusPage,/data-ai-plus="school-official-qa"/);
assert.match(plusPage,/阳光高考/);
const app=read('ai/app.v3990_1.js');
assert.match(app,/school_official/);
const registry=read('functions/_lib/ai/tool-registry.js');
assert.match(registry,/school_official_info/);
const orchestrator=read('functions/_lib/ai/turn-orchestrator.js');
assert.match(orchestrator,/school_official_qa/);

console.log(JSON.stringify({ok:true,version:AI_SCHOOL_OFFICIAL_SOURCE_VERSION,transportVersion:AI_SCHOOL_OFFICIAL_TRANSPORT_VERSION,schoolMatch:searchMatch,topic:evidence.topic,task:'school_official_qa',officialOrigin:AI_SCHOOL_OFFICIAL_ORIGIN,readerOrigin:AI_SCHOOL_OFFICIAL_READER_ORIGIN},null,2));
