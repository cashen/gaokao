// V2.9.8.1 tradeoff rules: gain / accept / review in short parent-readable sentences.
(function(){
  function safe(v){return String(v??'').replace(/\s+/g,' ').trim();}
  function interest(record){ return window.LN_CHILD_INTEREST_RUNTIME_V296?.matchRecord?.(record) || null; }
  function isPublic(record){ return /公办/.test(String(record?.schoolNature?.label||record?.schoolNatureLabel||'')); }
  function profile(){ return (window.LN_STUDENT_PROFILE_RULES_V298 || window.LN_STUDENT_PROFILE_RULES_V2976 || window.LN_STUDENT_PROFILE_RULES_V2975)?.deriveProfile?.() || {}; }
  function mainReview(record, type, tags){
    const review=(tags||[]).find(t=>t.type==='review' && /需复核|资格|易混/.test(t.label));
    if(review) return review.detail.replace(/。.*$/,'。');
    const im=interest(record);
    if(im?.active && im.level==='review') return '当前只属于需复核方向，建议回到本科专业代码和培养方案确认。';
    const p=profile();
    if((p.reviewTags||[]).includes('misread_review')) return '孩子当前只知道热门词，建议先分清专业名、专业类和培养路径。';
    if(type==='C') return '争上限候选要同时复核专业、学费、校区和录取波动。';
    return '正式填报前建议复核招生章程、专业代码、学费、校区和体检限制。';
  }
  function build(record, type, tags){
    const im=interest(record); const safety=window.LN_ADMISSION_SAFETY_RULES_V2981?.classify?.(record); const ev=window.LN_ADMISSION_EVIDENCE_RULES_V2981?.build?.(record); const pub=isPublic(record);
    let gain=''; let accept='';
    if(type==='A'){
      gain = `${pub?'公办、':''}${safety?.label?`录取安全标记为“${safety.label}”，`:''}更适合先守家庭底线和可落地性。`;
      accept = '可能需要接受学校层级、城市资源或热门专业上限让出一部分。';
    }else if(type==='B'){
      const hit=im?.active && im.level && im.level!=='no' ? `与孩子关注“${im.group?.name||'兴趣方向'}”${im.label?'形成'+im.label:''}` : '专业路径相对清楚';
      gain = `${hit}，适合拿来和孩子重点讨论。`;
      accept = '可能需要在学校层级、地域便利或录取安全垫上做一些取舍。';
    }else if(type==='C'){
      gain = '换来学校平台、城市资源或层级上限的讨论空间。';
      accept = '需要接受录取不确定性、专业精确度或费用校区复核压力。';
    }else{
      gain = im?.active && im.level!=='no' ? `方向与孩子关注点有关系，适合进入第一轮复核。` : '符合当前位次和家庭底线，可作为综合备选观察。';
      accept = safety?.label==='冲'||safety?.label==='需谨慎' ? '需要接受录取不确定性，并搭配更稳的候选。' : '仍需结合学校、城市、学费和专业实际培养方案复核。';
    }
    if(ev?.tone==='hotter') accept += ' 近两年位次收紧，安全感要适当打折。';
    if(record?.isHighFee || record?.isCoopV29475) accept += ' 涉及高收费或合作办学，四年总成本必须单独核算。';
    return {gain:safe(gain), accept:safe(accept), review:safe(mainReview(record,type,tags))};
  }
  window.LN_CANDIDATE_TRADEOFF_RULES_V2981={build,ready:true};
})();
