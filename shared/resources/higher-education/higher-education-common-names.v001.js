import { findSchoolEntityByName } from '../schools/school-identity-center.js';

export const HIGHER_EDUCATION_COMMON_NAME_VERSION = 'higher-education-common-name-v001';
export const HIGHER_EDUCATION_COMMON_NAME_TYPE = '高校民间称谓';
export const HIGHER_EDUCATION_COMMON_NAME_NOTICE = '这是大家常用的高校叫法，不是教育部门的官方分类。';

const VERIFIED_COMMON_NAMES = Object.freeze([
  Object.freeze({
    id: 'east-china-five',
    name: '华东五校',
    sourceLabels: Object.freeze(['华东五虎']),
    memberSchoolNames: Object.freeze(['复旦大学', '上海交通大学', '南京大学', '浙江大学', '中国科学技术大学']),
    verificationLevel: 'public-cross-checked',
    sources: Object.freeze([
      'https://news.fudan.edu.cn/2018/1201/c5a54304/page.htm',
      'https://www.teach.ustc.edu.cn/notice/notice-info/9509.html'
    ])
  }),
  Object.freeze({
    id: 'national-defense-seven',
    name: '国防七子',
    sourceLabels: Object.freeze(['国防七子']),
    memberSchoolNames: Object.freeze(['北京航空航天大学', '北京理工大学', '哈尔滨工业大学', '哈尔滨工程大学', '南京航空航天大学', '南京理工大学', '西北工业大学']),
    verificationLevel: 'public-cross-checked',
    sources: Object.freeze([
      'https://zs.njust.edu.cn/77/97/c15357a358295/page.htm',
      'https://www.gk100.com/read_20544496.htm'
    ])
  }),
  Object.freeze({
    id: 'two-electronic-one-post',
    name: '两电一邮',
    sourceLabels: Object.freeze(['两电一邮']),
    memberSchoolNames: Object.freeze(['电子科技大学', '西安电子科技大学', '北京邮电大学']),
    verificationLevel: 'public-cross-checked',
    sources: Object.freeze([
      'https://www.gk100.com/read_8984659.htm',
      'https://youzy.cn/news/detail?id=693a761edcee1c00017246cb'
    ])
  }),
  Object.freeze({
    id: 'two-finance-one-trade',
    name: '两财一贸',
    sourceLabels: Object.freeze(['两财一贸']),
    memberSchoolNames: Object.freeze(['中央财经大学', '上海财经大学', '对外经济贸易大学']),
    verificationLevel: 'public-cross-checked',
    sources: Object.freeze([
      'https://www.gk100.com/read_3735675.htm',
      'https://zh.wikipedia.org/wiki/%E5%AF%B9%E5%A4%96%E7%BB%8F%E6%B5%8E%E8%B4%B8%E6%98%93%E5%A4%A7%E5%AD%A6'
    ])
  }),
  Object.freeze({
    id: 'old-eight-architecture',
    name: '建筑老八校',
    sourceLabels: Object.freeze(['建筑老八校']),
    memberSchoolNames: Object.freeze(['清华大学', '东南大学', '同济大学', '天津大学', '华南理工大学', '重庆大学', '哈尔滨工业大学', '西安建筑科技大学']),
    verificationLevel: 'public-cross-checked',
    sources: Object.freeze([
      'https://news.tongji.edu.cn/info/1003/77825.htm',
      'https://gaokao.eol.cn/gaokao/gkyc/201905/t20190509_1658006.shtml'
    ])
  }),
  Object.freeze({
    id: 'mechanical-four-dragons',
    name: '机械四小龙',
    sourceLabels: Object.freeze(['机械四小龙']),
    memberSchoolNames: Object.freeze(['合肥工业大学', '湖南大学', '吉林大学', '燕山大学']),
    verificationLevel: 'public-cross-checked',
    sources: Object.freeze([
      'https://xgb.hnu.edu.cn/info/1062/2952.htm',
      'https://www.sinogk.com/News/Details/1215712'
    ])
  }),
  Object.freeze({
    id: 'mechanical-five-tigers',
    name: '机械五虎',
    sourceLabels: Object.freeze(['机械五虎']),
    memberSchoolNames: Object.freeze(['清华大学', '上海交通大学', '华中科技大学', '西安交通大学', '哈尔滨工业大学']),
    verificationLevel: 'public-cross-checked',
    sources: Object.freeze([
      'https://www.sohu.com/a/960607907_121311734',
      'https://www.zizzs.com/c/202202/70093.html'
    ])
  }),
  Object.freeze({
    id: 'former-ministry-power-six',
    name: '电力部老六校',
    sourceLabels: Object.freeze(['电力部老六校']),
    memberSchoolNames: Object.freeze(['长沙理工大学', '三峡大学', '上海电力大学', '东北电力大学', '南京工程学院', '沈阳工程学院']),
    verificationLevel: 'public-cross-checked',
    sources: Object.freeze([
      'https://www.maigoo.com/top/445379.html',
      'https://qingtingxy.com/193957.html'
    ])
  })
]);

