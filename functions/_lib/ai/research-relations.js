// AIPLuS research relationship contract.
// Product-level vocabulary and bidirectional school/major exploration actions
// live here so presentation, routing, and tests share one source of truth.
export const AI_RESEARCH_RELATION_CONTRACT_VERSION='ai-research-relation-contract-v3992_8';

export const RESEARCH_RELATION_LABELS=Object.freeze({
  schoolEnvironment:'学校环境',
  schoolMajorBackground:'看学校哪些专业更有底子',
  schoolMajorHistory:'看全校专业最低分',
  majorHistory:'看这个专业最低分',
  majorRegionBackground:'看辽宁其他学校',
  schoolEvidence:'看证据依据',
  schoolOtherMajors:'看这个学校其他专业',
  schoolProfile:'学校简介',
  schoolFit:'按我的分数判断'
});

function clean(value){return String(value||'').trim();}

export function researchRelationActions({task='',school='',major='',score=null,backgroundMajor=''}={}){
  const s=clean(school),m=clean(major||backgroundMajor),scoreText=Number.isFinite(Number(score))?String(Number(score)):'';
  const action=(id,label,prompt,reason)=>({id,label,prompt,reason});
  if(task==='school_research')return[
    action('research-environment',RESEARCH_RELATION_LABELS.schoolEnvironment,`${s}学校环境和人文关怀怎么样`,'从同学体验摘要或最近4条留言继续看。'),
    action('research-background',RESEARCH_RELATION_LABELS.schoolMajorBackground,`${s}哪些专业更有底子`,'看学校专业积累和可核验证据，不直接使用“王牌专业”结论。'),
    action('research-history',RESEARCH_RELATION_LABELS.schoolMajorHistory,`${s}所有专业的最低录取分`,'把学校画像和投档事实放在同一研究关系网中。')
  ];
  if(task==='school_background')return[
    m?action('background-major-history',RESEARCH_RELATION_LABELS.majorHistory,`${s}${m}多少分`,'从专业背景直接回到该校该专业历史分数。'):action('background-school-history',RESEARCH_RELATION_LABELS.schoolMajorHistory,`${s}所有专业的最低录取分`,'从专业背景回到学校全专业分数。'),
    action('background-environment',RESEARCH_RELATION_LABELS.schoolEnvironment,`${s}学校环境和人文关怀怎么样`,'从专业背景横向回看学校真实体验。'),
    action('background-evidence',RESEARCH_RELATION_LABELS.schoolEvidence,`${s}${m||''}的专业背景依据是什么`,'查看证据范围，区分学校级、学院级和专业级信息。')
  ];
  if(task==='school_history'||task==='school_major_history')return[
    action('history-school-profile',RESEARCH_RELATION_LABELS.schoolProfile,`介绍下${s}`,'回到学校整体定位。'),
    action('history-school-environment',RESEARCH_RELATION_LABELS.schoolEnvironment,`${s}学校环境和人文关怀怎么样`,'从投档事实回到学校生活体验。'),
    m?action('history-major-background',RESEARCH_RELATION_LABELS.schoolMajorBackground,`${s}${m}有专业背景吗`,'从历史分数反向查看专业底子。'):action('history-school-background',RESEARCH_RELATION_LABELS.schoolMajorBackground,`${s}哪些专业更有底子`,'从全专业分数反向查看专业底子。')
  ];
  if(task==='school_experience')return[
    action('experience-official-living','核验官方食宿',`${s}官方食宿条件`,'把同学体验与官方页面明确区分，核验页面公开的硬信息。'),
    action('experience-background',RESEARCH_RELATION_LABELS.schoolMajorBackground,`${s}哪些专业更有底子`,'从学校环境转到专业选择。'),
    action('experience-history',RESEARCH_RELATION_LABELS.schoolMajorHistory,`${s}所有专业的最低录取分`,'把体验和投档事实交叉查看。'),
    action('experience-profile',RESEARCH_RELATION_LABELS.schoolProfile,`介绍下${s}`,'回到学校整体定位。')
  ];
  if(task==='major_background')return[
    action('major-background-history',RESEARCH_RELATION_LABELS.majorHistory,`辽宁${m}在各学校多少分`,'从专业背景回到全省专业历史分数。'),
    action('major-background-schools',RESEARCH_RELATION_LABELS.majorRegionBackground,`${m}在辽宁哪些学校有背景证据`,'在同一专业主线上横向寻找学校。'),
    action('major-background-school',RESEARCH_RELATION_LABELS.schoolProfile,`介绍下辽宁${m}相关学校`,'从专业主线进入学校关系节点。')
  ];
  if(task==='background_discovery'||task==='background_fit_discovery')return[
    m?action('discovery-major-history',RESEARCH_RELATION_LABELS.majorHistory,`辽宁${m}在各学校多少分`):action('discovery-major-history','先看专业历史','辽宁电气在各学校多少分','从背景候选回到专业事实。'),
    m?action('discovery-major-schools',RESEARCH_RELATION_LABELS.majorRegionBackground,`${m}在辽宁哪些学校有背景证据`):action('discovery-major-schools','按专业找学校','电气在辽宁哪些学校有背景证据','从背景候选横向寻找学校。'),
    action('discovery-school-research','点进一所学校继续研究','介绍下辽宁相关学校','从背景候选回到学校关系节点。')
  ];
  if(task==='major_region_history')return[
    action('major-region-background',RESEARCH_RELATION_LABELS.majorRegionBackground,`${m}在辽宁哪些学校有背景证据`,'从专业历史分数横向寻找学校。'),
    scoreText?action('major-region-fit',RESEARCH_RELATION_LABELS.schoolFit,`按我${scoreText}分，辽宁${m}有哪些学校更现实`,'把家庭分数放回专业横向比较。'):action('major-region-set-score','带上我的分数判断',`我580分，辽宁${m}哪些学校更现实`,'只有明确需要可达判断时才激活个人分数。'),
    action('major-region-school','点进一所学校继续研究',`介绍下辽宁${m}相关学校`,'从专业主线回到学校主线。')
  ];
  return[];
}
