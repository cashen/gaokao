import { performance } from 'node:perf_hooks';
import {
  buildSchoolPortrait,
  buildEvidenceInterpretation,
  PORTRAIT_DIMENSIONS
} from '../../functions/_lib/tongxue-school-portrait-base-v160.js';

const failures=[];
const check=(label,passed)=>{if(!passed)failures.push(label);};
const fetchedAt='2026-07-20T00:00:00.000Z';
const recentDates=['2026-07-18','2026-06-20','2026-05-20','2026-04-20','2026-03-20','2026-02-20'];
const oldDates=['2024-01-10','2024-02-10','2024-03-10','2024-04-10','2024-05-10','2024-06-10'];
const reviews=[];
for(let index=0;index<12;index+=1){
  const recent=index<6;
  const content=[
    index<8?'宿舍和校区安排需要确认':'课程与就业体验',
    index<5?'早操晚自习管理要求':'',
    index<4?'学费住宿费水电费用':'',
    index<3?'转专业和保研规则':'',
    index<7?'就业校招实习':'',
    index===10?'UNEXPOSED_MARKER':''
  ].filter(Boolean).join('；');
  reviews.push({
    id:index+1,
    content,
    isQuestion:index<2,
    isVerified:index%3===0,
    campus:index%2===0?'主校区':'新校区',
    createdAt:`${recent?recentDates[index]:oldDates[index-6]}T08:00:00+08:00`,
    replies:index<2?4-index:0,
    likes:index,
    rating:{dimensions:{
      employment:4+(index%3)*0.1,
      culture:recent?4.1+(index%2)*0.1:3.1+(index%2)*0.1,
      faculty:3.7+(index%2)*0.1,
      environment:3.8+(index%3)*0.1,
      dormitory:index%2===0?1.5:4.5,
      cafeteria:3.3+(index%3)*0.2,
      safety:4.2
    }},
    sourceUrl:index===11?'https://evil.invalid/review':'https://srgaoxiao.com/school/test?review='+(index+1)
  });
}
reviews.push({...reviews[0]});

const portrait=buildSchoolPortrait({
  schoolMeta:{name:'测试大学',province:'辽宁省',city:'沈阳市',type:'本科',reviewCount:30,tags:'双一流 研究型'},
  reviews,
  fetchedAt,
  partial:true
});
const employment=portrait.dimensions.find(item=>item.key==='employment');
const culture=portrait.dimensions.find(item=>item.key==='culture');
const dormitory=portrait.dimensions.find(item=>item.key==='dormitory');
const consensus=portrait.evidence.consensus.find(item=>item.key==='employment');
const dispute=portrait.evidence.disputes.find(item=>item.key==='dormitory');
const topicKeys=new Set(portrait.evidence.topicSignals.map(item=>item.key));
const checklistIds=new Set(portrait.evidence.checklist.map(item=>item.id));
const unsafeTopicUrl=portrait.evidence.topicSignals.flatMap(item=>item.sourceUrls||[]).some(url=>url.includes('evil.invalid'));

check('七维兼容',PORTRAIT_DIMENSIONS.length===7&&portrait.dimensions.length===7);
check('重复评论去重',portrait.sample.fetchedReviews===12);
check('原有样本字段',portrait.sample.evidenceLevel==='medium'&&portrait.sample.partial===true&&portrait.sample.campusCount===2);
check('一致分布',employment?.agreement==='consistent'&&employment.distribution.high===12&&employment.spread<=0.3);
check('共识输出',Boolean(consensus)&&consensus.sampleSize===12);
check('分歧分布',dormitory?.agreement==='mixed'&&dormitory.distribution.low===6&&dormitory.distribution.high===6);
check('分歧输出',Boolean(dispute)&&dispute.spread===3);
check('时间趋势',culture?.trend==='improving'&&culture.recentSampleSize===6&&culture.historicalSampleSize===6&&culture.recentScore>culture.historicalScore);
check('主题信号',topicKeys.has('campus')&&topicKeys.has('dormitory')&&topicKeys.has('management')&&topicKeys.has('cost')&&topicKeys.has('transfer')&&topicKeys.has('employment'));
check('讨论信号不复制正文',portrait.evidence.topicSignals.every(item=>!Object.hasOwn(item,'content')&&!Object.hasOwn(item,'snippet')));
check('来源链接白名单',!unsafeTopicUrl);
check('核验清单核心项',checklistIds.has('campus')&&checklistIds.has('dormitory')&&checklistIds.has('management'));
check('核验清单覆盖风险',checklistIds.has('disputes')&&(checklistIds.has('cost')||checklistIds.has('transfer')||checklistIds.has('employment')));
check('清单数量受限',portrait.evidence.checklist.length>0&&portrait.evidence.checklist.length<=6);
check('版本与边界说明',portrait.evidence.version==='v1.6.0'&&portrait.evidence.note.includes('不等于学校官方事实'));
check('原有关注点保留',portrait.attentionPoints.some(item=>item.text.includes('宿舍体验'))||portrait.attentionPoints.some(item=>item.text.includes('分化明显')));
check('问题内容仍有来源',portrait.questions.length===2&&portrait.questions.every(item=>item.sourceUrl.startsWith('https://srgaoxiao.com/school/')));

const direct=buildEvidenceInterpretation({reviews:[],dimensions:[],campuses:[],sample:{fetchedReviews:0,ratedReviews:0,verifiedReviews:0},fetchedAt});
check('空样本保守处理',direct.consensus.length===0&&direct.disputes.length===0&&direct.checklist.some(item=>item.id==='sample'));

const started=performance.now();
for(let index=0;index<250;index+=1)buildSchoolPortrait({schoolMeta:{name:'性能测试大学'},reviews,fetchedAt});
const elapsed=performance.now()-started;
check('聚合性能预算',elapsed<1200);

const report={checks:{
  dimensions:portrait.dimensions.length,
  consensus:portrait.evidence.consensus.map(item=>item.key),
  disputes:portrait.evidence.disputes.map(item=>item.key),
  topics:portrait.evidence.topicSignals.map(item=>[item.key,item.mentionCount]),
  checklist:portrait.evidence.checklist.map(item=>item.id),
  cultureTrend:culture?.trend,
  elapsedMs:Number(elapsed.toFixed(2))
},failures};
console.log('TONGXUE_EVIDENCE_V160_RESULTS '+JSON.stringify(report));
if(failures.length)process.exitCode=1;
