// V2.9.8.1.fix1 reminder dedupe: one primary reminder per card.
(function(){
  function choose(decision){
    const tags=(decision?.tags||[]).slice();
    const trade=decision?.tradeoff||{};
    const ordered=tags.sort((a,b)=>(b.priority||0)-(a.priority||0));
    const critical=ordered.find(t=>t.type==='review'||t.type==='family'||t.type==='profile'||t.type==='interest');
    let primary=trade.review || critical?.detail || '建议复核招生章程、专业代码、学费和校区。';
    if(critical?.label && !String(primary).includes(critical.label.replace('需复核：',''))) primary=`${critical.label}：${primary}`;
    const secondary=ordered.filter(t=>t!==critical).map(t=>({label:t.label,detail:t.detail,type:t.type}));
    return {primary,secondary};
  }
  window.LN_DECISION_REMINDER_DEDUPE_V2981FIX1={choose,ready:true};
})();
