// V2.9.8.3.fix5 region filter rules: one source for family regional baseline.
(function(){
  function perf(){return (window.performance&&performance.now)?performance.now():Date.now();}
  function dbg(name,obj){try{window.LN_DEBUG_V2983?.detail?.(name,obj);}catch(e){}}
  function norm(v){
    let s=String(v||'').trim();
    if(!s)return '';
    s=s.replace(/省|市|壮族|回族|维吾尔|自治区|特别行政区/g,'');
    if(s==='内蒙')s='内蒙古';
    if(s==='黑龙')s='黑龙江';
    return s;
  }
  function targets(family){return (family?.provinces||[]).map(norm).filter(Boolean);}
  function ensureGeo(r){
    try{ if(r && (!r.schoolProvince || r.schoolProvince==='待核验') && typeof window.applySchoolGeoV29471==='function') window.applySchoolGeoV29471(r); }catch(e){}
    return r;
  }
  function provinceOf(r){
    ensureGeo(r);
    return norm(r?.schoolProvince || r?.province || '');
  }
  function check(record,family){
    const mode=family?.regionMode||'none';
    const t=targets(family);
    const p=provinceOf(record);
    if(mode==='none' || !t.length){return {pass:true,mode,targetProvinces:t,schoolProvince:p,matched:false,reason:'地域不限'};}
    const matched=!!p && t.includes(p);
    if(mode==='hard'){
      if(matched)return {pass:true,mode,targetProvinces:t,schoolProvince:p,matched:true,reason:'地域硬筛命中'};
      return {pass:false,mode,targetProvinces:t,schoolProvince:p,matched:false,reason:p?'不在目标省份，硬筛排除':'地域待核验，硬筛排除'};
    }
    // soft = keep but mark; downstream scoring can still降权/提示.
    return {pass:true,mode,targetProvinces:t,schoolProvince:p,matched,reason:matched?'地域软筛命中':'非目标省份，软筛保留'};
  }
  function collector(family){
    const start=perf(); const t=targets(family); const mode=family?.regionMode||'none';
    const stat={mode,targetProvinces:t,rows:0,kept:0,excluded:0,matched:0,unmatchedKept:0,unknown:0,sampleExcluded:[],sampleUnexpectedKept:[],ms:0};
    return {
      check:function(r){
        stat.rows++;
        const out=check(r,family);
        r._regionDecision=out;
        if(!out.schoolProvince)stat.unknown++;
        if(out.matched)stat.matched++;
        if(out.pass){stat.kept++; if(mode==='hard' && t.length && !out.matched && stat.sampleUnexpectedKept.length<5)stat.sampleUnexpectedKept.push({school:r.school,major:r.major,province:out.schoolProvince,reason:out.reason}); if(mode==='soft' && t.length && !out.matched)stat.unmatchedKept++;}
        else{stat.excluded++; if(stat.sampleExcluded.length<8)stat.sampleExcluded.push({school:r.school,major:r.major,province:out.schoolProvince,reason:out.reason});}
        return out;
      },
      summary:function(){ stat.ms=Math.round(perf()-start); dbg('regionFilterDebug',stat); return Object.assign({},stat); }
    };
  }
  window.LN_REGION_FILTER_RULES_V2983FIX5={norm,check,collector,ready:true,version:'v2983fix5'};
})();
