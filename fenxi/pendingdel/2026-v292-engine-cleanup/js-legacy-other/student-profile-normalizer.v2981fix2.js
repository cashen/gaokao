// V2.9.8.1.fix2 student profile normalizer: neutral defaults, no false reminders.
(function(){
  function rawState(){try{return JSON.parse(localStorage.getItem('ln_student_profile_state_v298')||'{}')||{};}catch(e){return {};}}
  function isMeaningfulProfile(s){
    if(!s) return false;
    return ['gender','source','learning','load','path','understanding'].some(k=>{
      const v=s[k];
      if(!v) return false;
      if(k==='gender') return v!=='unspecified';
      if(k==='source') return !['unconfirmed','unknown'].includes(v);
      if(k==='learning') return v!=='unclear';
      if(k==='load') return !['unknown','unclear'].includes(v);
      if(k==='path') return !['unknown','unclear'].includes(v);
      if(k==='understanding') return v==='hot_words' || v==='has_direction';
      return false;
    });
  }
  function meaningfulState(state){
    const raw=rawState();
    const s=state||{};
    return {raw,hasAny:isMeaningfulProfile(Object.assign({},s,raw)), hasRawKey:function(k){return Object.prototype.hasOwnProperty.call(raw,k);}};
  }
  function patchRules(api){
    if(!api || api.__fix2Normalized) return api;
    const oldDerive=api.deriveProfile;
    const oldSummary=api.summary;
    const oldRead=api.readState;
    const optLabel=api.optionLabel || function(k,v){return String(v||'');};
    api.deriveProfile=function(state){
      const s=state||oldRead?.()||{};
      const m=meaningfulState(s);
      const base=oldDerive?oldDerive.call(api,s):{state:s,tags:[],preferenceTags:[],reviewTags:[],hardExclude:false};
      const review=(base.reviewTags||[]).filter(x=>x!=='misread_review');
      // Only explicit hot words should trigger misread/hot-word reminder. Default unclear stays neutral.
      if(s.understanding==='hot_words') review.push('misread_review');
      if(!m.hasAny){
        return Object.assign({},base,{tags:[],preferenceTags:[],reviewTags:[],hardExclude:false,neutral:true});
      }
      return Object.assign({},base,{reviewTags:[...new Set(review)],hardExclude:false,neutral:false});
    };
    api.summary=function(){
      const s=oldRead?.()||{};
      const parts=[];
      if(s.gender && s.gender!=='unspecified') parts.push(optLabel('gender',s.gender));
      if(s.learning && s.learning!=='unclear') parts.push(optLabel('learning',s.learning));
      if(s.load && !['unknown','unclear'].includes(s.load)) parts.push(optLabel('load',s.load));
      if(s.path && !['unknown','unclear'].includes(s.path)) parts.push(optLabel('path',s.path));
      if(s.understanding && s.understanding!=='unclear') parts.push(optLabel('understanding',s.understanding));
      if(!parts.length) return {title:'孩子学习特点未补充',text:'可选填，主要用于提醒和排序微调，不作为硬排除条件。',tags:[]};
      return {title:'孩子学习特点已补充',text:parts.slice(0,5).join('｜'),tags:parts};
    };
    api.__fix2Normalized=true;
    return api;
  }
  function patchAll(){
    ['LN_STUDENT_PROFILE_RULES_V2981','LN_STUDENT_PROFILE_RULES_V298','LN_STUDENT_PROFILE_RULES_V2976','LN_STUDENT_PROFILE_RULES_V2975'].forEach(k=>{ if(window[k]) window[k]=patchRules(window[k]); });
  }
  patchAll(); setTimeout(patchAll,0); setTimeout(patchAll,500);
  window.LN_STUDENT_PROFILE_NORMALIZER_V2981FIX2={patchAll,isMeaningfulProfile,ready:true};
})();
