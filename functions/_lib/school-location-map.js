const SCHOOL_LOCATION_MAP = {
  '辽宁大学': { province: '辽宁', city: '沈阳', confidence: 'high' },
  '东北大学': { province: '辽宁', city: '沈阳', confidence: 'high' },
  '沈阳工业大学': { province: '辽宁', city: '沈阳', confidence: 'high' },
  '沈阳航空航天大学': { province: '辽宁', city: '沈阳', confidence: 'high' },
  '沈阳理工大学': { province: '辽宁', city: '沈阳', confidence: 'high' },
  '沈阳建筑大学': { province: '辽宁', city: '沈阳', confidence: 'high' },
  '沈阳农业大学': { province: '辽宁', city: '沈阳', confidence: 'high' },
  '中国医科大学': { province: '辽宁', city: '沈阳', confidence: 'high' },
  '沈阳药科大学': { province: '辽宁', city: '沈阳', confidence: 'high' },
  '沈阳师范大学': { province: '辽宁', city: '沈阳', confidence: 'high' },
  '沈阳大学': { province: '辽宁', city: '沈阳', confidence: 'high' },
  '沈阳化工大学': { province: '辽宁', city: '沈阳', confidence: 'high' },
  '大连理工大学': { province: '辽宁', city: '大连', confidence: 'high' },
  '大连海事大学': { province: '辽宁', city: '大连', confidence: 'high' },
  '东北财经大学': { province: '辽宁', city: '大连', confidence: 'high' },
  '大连医科大学': { province: '辽宁', city: '大连', confidence: 'high' },
  '大连交通大学': { province: '辽宁', city: '大连', confidence: 'high' },
  '大连工业大学': { province: '辽宁', city: '大连', confidence: 'high' },
  '大连大学': { province: '辽宁', city: '大连', confidence: 'high' },
  '大连民族大学': { province: '辽宁', city: '大连', confidence: 'high' },
  '大连外国语大学': { province: '辽宁', city: '大连', confidence: 'high' },
  '辽宁师范大学': { province: '辽宁', city: '大连', confidence: 'high' },
  '辽宁工程技术大学': { province: '辽宁', city: '阜新', confidence: 'medium', warning: '办学地点/校区需以招生章程为准' },
  '辽宁科技大学': { province: '辽宁', city: '鞍山', confidence: 'high' },
  '鞍山师范学院': { province: '辽宁', city: '鞍山', confidence: 'high' },
  '辽宁石油化工大学': { province: '辽宁', city: '抚顺', confidence: 'high' },
  '辽宁工业大学': { province: '辽宁', city: '锦州', confidence: 'high' },
  '锦州医科大学': { province: '辽宁', city: '锦州', confidence: 'high' },
  '渤海大学': { province: '辽宁', city: '锦州', confidence: 'high' },
  '辽宁中医药大学': { province: '辽宁', city: '沈阳', confidence: 'medium', warning: '校区/办学地点需核验' },
  '辽东学院': { province: '辽宁', city: '丹东', confidence: 'high' },
  '营口理工学院': { province: '辽宁', city: '营口', confidence: 'high' },
  '辽宁科技学院': { province: '辽宁', city: '本溪', confidence: 'high' },
  '沈阳工程学院': { province: '辽宁', city: '沈阳', confidence: 'high' },
  '辽宁警察学院': { province: '辽宁', city: '大连', confidence: 'high' },
  '大连东软信息学院': { province: '辽宁', city: '大连', confidence: 'high' }
};

export function getSchoolLocation(school) {
  const name = String(school || '').trim();
  if (!name) return null;
  if (SCHOOL_LOCATION_MAP[name]) return SCHOOL_LOCATION_MAP[name];

  for (const key of Object.keys(SCHOOL_LOCATION_MAP)) {
    if (name.includes(key) || key.includes(name)) return SCHOOL_LOCATION_MAP[key];
  }

  return null;
}
