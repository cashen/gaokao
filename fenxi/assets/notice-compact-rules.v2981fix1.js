// V2.9.8.1.fix1 compact notice rules: qualification/rank bands/advisor diagnosis in one-line summaries.
(function(){
  function txt(id){return (document.getElementById(id)?.textContent||'').trim();}
  function htmlEsc(v){return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));}
  function numberText(id){return txt(id)||'0';}
  function rankBandLine(){
    const ch=txt('bandChong'), ma=txt('bandMatch'), st=txt('bandSteady'), sa=txt('bandSafe');
    if(!ch||ch==='-'||!ma||ma==='-') return '位次带宽：输入位次后显示可冲、匹配、稳妥和保底范围';
    return `位次带宽：可冲 ${ch}｜匹配 ${ma}｜稳妥 ${st||'-'}｜保底 ${sa||'-'}`;
  }
  function qualificationLine(){
    const sp=numberText('exSpecial');
    if(sp==='0') return '资格入口：普通考生口径｜资格型入口按当前确认状态处理';
    return `资格入口：普通考生口径｜高校专项/预科/民族班/定向等 ${sp} 条已隐藏｜管理资格入口`;
  }
  function advisorLine(){
    const all=numberText('cntAll'), ch=numberText('cntChong'), ma=numberText('cntMatch'), st=numberText('cntSteady'), sa=numberText('cntSafe'), reg=numberText('exRegion'), bud=numberText('exBudget');
    if(all==='0'&&ch==='0'&&ma==='0') return '高报师诊断：输入位次并计算后显示候选范围摘要';
    return `高报师诊断：可观察 ${all}｜可冲 ${ch}｜匹配 ${ma}｜稳妥 ${st}｜保底 ${sa}｜区域排除 ${reg}｜预算排除 ${bud}`;
  }
  function details(){
    return {
      rank:'可冲：有机会，但不宜只依赖这一类选择。匹配：方案主体。稳妥：中后段兜住。保底：兜住底线。',
      qualification:'高校专项、预科/民族班、定向培养等不是普通考生“分够就能报”的入口。未确认资格前默认隐藏；如确有资格，可在“管理资格入口”放开比较。',
      advisor:'这些数字用于解释筛选口径，不是最终志愿顺序。主页面先看 A/B/C，完整诊断可打开 diagnostics 页面核验。'
    };
  }
  function build(){return {rankBandLine:rankBandLine(), qualificationLine:qualificationLine(), advisorLine:advisorLine(), details:details()};}
  window.LN_NOTICE_COMPACT_RULES_V2981FIX1={build,esc:htmlEsc,ready:true};
})();
