// V2.9.8 candidate catalog normalizer: extract catalog-level evidence from real candidate rows.
(function(){
  function clean(v){return String(v??'').trim();}
  function normCode(v){return clean(v).toUpperCase().replace(/[^0-9A-Z]/g,'');}
  function normText(v){return clean(v).replace(/\s+/g,'').replace(/[（）()【】\[\]·•,，;；:：/\\|-]/g,'');}
  function pick(r, keys){for(const k of keys){const v=r&&r[k]; if(v!==undefined && v!==null && String(v).trim()!=='')return String(v).trim();} return '';}
  function normalize(r){
    const official=r?.officialUndergrad2026||{};
    const majorCode=normCode(pick(r,['officialMajorCode']) || official.majorCode || '');
    const categoryCode=normCode(pick(r,['officialCategoryCode']) || official.categoryCode || '');
    const disciplineCode=normCode(pick(r,['officialDisciplineCode']) || official.disciplineCode || '');
    const standardName=pick(r,['officialMajorName','undergradMajorName','cleanMajor','mainMajorV29475']) || official.majorName || '';
    const categoryName=pick(r,['undergradCategoryName','officialCategoryName']) || official.categoryName || '';
    const disciplineName=pick(r,['undergradDisciplineName']) || official.disciplineName || '';
    const enrollmentName=pick(r,['major','majorText','rawMajor','cleanMajor']) || '';
    const confidence=pick(r,['taxonomyConfidence']) || official.confidence || '';
    const catalogKind=pick(r,['officialCatalogKind']) || official.kind || '';
    const text=[enrollmentName,standardName,categoryName,disciplineName,pick(r,['subjectGroup','primaryDisciplineNames','primaryDisciplineCodes'])].filter(Boolean).join(' ');
    return {majorCode,categoryCode,disciplineCode,standardName,categoryName,disciplineName,enrollmentName,confidence,catalogKind,text,normText:normText(text),raw:r||{}};
  }
  function hasReliableCatalog(c){return !!(c.majorCode||c.categoryCode||c.standardName);}
  const api={normalize,normCode,normText,hasReliableCatalog,ready:true};
  window.LN_CANDIDATE_CATALOG_NORMALIZER_V298=api;
})();
