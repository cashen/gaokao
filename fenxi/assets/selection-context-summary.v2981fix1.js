// V2.9.8.1.fix1 current selection context summary: rules are folded into user-facing口径.
(function(){
  function esc(v){return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));}
  function val(id){return document.getElementById(id)?.value || '';}
  function budgetLabel(){
    const b=val('budget');
    if(b==='high') return ['预算较宽','已允许比较更高成本候选'];
    if(b==='coop') return ['中外合作可比较','会把合作办学作为提档路径单独复核'];
    if(b==='flex') return ['普通学费优先','少量高收费只作比较，不默认当稳妥'];
    return ['公办/普通学费优先','来自家庭底线设置，高收费和民办不会抢主线'];
  }
  function sortLabel(){
    const s=val('sortBy');
    const map={profile:['默认综合排序','综合位次、底线、兴趣和证据'],fit:['按位次匹配','按当前位次距离排序'],rank2025:['按2025位次','按2025投档位次排序'],rankDiffHot:['竞争增强优先','优先看2025更难进的候选'],rankDiffLoose:['位次放宽优先','优先看2025相对更好进的候选'],lift:['提档价值优先','优先比较提档价值']};
    return map[s]||map.profile;
  }
  function interestLabel(){
    const rt=window.LN_CHILD_INTEREST_RUNTIME_V296||window.LN_CHILD_INTEREST_RUNTIME_V298;
    const sum=rt?.summary?.();
    if(sum?.names?.length) return ['兴趣只做软排序',`已关注：${sum.names.slice(0,4).join('、')}。系统只在真实候选里匹配，不生成不存在的专业。`];
    return ['兴趣未硬排除','暂未选择兴趣时，系统按位次、底线和场景综合推荐'];
  }
  function qualificationLabel(){
    const s=window.LN_QUALIFICATION_GATE_V296?.summary?.();
    const hidden=s?.hidden ?? 0;
    return ['普通考生口径', hidden?`未确认资格前，资格型入口默认隐藏（规则类 ${hidden} 项）。`:'资格型入口按当前确认状态处理。'];
  }
  function scenarioLabel(){
    const current=window.currentStrategy || val('priority') || '';
    const text=current?`当前场景会影响 A/B/C 排序倾向，不覆盖手动底线。`:'场景只作为排序倾向，不覆盖家庭底线。';
    return ['场景不覆盖底线', text];
  }
  function build(){
    const b=budgetLabel(), q=qualificationLabel(), i=interestLabel(), s=sortLabel(), sc=scenarioLabel();
    return [
      {label:q[0],detail:q[1],type:'qualification'},
      {label:b[0],detail:b[1],type:'budget'},
      {label:i[0],detail:i[1],type:'interest'},
      {label:s[0],detail:s[1],type:'sort'},
      {label:sc[0],detail:sc[1],type:'scenario'}
    ];
  }
  window.LN_SELECTION_CONTEXT_SUMMARY_V2981FIX1={build,esc,ready:true};
})();
