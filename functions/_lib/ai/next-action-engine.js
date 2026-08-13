export const AI_NEXT_ACTION_ENGINE_VERSION='ai-next-action-engine-v0.02';

export const NEXT_ACTION_LABELS=Object.freeze({
  schoolEnvironment:'看校园环境与同学体验',schoolMajorBackground:'看哪些专业更有积累',schoolMajorHistory:'看全校专业分数',
  majorHistory:'看这个专业分数',majorRegionBackground:'看辽宁其他学校',schoolEvidence:'看证据依据',
  schoolProfile:'回到学校整体介绍',schoolFit:'按我的分数判断',officialLiving:'核验官方食宿硬信息'
});

function clean(value){return String(value||'').trim();}
function normalizedPrompt(value){return clean(value).replace(/[\s，。！？、,.!?]/g,'');}
function visitedPrompts(workspace={}){return new Set((workspace.turnHistory||[]).slice(-24).map(turn=>normalizedPrompt(turn?.userText)).filter(Boolean));}
function action(id,label,prompt,reason,priority=50){return{id,label,prompt,reason,priority};}
function resultSchool(result={}){
  const direct=[...(result?.majorHistory?.records||[]),...(result?.history?.records||[]),...(result?.fit?.records||[]),...(result?.candidates?.records||[])];
  for(const item of direct){const school=clean(item?.school||item?.schoolName);if(school)return school;}
  for(const item of result?.background?.items||[]){
    const own=clean(item?.school||item?.schoolName||item?.record?.school);if(own)return own;
    for(const candidate of item?.schools||[]){const school=clean(typeof candidate==='string'?candidate:candidate?.school||candidate?.schoolName||candidate?.officialName);if(school)return school;}
  }
  return'';
}

