// V2.9.8.2 legacy adapter: old engines read the unified context, not hidden old DOM controls.
(function(){
  function ctx(){return window.LN_DECISION_CONTEXT_V2982?.build?.()||{};}
  function has(ids, list){return (ids||[]).some(id=>list.includes(id));}
  function group(name){
    const c=ctx(); const ids=c.interests?.ids||[];
    if(name==='outProvince') return c.family?.outProvince || 'yes';
    if(name==='medicine') return has(ids,['medical_health','pharmacy_pharma'])?'prefer':'neutral';
    if(name==='teacher') return has(ids,['teacher_education'])?'prefer':'neutral';
    if(name==='liberal') return has(ids,['humanities_law','finance_manage'])?'prefer':'neutral';
    if(name==='chem') return has(ids,['chem_food_env'])?'prefer':'neutral';
    if(name==='physics') return has(ids,['mechanical_instrument'])?'prefer':'neutral';
    if(name==='gridPower') return has(ids,['electric_energy'])?'prefer':'neutral';
    return 'neutral';
  }
  function profileField(name){
    const s=ctx().student||{};
    if(name==='gradWillingnessV29471') return s.path==='grad_ok'?'yes':s.path==='work_first'?'no':'unknown';
    if(name==='mathTolerance') return s.load==='sensitive'?'medium':'normal';
    if(name==='fieldWorkAcceptance') return s.learning==='practice'?'accept':'unknown';
    if(name==='codeAcceptance') return (ctx().interests?.ids||[]).includes('computer_info')?'medium':'unknown';
    if(name==='studentGender') return s.gender||'unspecified';
    return 'unknown';
  }
  function mentorContext(){
    const c=ctx(); const s=c.student||{}, f=c.family||{};
    return {mode:'standard', mentorMode:'standard', familyTolerance:f.budgetWide?'high':'low', gradPlan:s.path==='grad_ok'?'yes':s.path==='work_first'?'no':'maybe', timePressure:(s.path==='work_first'&&f.noHighFee)?'fast':s.path==='grad_ok'?'long':'normal', priority:c.priority||'employment'};
  }
  function setValue(id,value){const el=document.getElementById(id); if(el && value!==undefined && value!==null){el.value=value;}}
  function setSingle(groupName,value){
    const box=document.querySelector(`[data-group="${groupName}"]`); if(!box)return;
    box.querySelectorAll('.chip').forEach(ch=>ch.classList.toggle('active',(ch.dataset.value||'')===value));
  }
  function syncLegacyDom(){
    const m=mentorContext();
    setValue('mentorMode',m.mentorMode); setValue('familyTolerance',m.familyTolerance); setValue('gradPlan',m.gradPlan); setValue('timePressure',m.timePressure);
    setValue('mathTolerance',profileField('mathTolerance')); setValue('fieldWorkAcceptance',profileField('fieldWorkAcceptance')); setValue('gradWillingnessV29471',profileField('gradWillingnessV29471')); setValue('codeAcceptance',profileField('codeAcceptance'));
    ['medicine','teacher','liberal','chem','physics','gridPower'].forEach(k=>setSingle(k,group(k)));
  }
  function patchStateSnapshot(){
    const old=window.LN_STATE_SNAPSHOT_V296; if(!old || old.__v2982Unified)return;
    const api={ready:true,__v2982Unified:true, reset:function(){old.reset?.();}, snapshot:function(force){syncLegacyDom(); const c=ctx(); const f=c.family||{}, q=c.qualification||{}, mc=mentorContext(); const cache={rank:c.rank,score:c.score,provinces:f.provinces||[],cities:f.cities||[],child:c.interests?.state||{},priority:c.priority,regionMode:f.regionMode,cityMode:f.cityMode,rejectList:f.rejects||[],rejectSet:f.rejectSet||new Set(),budget:f.budget,familyTolerance:mc.familyTolerance,feeType:f.feeType,qMajor:c.qMajor,currentStrategy:c.currentStrategy,budgetWide:c.budgetWide,coopIntent:c.coopIntent,noHighFee:c.noHighFee,strict:c.strict,scoreBand:c.scoreBand,lowScore:c.lowScore,edgeScore:c.edgeScore,highScore:c.highScore,outProvince:group('outProvince'),medicine:group('medicine'),teacher:group('teacher'),liberal:group('liberal'),chem:group('chem'),physics:group('physics'),gridPower:group('gridPower'),mentorMode:mc.mentorMode,gradPlan:mc.gradPlan,timePressure:mc.timePressure,strongProvince:c.strongProvince,strongCity:c.strongCity,hotMajor:c.hotMajor,normalFamily:c.normalFamily,specialStatus:c.specialStatus,qualificationGate:q.state||{},decisionContext:c}; return cache; }};
    window.LN_STATE_SNAPSHOT_V296=api;
  }
  function patchGlobals(){
    if(!window.__LN_OLD_GET_GROUP_V2982 && typeof window.getGroup==='function') window.__LN_OLD_GET_GROUP_V2982=window.getGroup;
    window.getGroup=function(name){return group(name);};
    const oldMentor=window.mentorRule;
    if(typeof oldMentor==='function' && !oldMentor.__v2982Wrapped){
      const wrapped=function(){syncLegacyDom(); return oldMentor.apply(this,arguments);};
      wrapped.__v2982Wrapped=true; wrapped.__original=oldMentor; window.mentorRule=wrapped;
    }
    patchStateSnapshot(); syncLegacyDom();
  }
  const api={getGroup:group,getProfileField:profileField,getMentorContext:mentorContext,syncLegacyDom,patchGlobals,ready:true};
  window.LN_LEGACY_PREFERENCE_ADAPTER_V2982=api;
  patchGlobals(); setTimeout(patchGlobals,0); setTimeout(patchGlobals,600);
})();
