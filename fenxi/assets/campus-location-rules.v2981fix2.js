// V2.9.8.1.fix2 campus/location rules: avoid misleading city labels for named campuses.
(function(){
  const CAMPUS_PATTERNS=['盘锦校区','秦皇岛分校','威海校区','深圳校区','珠海校区','苏州校区','青岛校区','异地校区','分校区'];
  function textOf(r){return [r?.school,r?.major,r?.remark,r?.admissionRemark,r?.campus,r?.address,r?.note].filter(Boolean).join(' ');}
  function detect(record){
    const t=textOf(record);
    const hit=CAMPUS_PATTERNS.find(p=>t.includes(p));
    if(!hit) return {hasCampus:false,label:'',warning:''};
    let province='';
    if(/盘锦/.test(hit)||/盘锦/.test(t)) province='辽宁';
    else if(/秦皇岛/.test(hit)||/秦皇岛/.test(t)) province='河北';
    else if(/威海/.test(hit)||/威海/.test(t)) province='山东';
    else if(/深圳/.test(hit)||/深圳/.test(t)) province='广东';
    else if(/珠海/.test(hit)||/珠海/.test(t)) province='广东';
    else if(/苏州/.test(hit)||/苏州/.test(t)) province='江苏';
    else if(/青岛/.test(hit)||/青岛/.test(t)) province='山东';
    return {hasCampus:true,label:(province?province+'｜':'')+hit+'（就读地请复核）',campus:hit,warning:'该候选涉及校区信息，城市、住宿、通勤和生活成本请按实际就读校区复核。'};
  }
  window.LN_CAMPUS_LOCATION_RULES_V2981FIX2={detect,ready:true};
})();