function candidates({task,school,major,score,topic,result}={}){
  const s=clean(school),m=clean(major),scoreText=Number.isFinite(Number(score))?String(Number(score)):'',nextSchool=resultSchool(result);
  if(task==='school_research')return[
    action('research-background',NEXT_ACTION_LABELS.schoolMajorBackground,`${s}哪些专业更有底子`,'查看学校专业积累和证据范围。',95),
    action('research-history',NEXT_ACTION_LABELS.schoolMajorHistory,`${s}所有专业的最低录取分`,'把学校画像与实际投档记录交叉看。',90),
    action('research-environment',NEXT_ACTION_LABELS.schoolEnvironment,`${s}学校环境和人文关怀怎么样`,'补充同学体验，不冒充官方结论。',85)
  ];
  if(task==='school_background')return[
    m?action('background-major-history',NEXT_ACTION_LABELS.majorHistory,`${s}${m}多少分`,'从专业积累回到实际投档分数。',98):action('background-school-history',NEXT_ACTION_LABELS.schoolMajorHistory,`${s}所有专业的最低录取分`,'回到全校专业分数。',95),
    action('background-environment',NEXT_ACTION_LABELS.schoolEnvironment,`${s}学校环境和人文关怀怎么样`,'再看真实生活体验。',80),
    action('background-evidence',NEXT_ACTION_LABELS.schoolEvidence,`${s}${m||''}的专业背景依据是什么`,'区分学校级、学院级和专业级证据。',75)
  ];
  if(task==='school_history'||task==='school_major_history')return[
    m?action('history-major-background',NEXT_ACTION_LABELS.schoolMajorBackground,`${s}${m}有专业背景吗`,'从分数反向检查专业积累。',96):action('history-school-background',NEXT_ACTION_LABELS.schoolMajorBackground,`${s}哪些专业更有底子`,'从全校分数进入专业积累。',96),
    action('history-school-profile',NEXT_ACTION_LABELS.schoolProfile,`介绍下${s}`,'补齐学校整体定位。',85),
    action('history-school-environment',NEXT_ACTION_LABELS.schoolEnvironment,`${s}学校环境和人文关怀怎么样`,'补充学校生活体验。',75)
  ];
  if(task==='school_experience'){
    const living=topic==='living',out=[];
    if(living)out.push(action('experience-official-living',NEXT_ACTION_LABELS.officialLiving,`${s}官方食宿条件`,'把同学体验和官方页面公开的硬信息分开核验。',100));
    out.push(action('experience-background',NEXT_ACTION_LABELS.schoolMajorBackground,`${s}哪些专业更有底子`,'从生活体验转到专业选择。',90));
    out.push(action('experience-history',NEXT_ACTION_LABELS.schoolMajorHistory,`${s}所有专业的最低录取分`,'把体验与投档事实交叉查看。',85));
    out.push(action('experience-profile',NEXT_ACTION_LABELS.schoolProfile,`介绍下${s}`,'回到学校整体定位。',70));
    return out;
  }
  if(task==='major_background')return[
    action('major-background-history',NEXT_ACTION_LABELS.majorHistory,`辽宁${m}在各学校多少分`,'从背景证据回到全省专业分数。',98),
    action('major-background-schools',NEXT_ACTION_LABELS.majorRegionBackground,`${m}在辽宁哪些学校有背景证据`,'继续沿同一专业横向找学校。',88),
    nextSchool?action('major-background-school',`继续看${nextSchool}`,`介绍下${nextSchool}`,'从专业主线进入一所具体学校。',70):null
  ].filter(Boolean);
  if(task==='background_discovery'||task==='background_fit_discovery')return[
    action('discovery-major-history',NEXT_ACTION_LABELS.majorHistory,`辽宁${m||'电气'}在各学校多少分`,'回到确定性专业历史。',96),
    action('discovery-major-schools',NEXT_ACTION_LABELS.majorRegionBackground,`${m||'电气'}在辽宁哪些学校有背景证据`,'沿专业主线横向找学校。',86),
    nextSchool?action('discovery-school-research',`继续看${nextSchool}`,`介绍下${nextSchool}`,'进入一所具体学校节点。',60):null
  ].filter(Boolean);
  if(task==='major_region_history')return[
    action('major-region-background',NEXT_ACTION_LABELS.majorRegionBackground,`${m}在辽宁哪些学校有背景证据`,'从分数横向转到专业积累。',96),
    scoreText?action('major-region-fit',NEXT_ACTION_LABELS.schoolFit,`按我${scoreText}分，辽宁${m}有哪些学校更现实`,'只有这一步重新激活家庭分数。',92):action('major-region-set-score','带上分数判断',`我580分，辽宁${m}哪些学校更现实`,'做可达判断时再使用个人分数。',92),
    nextSchool?action('major-region-school',`继续看${nextSchool}`,`介绍下${nextSchool}`,'从专业主线进入一所具体学校。',65):null
  ].filter(Boolean);
  if(task==='school_comparison'||task==='major_comparison')return[
    action('comparison-priority','明确比较重点','我更看重本科就业和专业匹配，城市其次','比较维度会随家庭关注点变化。',95),
    !scoreText?action('comparison-score','带上分数看可达性','我580分，再比较一次','加入分数后才能比较可达专业空间。',90):null
  ].filter(Boolean);
  return[];
}

export function nextActionsForTurn({task='',school='',major='',score=null,backgroundMajor='',topic='general',result={},workspace={}}={}){
  const seen=visitedPrompts(workspace),out=[],ids=new Set(),items=candidates({task,school,major:major||backgroundMajor,score,topic,result});
  if(result?.partial)items.unshift(action('retry-failed','重试没有完成的部分','只重试刚才失败的查询','保留已成功结果，只补失败项。',110));
  for(const item of items.sort((a,b)=>b.priority-a.priority)){
    if(!item?.prompt||ids.has(item.id)||seen.has(normalizedPrompt(item.prompt)))continue;
    ids.add(item.id);out.push({id:item.id,label:item.label,prompt:item.prompt,reason:item.reason});if(out.length>=3)break;
  }
  return out;
}
