export const ACADEMIC_BACKGROUND_SOURCE_REGISTRY_VERSION = 'academic-background-sources-v3968_0';

const source = value => Object.freeze({
  ...value,
  official: value.official === true,
  canSupportSchoolIdentity: value.canSupportSchoolIdentity === true,
  canSupportDisciplineEvidence: value.canSupportDisciplineEvidence === true,
  canSupportMajorMapping: value.canSupportMajorMapping === true
});

export const ACADEMIC_BACKGROUND_SOURCE_REGISTRY = Object.freeze({
  MOE_211_2005: source({
    sourceId: 'MOE_211_2005',
    sourceTitle: '教育部：“211工程”学校名单',
    authority: '中华人民共和国教育部',
    sourceType: 'official-membership-list',
    sourceYear: '2005',
    publishedAt: '2005-12-23',
    retrievedAt: '2026-07-27',
    sourceUrl: 'https://www.moe.gov.cn/srcsite/A22/s7065/200512/t20051223_82762.html',
    sourceHash: 'url-locked-moe-211-2005',
    official: true,
    canSupportSchoolIdentity: true,
    canSupportDisciplineEvidence: false,
    canSupportMajorMapping: false
  }),
  MOE_DOUBLE_FIRST_CLASS_2022: source({
    sourceId: 'MOE_DOUBLE_FIRST_CLASS_2022',
    sourceTitle: '第二轮“双一流”建设高校及建设学科名单',
    authority: '教育部、财政部、国家发展改革委',
    sourceType: 'official-discipline-list',
    sourceYear: '2022',
    publishedAt: '2022-02-14',
    retrievedAt: '2026-07-27',
    sourceUrl: 'https://hudong.moe.gov.cn/srcsite/A22/s7065/202202/t20220211_598710.html',
    sourceHash: 'url-locked-moe-double-first-class-2022',
    official: true,
    canSupportSchoolIdentity: true,
    canSupportDisciplineEvidence: true,
    canSupportMajorMapping: false
  }),
  MOE_FOURTH_DISCIPLINE_2017: source({
    sourceId: 'MOE_FOURTH_DISCIPLINE_2017',
    sourceTitle: '全国第四轮学科评估结果及教育部学位中心说明',
    authority: '教育部学位与研究生教育发展中心',
    sourceType: 'official-discipline-evaluation',
    sourceYear: '2017',
    publishedAt: '2017-12-28',
    retrievedAt: '2026-07-27',
    sourceUrl: 'https://www.moe.gov.cn/jyb_xwfb/s271/201712/t20171228_323245.html',
    sourceHash: 'url-locked-moe-fourth-discipline-2017',
    official: true,
    canSupportSchoolIdentity: false,
    canSupportDisciplineEvidence: true,
    canSupportMajorMapping: false
  }),
  MOE_DEGREE_AUTH_2023: source({
    sourceId: 'MOE_DEGREE_AUTH_2023',
    sourceTitle: '国务院学位委员会2023年度新增博士硕士学位授权单位及授权点名单',
    authority: '国务院学位委员会',
    sourceType: 'official-degree-authorization-increment',
    sourceYear: '2024',
    publishedAt: '2024-11-07',
    retrievedAt: '2026-07-27',
    sourceUrl: 'https://www.moe.gov.cn/srcsite/A22/yjss_xwgl/moe_818/202411/t20241107_1161144.html',
    sourceHash: 'url-locked-moe-degree-auth-2023',
    official: true,
    canSupportSchoolIdentity: false,
    canSupportDisciplineEvidence: true,
    canSupportMajorMapping: false
  }),
  LEGACY_LOCAL_MAINLINE_INPUT: source({
    sourceId: 'LEGACY_LOCAL_MAINLINE_INPUT',
    sourceTitle: '省内专业背景旧KB迁移输入',
    authority: '仓库历史资产',
    sourceType: 'legacy-migration-input',
    sourceYear: '2026-06',
    publishedAt: '',
    retrievedAt: '2026-07-27',
    sourceUrl: '',
    sourceHash: 'legacy-v3933_12',
    official: false,
    canSupportSchoolIdentity: false,
    canSupportDisciplineEvidence: false,
    canSupportMajorMapping: false
  }),
  LEGACY_211_MAINLINE_INPUT: source({
    sourceId: 'LEGACY_211_MAINLINE_INPUT',
    sourceTitle: '211专业背景旧KB迁移输入',
    authority: '仓库历史资产',
    sourceType: 'legacy-migration-input',
    sourceYear: '2026-06',
    publishedAt: '',
    retrievedAt: '2026-07-27',
    sourceUrl: '',
    sourceHash: 'legacy-v3933_14-v3933_16',
    official: false,
    canSupportSchoolIdentity: false,
    canSupportDisciplineEvidence: false,
    canSupportMajorMapping: false
  })
});

export function getAcademicBackgroundSource(sourceId) {
  return ACADEMIC_BACKGROUND_SOURCE_REGISTRY[sourceId] || null;
}

export function listAcademicBackgroundSources({ officialOnly = false } = {}) {
  const values = Object.values(ACADEMIC_BACKGROUND_SOURCE_REGISTRY);
  return officialOnly ? values.filter(item => item.official) : values;
}
