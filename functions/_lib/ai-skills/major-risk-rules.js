function includesAny(text, words) {
  const s = String(text || '');
  return words.some(w => s.includes(w));
}

export function classifyMajorReality(record = {}) {
  const major = `${record.major || ''}${record.school || ''}`;
  const tags = [];

  if (includesAny(major, ['电气工程', '电气类', '智能电网', '新能源科学与工程'])) {
    tags.push({ key: 'electric', level: 'positive', text: '电气/电网方向确定性较高，AI时代基础设施需求有支撑。' });
  }

  if (includesAny(major, ['自动化', '机器人工程', '智能制造', '控制科学'])) {
    tags.push({ key: 'automation', level: 'positive', text: '自动化/控制方向与工业升级、机器人相关，但核心岗位通常要求持续学习。' });
  }

  if (includesAny(major, ['计算机', '软件工程', '人工智能', '数据科学', '网络空间安全'])) {
    tags.push({ key: 'cs', level: 'conditional', text: '计算机仍有性价比，但入门层受AI工具重塑，需要叠加AI工具和工程能力。' });
  }

  if (includesAny(major, ['临床医学', '口腔医学', '医学影像', '麻醉学'])) {
    tags.push({ key: 'medicine', level: 'positive', text: '医学有执照和临床场景护城河，但学制长、早期收入低，需要家庭能承受。' });
  }

  if (includesAny(major, ['护理'])) {
    tags.push({ key: 'nursing', level: 'positive', text: '护理就业确定性较高，夜班和工作强度是现实代价。' });
  }

  if (includesAny(major, ['汉语言文学', '师范', '小学教育', '思想政治教育'])) {
    tags.push({ key: 'teacher', level: 'positive', text: '师范/汉语言适合追求稳定和考编路径，但要关注地区编制竞争。' });
  }

  if (includesAny(major, ['法学'])) {
    tags.push({ key: 'law', level: 'conditional', text: '法学要看院校层次和法考路径，院校平台一般时需要谨慎评估就业质量。' });
  }

  if (includesAny(major, ['金融', '经济学', '投资学', '保险学'])) {
    tags.push({ key: 'finance', level: 'risk', text: '金融资源依赖度高，普通院校本科底层岗位和AI冲击风险都要重点提示。' });
  }

  if (includesAny(major, ['会计', '财务管理', '审计'])) {
    tags.push({ key: 'accounting', level: 'conditional', text: '会计基础岗受AI压缩，需叠加CPA、税务、数据和AI工具能力。' });
  }

  if (includesAny(major, ['新闻', '传播', '广告', '网络与新媒体'])) {
    tags.push({ key: 'media', level: 'risk', text: '新闻传播叠加行业收缩和AI内容生产冲击，普通家庭需谨慎。' });
  }

  if (includesAny(major, ['土木工程', '建筑学', '城乡规划', '房地产'])) {
    tags.push({ key: 'civil', level: 'risk', text: '土木/地产链处于周期调整期，入门层就业质量需谨慎核验。' });
  }

  if (includesAny(major, ['生物技术', '生物科学', '化学', '材料', '环境工程'])) {
    tags.push({ key: 'bio-chem-material', level: 'risk', text: '生化环材本科直接就业一般，需要确认是否能接受读研和长期积累。' });
  }

  if (includesAny(major, ['行政管理', '工商管理', '市场营销', '人力资源'])) {
    tags.push({ key: 'management', level: 'risk', text: '管理类本科就业出口不够硬，普通家庭不宜只看名称。' });
  }

  if (includesAny(major, ['英语', '日语', '俄语', '法语', '德语', '西班牙语', '小语种'])) {
    tags.push({ key: 'language', level: 'risk', text: '单一语言专业受AI翻译冲击明显，需要叠加法律、经贸、外交等第二能力。' });
  }

  return tags;
}

export function schoolLayerTags(record = {}) {
  const tags = [];
  const schoolTags = Array.isArray(record.schoolTags) ? record.schoolTags : [];

  if (schoolTags.includes('985')) tags.push('985平台');
  else if (schoolTags.includes('211')) tags.push('211平台');
  else if (schoolTags.includes('双一流')) tags.push('双一流平台');
  else if (String(record.natureLabel || '').includes('公办')) tags.push('公办本科');
  else if (String(record.natureLabel || '').includes('民办')) tags.push('民办/独立学院');

  if (record.displayLocation) tags.push(`地域：${record.displayLocation}`);
  if (record.geoEntity && record.geoEntity !== record.school) tags.push(`办学实体：${record.geoEntity}`);
  if (record.locationWarning) tags.push(`校区核验：${record.locationWarning}`);

  return tags;
}