const byId = new Map(VERIFIED_COMMON_NAMES.map(item => [item.id, item]));
const byName = new Map(VERIFIED_COMMON_NAMES.map(item => [item.name, item]));

export function listHigherEducationCommonNames() {
  return VERIFIED_COMMON_NAMES.map(item => Object.freeze({
    id: item.id,
    name: item.name,
    type: HIGHER_EDUCATION_COMMON_NAME_TYPE,
    notice: HIGHER_EDUCATION_COMMON_NAME_NOTICE,
    verificationLevel: item.verificationLevel,
    memberSchoolNames: [...item.memberSchoolNames],
    sourceLabels: [...item.sourceLabels],
    sources: [...item.sources]
  }));
}

export function getHigherEducationCommonName(idOrName = '') {
  const key = String(idOrName || '').trim();
  return byId.get(key) || byName.get(key) || null;
}

export function resolveHigherEducationCommonNameSchools(idOrName = '') {
  const item = getHigherEducationCommonName(idOrName);
  if (!item) return Object.freeze({ status: 'unresolved', commonName: null, members: [] });
  const members = item.memberSchoolNames.map(name => findSchoolEntityByName(name)).filter(Boolean);
  const unresolvedNames = item.memberSchoolNames.filter(name => !members.some(entity => entity.displayName === name));
  if (unresolvedNames.length) {
    return Object.freeze({
      status: 'partial',
      commonName: item,
      members,
      unresolvedNames: Object.freeze(unresolvedNames)
    });
  }
  return Object.freeze({ status: 'resolved', commonName: item, members, unresolvedNames: Object.freeze([]) });
}

export function higherEducationCommonNameContext(idOrName = '') {
  const result = resolveHigherEducationCommonNameSchools(idOrName);
  if (!result.commonName) return null;
  return Object.freeze({
    commonNameId: result.commonName.id,
    commonName: result.commonName.name,
    commonNameType: HIGHER_EDUCATION_COMMON_NAME_TYPE,
    commonNameNotice: HIGHER_EDUCATION_COMMON_NAME_NOTICE,
    canonicalSchoolIds: result.members.map(entity => entity.entityId),
    canonicalSchoolNames: result.members.map(entity => entity.displayName),
    resolutionStatus: result.status,
    unresolvedSchoolNames: result.unresolvedNames || []
  });
}

export function higherEducationCommonNameHandoffPayload(schoolName = '', entityId = '') {
  const normalizedSchool = String(schoolName || '').trim();
  const matches = VERIFIED_COMMON_NAMES.filter(item => {
    const resolved = resolveHigherEducationCommonNameSchools(item.id);
    if (resolved.status !== 'resolved') return false;
    return resolved.members.some(entity => entity.displayName === normalizedSchool && (!entityId || entity.entityId === entityId));
  });
  const primary = matches[0] || null;
  const resolved = primary ? resolveHigherEducationCommonNameSchools(primary.id) : null;
  return Object.freeze({
    handoffContractVersion: 'higher-education-common-name-handoff-v001',
    sourceSurface: 'tongxue',
    sourceAction: 'view_common_name_schools',
    commonNameId: primary?.id || '',
    commonName: primary?.name || '',
    commonNameType: HIGHER_EDUCATION_COMMON_NAME_TYPE,
    canonicalSchoolId: resolved?.members.find(entity => entity.displayName === normalizedSchool)?.entityId || String(entityId || '').trim(),
    canonicalSchoolName: normalizedSchool,
    candidateSchoolIds: resolved?.members.map(entity => entity.entityId) || [],
    candidateSchoolNames: resolved?.members.map(entity => entity.displayName) || [],
    commonNameIds: matches.map(item => item.id)
  });
}
