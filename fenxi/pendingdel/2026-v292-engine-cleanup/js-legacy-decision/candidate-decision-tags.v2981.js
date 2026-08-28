// V2.9.8.1 decision tag rules: short clickable reminders for candidate cards.
(function(){
  function esc(v){ return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s])); }
  function interest(record){ return window.LN_CHILD_INTEREST_RUNTIME_V296?.matchRecord?.(record) || null; }
  function hasConfusable(record){ try{return !!(typeof hasConfusableMajorV2946==='function' && hasConfusableMajorV2946(record));}catch(e){return false;} }
  function profile(){ return (window.LN_STUDENT_PROFILE_RULES_V298 || window.LN_STUDENT_PROFILE_RULES_V2976 || window.LN_STUDENT_PROFILE_RULES_V2975)?.deriveProfile?.() || {}; }
  function uniqTags(tags){ const seen=new Set(); return tags.filter(t=>{ const k=t.label+'|'+t.type; if(seen.has(k))return false; seen.add(k); return true; }).sort((a,b)=>(b.priority||0)-(a.priority||0)); }
  function build(record, opts){
    const type=opts?.type||''; const tags=[];
    const safety=window.LN_ADMISSION_SAFETY_RULES_V2981?.classify?.(record);
    if(safety?.label) tags.push({label:safety.label,type:'safety',priority:100,detail:`${safety.text} ${safety.disclaimer||'录取安全仅作初筛参考。'}`,tone:safety.tone});
    const im=interest(record);
    if(im?.active && im.level && im.level!=='no'){
      const label=im.level==='core'?'正主匹配':im.level==='near'?'相近方向':'需复核方向';
      tags.push({label,type:'interest',priority:94,detail:`孩子关注“${esc(im.group?.name||'兴趣方向')}”，系统先转成本科目录规则，再在当前真实候选中匹配；不会生成不存在的专业。`,tone:im.level});
    }else if(im?.active){
      tags.push({label:'综合备选',type:'interest',priority:54,detail:'未直接命中孩子关注点，但仍符合当前位次和家庭底线，保留为综合备选。',tone:'soft'});
    }
    const ev=window.LN_ADMISSION_EVIDENCE_RULES_V2981?.build?.(record);
    if(ev?.tag) tags.push({label:ev.tag,type:'evidence',priority:82,detail:`${ev.y2025}；${ev.y2024}；${ev.trend}${ev.note?'。'+ev.note:''}`,tone:ev.tone});
    const nature=record?.schoolNature?.label || record?.schoolNatureLabel || '';
    if(/公办/.test(nature)) tags.push({label:'公办',type:'family',priority:74,detail:'学校性质识别为公办倾向，正式填报前仍建议以官方招生章程和教育部平台为准。',tone:'ok'});
    if(record?.isHighFee || record?.isCoopV29475) tags.push({label:'高收费复核',type:'family',priority:96,detail:'涉及中外合作或高收费属性，建议单独核验证书、培养地点、学费总成本和转专业政策。',tone:'warn'});
    else if(!(record?.isPrivateV29475)) tags.push({label:'费用可控',type:'family',priority:70,detail:'当前未识别为高收费或中外合作，但学费、住宿、校区仍需以招生计划为准。',tone:'soft'});
    if(record?._qualificationGate?.matched || (record?.qualificationGatesV296||[]).length) tags.push({label:'资格入口',type:'review',priority:98,detail:'该候选可能属于资格型入口，未确认资格前不宜和普通批候选直接混排。',tone:'warn'});
    if(hasConfusable(record)) tags.push({label:'需复核：易混',type:'review',priority:97,detail:'该专业容易与同校或同主题专业混淆，建议对比本科专业代码、专业类和培养方案。',tone:'warn'});
    if(record?.officialMajorCode || record?.undergradMajorCode || record?.catalog_major_code) tags.push({label:'代码可查',type:'review',priority:60,detail:`本科目录代码：${esc(record.officialMajorCode||record.undergradMajorCode||record.catalog_major_code)}。建议与招生章程原文再核对。`,tone:'soft'});
    else tags.push({label:'需复核：代码',type:'review',priority:88,detail:'招生名称和本科目录专业不一定完全一致，建议查看招生章程中的专业代码、培养方案和专业方向。',tone:'warn'});
    const p=profile();
    if((p.reviewTags||[]).includes('misread_review')) tags.push({label:'需分清热门词',type:'profile',priority:78,detail:'孩子当前对专业理解还不充分，建议重点分清专业名、专业类、培养方向和就业路径。',tone:'warn'});
    if((p.reviewTags||[]).includes('learning_load')) tags.push({label:'强度需复核',type:'profile',priority:76,detail:'孩子学习特点显示对学习强度较敏感，建议查看课程结构、实验实践、数学/代码/医学长周期要求。',tone:'warn'});
    if(type==='A') tags.push({label:'守底线',type:'abc',priority:65,detail:'A组优先守公办、费用、位次安全和路径清楚度。',tone:'soft'});
    if(type==='B') tags.push({label:'看专业',type:'abc',priority:65,detail:'B组优先看专业是否看得准、孩子是否认可、路径是否清楚。',tone:'soft'});
    if(type==='C') tags.push({label:'争上限',type:'abc',priority:65,detail:'C组优先比较学校平台、城市资源或层级上限，同时要接受更高不确定性。',tone:'soft'});
    return uniqTags(tags);
  }
  function visible(tags,max){ tags=tags||[]; const m=max||5; return {shown:tags.slice(0,m), hidden:tags.slice(m)}; }
  window.LN_CANDIDATE_DECISION_TAGS_V2981={build,visible,ready:true};
})();
