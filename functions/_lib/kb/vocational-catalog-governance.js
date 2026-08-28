export const VOCATIONAL_CATALOG_GOVERNANCE_VERSION='vocational-catalog-governance-v1.0.0';

export const VOCATIONAL_CATALOG_GOVERNANCE=Object.freeze({
  mode:'delegated_authoritative_canonical_index',
  reason:'职业教育专业目录由教育部按经济社会发展需要动态更新；仓库不得复制一份会与教育部现行目录竞争的长期静态真源。',
  authority:Object.freeze({
    issuer:'教育部',
    baseCatalogTitle:'职业教育专业目录（2021年）',
    baseCatalogSourceUrl:'https://www.moe.gov.cn/srcsite/A07/moe_953/202103/t20210319_521135.html',
    officialSettingPlatform:'https://zyyxzy.moe.edu.cn/',
    sourceClass:'national_vocational_authority',
    authorityLevel:'A0'
  }),
  baseSnapshot:Object.freeze({
    year:2021,
    majorCategoryCount:19,
    majorClassCount:97,
    majorCount:1349,
    secondaryVocationalCount:358,
    higherVocationalCollegeCount:744,
    vocationalBachelorCount:247
  }),
  currentUpdateEvidence:Object.freeze({
    announcedAt:'2026-07-15',
    updateLabel:'职业教育专业目录（2021年）（更新时间：2026年7月）',
    addedMajorCount:27,
    addedHigherVocationalCollegeCount:9,
    addedVocationalBachelorCount:18,
    enrollmentStartYear:2027,
    sourceUrl:'https://www.moe.gov.cn/jyb_xwfb/gzdt_gzdt/s5987/202607/t20260715_1443823.html'
  }),
  freshness:Object.freeze({
    temperature:'T2',
    liveIdentityRequired:true,
    localSnapshotMayDefineCurrentIdentity:false,
    rule:'涉及具体职业教育专业当前名称、代码、层次、增设/撤销或能否在某招生年度招生时，必须查询教育部当前目录/专业设置平台；本地基表仅用于解释目录结构与版本沿革。'
  })
});

export function vocationalCatalogGovernanceSnapshot(){
  const g=VOCATIONAL_CATALOG_GOVERNANCE;
  return{
    version:VOCATIONAL_CATALOG_GOVERNANCE_VERSION,
    mode:g.mode,
    baseMajorCount:g.baseSnapshot.majorCount,
    officialSettingPlatform:g.authority.officialSettingPlatform,
    latestKnownUpdate:g.currentUpdateEvidence.announcedAt,
    latestKnownAddedMajors:g.currentUpdateEvidence.addedMajorCount,
    latestKnownEnrollmentStartYear:g.currentUpdateEvidence.enrollmentStartYear,
    liveIdentityRequired:g.freshness.liveIdentityRequired
  };
}
