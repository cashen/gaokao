// V2.9.8 student profile rules: profile only changes explanation priority, never hard filters.
(function(){
  const STORAGE_KEY='ln_student_profile_state_v298';
  const DEFAULT_STATE={gender:'unspecified',source:'unconfirmed',learning:'unclear',load:'unknown',path:'unknown',understanding:'unclear',updatedAt:'',schemaVersion:1};
  const OPTIONS={
    gender:[['unspecified','不填写'],['female','女'],['male','男']],
    source:[['child_self','孩子自己表达'],['parent_observe','家长观察'],['family_discussion','家庭讨论'],['unconfirmed','暂未确认']],
    learning:[['science','偏理工'],['expression','偏表达'],['practice','偏动手实践'],['path_clear','偏稳定路径'],['unclear','暂不确定']],
    load:[['normal','正常'],['sensitive','对强度较敏感'],['unknown','暂不确定']],
    path:[['grad_ok','能接受读研'],['exam_ok','能接受考证考编'],['work_first','更希望本科就业'],['unknown','暂不确定']],
    understanding:[['has_direction','已有大概方向'],['hot_words','只知道几个热门词'],['unclear','还没想清楚']]
  };
  function safe(v){return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));}
  function optionLabel(group,value){const hit=(OPTIONS[group]||[]).find(x=>x[0]===value); return hit?hit[1]:value;}
  function currentGenderFromDom(){return document.getElementById('studentGender')?.value || 'unspecified';}
  function defaultState(){return Object.assign({}, DEFAULT_STATE, {gender:currentGenderFromDom()||'unspecified'});}
  function readState(){
    try{const raw=localStorage.getItem(STORAGE_KEY); const parsed=raw?JSON.parse(raw):{}; return Object.assign(defaultState(), parsed||{}, {gender: parsed?.gender || currentGenderFromDom() || 'unspecified'});}catch(e){return defaultState();}
  }
  function saveState(next){
    const s=Object.assign(defaultState(), next||{});
    Object.keys(OPTIONS).forEach(k=>{if(!OPTIONS[k].some(x=>x[0]===s[k])) s[k]=DEFAULT_STATE[k]||OPTIONS[k][0][0];});
    s.updatedAt=new Date().toISOString();
    try{localStorage.setItem(STORAGE_KEY, JSON.stringify(s));}catch(e){}
    const genderEl=document.getElementById('studentGender'); if(genderEl && s.gender) genderEl.value=s.gender;
    window.LN_STATE_SNAPSHOT_V296?.reset?.();
    window.LN_CANDIDATE_CACHE_V296?.reset?.();
    return s;
  }
  function tagsFromState(s){
    const tags=[];
    if(s.gender==='female') tags.push('画像：女孩');
    if(s.gender==='male') tags.push('画像：男孩');
    if(s.learning==='science') tags.push('偏理工');
    if(s.learning==='expression') tags.push('偏表达');
    if(s.learning==='practice') tags.push('偏实践');
    if(s.learning==='path_clear') tags.push('关注路径清楚');
    if(s.load==='sensitive') tags.push('学习强度需复核');
    if(s.path==='grad_ok') tags.push('可接受读研');
    if(s.path==='exam_ok') tags.push('可接受考证考编');
    if(s.path==='work_first') tags.push('本科就业优先');
    if(s.understanding==='hot_words') tags.push('需分清热门词');
    return tags;
  }
  function deriveProfile(state){
    const s=state||readState(); const preferenceTags=[]; const reviewTags=[];
    if(s.learning==='expression') preferenceTags.push('expression','humanities');
    if(s.learning==='science') preferenceTags.push('science','engineering');
    if(s.learning==='practice') preferenceTags.push('practice','engineering');
    if(s.learning==='path_clear') preferenceTags.push('path_clear');
    if(s.load==='sensitive') reviewTags.push('learning_load');
    if(s.path==='grad_ok') preferenceTags.push('grad_path');
    if(s.path==='exam_ok') preferenceTags.push('exam_path');
    if(s.path==='work_first') preferenceTags.push('work_first');
    if(s.understanding==='hot_words'||s.understanding==='unclear') reviewTags.push('misread_review');
    return {state:s, tags:tagsFromState(s), preferenceTags:[...new Set(preferenceTags)], reviewTags:[...new Set(reviewTags)], hardExclude:false};
  }
  function summary(){
    const s=readState(); const tags=tagsFromState(s);
    if(!tags.length) return {title:'学生画像未补充', text:'可选填，用于调整提醒顺序，不作为专业排除条件。', tags:[]};
    return {title:'学生画像已补充', text:tags.slice(0,4).join('｜'), tags};
  }
  const api={OPTIONS, optionLabel, safe, readState, saveState, deriveProfile, summary, ready:true}; window.LN_STUDENT_PROFILE_RULES_V298=api; window.LN_STUDENT_PROFILE_RULES_V2975=api;
})();
