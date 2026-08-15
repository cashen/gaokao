export const AI_CLAIM_EVIDENCE_VERSION='ai-claim-evidence-v0.03';
const RISKY_QUANTITATIVE=/(就业率|升学率|保研率|推免率|薪资|工资|月薪|年薪|央企.*%|国企.*%|百分之|\d+(?:\.\d+)?%)/;
function clean(value,max=1800){return String(value==null?'':value).replace(/\s+/g,' ').trim().slice(0,max);}
function hash(value=''){let h=2166136261;for(const ch of String(value)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0).toString(36);}
function yearFromText(text=''){const m=String(text||'').match(/20(?:2[0-9]|1[0-9])/);return m?Number(m[0]):null;}
function sourceAllowed(source={}){const name=clean(source.sourceName,120),url=clean(source.sourceUrl,900);if(!name)return false;if(url.startsWith('/'))return true;try{const u=new URL(url);return u.protocol==='https:';}catch{return false;}}
export function createEvidenceClaim({subject='',dimension='general',value='',year=null,scope='',source={},confidence='verified',origin='official'}={}){
  const text=clean(value,1200),resolvedYear=Number(year)||yearFromText(text);if(!clean(subject,160)||!text||!sourceAllowed(source))return null;if(RISKY_QUANTITATIVE.test(text)&&!resolvedYear)return null;
  const claim={version:AI_CLAIM_EVIDENCE_VERSION,subject:clean(subject,160),dimension:clean(dimension,60),value:text,year:resolvedYear||null,scope:clean(scope,220),source:{sourceName:clean(source.sourceName,120),sourceUrl:clean(source.sourceUrl,900),publishedAt:clean(source.publishedAt,80),accessedAt:clean(source.accessedAt,80)},confidence:clean(confidence,30)||'verified',origin:clean(origin,30)||'official'};
  claim.claimId=`C-${hash([claim.subject,claim.dimension,claim.value,claim.year,claim.source.sourceUrl].join('|'))}`;return claim;
}
export function claimsFromOfficialText({school='',major='',dimension='general',text='',sources=[]}={}){
  const raw=String(text||''),keywords={employment:/(就业|毕业|去向|用人单位|签约|招聘|岗位|国企|央企)/,curriculum:/(课程|培养|实验|实践|实习|学分|专业核心|培养目标)/,postgraduate:/(推免|保研|研究生|升学|考研|深造)/,cost:/(学费|住宿费|收费|费用)/,official_policy:/(转专业|调剂|录取|体检|选科|校区)/}[dimension]||/.+/,source=(sources||[]).find(item=>item?.sourceUrl)||sources?.[0]||{},sentences=raw.replace(/\r/g,'').split(/\n+|(?<=[。！？；])\s*/).map(v=>clean(v,700)).filter(v=>v.length>=18&&keywords.test(v)).slice(0,5),claims=[];
  for(const sentence of sentences){const claim=createEvidenceClaim({subject:[school,major].filter(Boolean).join(' · ')||school,dimension,value:sentence,scope:'学校官方/阳光高考公开材料中的本轮相关段落',source:{sourceName:source.sourceName||'学校官方资料',sourceUrl:source.sourceUrl||'',publishedAt:source.updatedAt||''},origin:'official'});if(claim)claims.push(claim);}return claims.slice(0,4);
}
export function claimToEvidence(claim={}){return{level:'A',sourceName:claim.source?.sourceName||'官方证据',sourceUrl:claim.source?.sourceUrl||'',scope:[claim.subject,claim.dimension,claim.year?String(claim.year):'',claim.value].filter(Boolean).join(' · ').slice(0,420),claimId:claim.claimId||''};}
export function validateClaimSet(claims=[]){const ids=new Set();for(const claim of claims||[]){if(!claim?.claimId||ids.has(claim.claimId)||!sourceAllowed(claim.source||{}))return false;if(RISKY_QUANTITATIVE.test(String(claim.value||''))&&!Number(claim.year))return false;ids.add(claim.claimId);}return true;}
