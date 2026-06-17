export const ADVISOR_ZONE_POLICIES = {
  'missing-rank-zone': {
    zoneKey: 'missing-rank-zone',
    zoneName: '位次待核验区',
    humanName: '位次待核验区',
    mainGoal: '先补齐考生分数、当年一分一段和控制线配置。',
    mainConflict: '没有位次锚点时，分段结构和后段是否够稳只能做粗略讨论。',
    preferDirections: ['补齐分数与位次', '核验当年一分一段'],
    cautionDirections: ['不要用裸分直接判断志愿安全度'],
    bottomLineAdvice: '先完成位次换算，再做排序诊断。',
    forbiddenOverstatements: ['过度乐观', '保证录取', '不用复核']
  },
  'below-undergraduate-zone': {
    zoneKey: 'below-undergraduate-zone',
    zoneName: '本科线下 / 专科与本科边界外',
    humanName: '本科线下区',
    mainGoal: '先判断是否还有本科补录、征集或专科优质路径，不把本科当唯一答案。',
    mainConflict: '核心不是冲高，而是确认学历层次、学费、专业技能和后续升学通道。',
    preferDirections: ['优质专科专业', '专升本路径', '就业技能清楚方向'],
    cautionDirections: ['高收费低接受度项目', '只为本科名义盲报'],
    bottomLineAdvice: '后段必须是真正能接受的学校、专业、学费和城市。',
    forbiddenOverstatements: ['保证本科', '低估风险']
  },
  'undergraduate-edge-zone': {
    zoneKey: 'undergraduate-edge-zone',
    zoneName: '本科线边缘区 / 本科资格守门区',
    humanName: '本科线边缘区',
    mainGoal: '先守住本科机会，同时核验办学性质、学费和专业接受度。',
    mainConflict: '够到本科和上一个能读下去的本科，是两件事。',
    preferDirections: ['本科边缘可接受项目', '应用型专业', '学费可控方向'],
    cautionDirections: ['民办高收费未核验', '偏远且不接受专业', '只低分凑数'],
    bottomLineAdvice: '后段是否够稳必须可接受，不建议为了低分安全堆完全不想读的专业。',
    forbiddenOverstatements: ['稳录本科', '随便保']
  },
  'undergraduate-quality-zone': {
    zoneKey: 'undergraduate-quality-zone',
    zoneName: '本科线上方 / 本科质量守门区',
    humanName: '本科质量守门区',
    mainGoal: '把本科质量、办学性质、专业接受度和家庭费用承受能力一起守住。',
    mainConflict: '不是只有能不够到本科，更要看上什么本科、多少钱、读什么专业。',
    preferDirections: ['应用型技术方向', '可接受公办/民办项目', '就业路径较清楚专业'],
    cautionDirections: ['高收费未核验', '完全不接受专业', '只看低分不看办学质量'],
    bottomLineAdvice: '后段后段是否够稳要真实可读，不能只看比自己低多少分。',
    forbiddenOverstatements: ['本科线索够了', '不用后段是否够稳']
  },
  'public-sensitive-zone': {
    zoneKey: 'public-sensitive-zone',
    zoneName: '公办本科竞争敏感区',
    humanName: '公办本科竞争敏感区',
    mainGoal: '稳住公办本科机会，防止浅后段是否够稳和热门专业扎堆。',
    mainConflict: '分数看着不低，但公办热门方向竞争集中，浅后段是否够稳可能失效。',
    preferDirections: ['省内外可接受公办', '应用工科', '专业接受度高的后段是否够稳项'],
    cautionDirections: ['冲刺过多', '同城同专业扎堆', '民办/高收费未核验'],
    bottomLineAdvice: '后段是否够稳要按位次深度拉开，且学校、城市、专业、学费都要能接受。',
    forbiddenOverstatements: ['公办线索够了', '贴线后段是否够稳足够']
  },
  'special-edge-zone': {
    zoneKey: 'special-edge-zone',
    zoneName: '特控线边缘区 / 公办质量守门区',
    humanName: '特控线边缘区',
    mainGoal: '稳妥区要厚，后段是否够稳区要深，避免只用低几分的浅后段是否够稳。',
    mainConflict: '开始进入更高层次门口，但稳定性还不够强。',
    preferDirections: ['省内公办', '应用工科', '可接受专业', '低收费稳妥项'],
    cautionDirections: ['盲目冲热门', '用低几分当后段是否够稳', '高收费/中外合作未核验'],
    bottomLineAdvice: '后段是否够稳要按位次深度下探，后段必须是家庭和孩子都能接受的学校专业。',
    forbiddenOverstatements: ['特控线上就大胆冲', '特控线以上不等于安全']
  },
  'applied-tech-main-zone': {
    zoneKey: 'applied-tech-main-zone',
    zoneName: '应用型技术本科主体区',
    humanName: '应用型技术本科主体区',
    mainGoal: '用应用工科、老牌公办和可积累技能的方向形成主体承接。',
    mainConflict: '不是单纯追校名，而是看专业能否形成技能积累、就业入口和考研跳板。',
    preferDirections: ['机械', '自动化', '电气相关', '电子信息', '计算机软件', '智能制造'],
    cautionDirections: ['新办AI/微电子需核验师资实验室', '普通经管泛化', '把稍高目标当主体'],
    bottomLineAdvice: '后段是否够稳仍要守住公办、学费和专业接受度，主体区不能只靠冲刺。',
    forbiddenOverstatements: ['只选工科', '电气必然最好']
  },
  'industry-entry-zone': {
    zoneKey: 'industry-entry-zone',
    zoneName: '行业入口选择区',
    humanName: '行业入口选择区',
    mainGoal: '在行业院校、专业质量、省内外路径和未来就业方向之间做清晰取舍。',
    mainConflict: '选普通学校好专业，还是选更有行业属性的平台。',
    preferDirections: ['电力', '机械自动化', '交通', '石油化工', '装备制造', '电子信息'],
    cautionDirections: ['行业红利被夸大', '只看城市不看专业', '医学/师范/土木路径误判'],
    bottomLineAdvice: '后段是否够稳不必过度下沉，但必须保留可接受的稳妥公办项。',
    forbiddenOverstatements: ['本科过度乐观央国企', '行业院校一定好就业']
  },
  'industry-platform-zone': {
    zoneKey: 'industry-platform-zone',
    zoneName: '特色行业院校选择区',
    humanName: '特色行业院校选择区',
    mainGoal: '比较省内平台、省外特色行业院校、专业质量、地域成本和家庭容错。',
    mainConflict: '要平台、要专业、要城市、要行业，必须先排优先级。',
    preferDirections: ['行业特色院校', '省内211可接受专业', '电力/交通/石油/邮电/装备等行业入口'],
    cautionDirections: ['只看校名', '盲目省外', '忽略家庭城市成本', '中外合作预算未核验'],
    bottomLineAdvice: '后段是否够稳以可接受为底线，不要为了“保”填心里不能接受的专业。',
    forbiddenOverstatements: ['省外一定更好', '211冷门一定值']
  },
  'platform-major-balance-zone': {
    zoneKey: 'platform-major-balance-zone',
    zoneName: '平台与专业博弈区',
    humanName: '平台与专业博弈区',
    mainGoal: '把平台、专业、城市和未来路径排顺。',
    mainConflict: '追平台可能牺牲专业，追热门专业可能放弃明显平台优势。',
    preferDirections: ['优质平台可接受专业', '行业特色院校可接受专业', '读研/考公/就业路径明确方向'],
    cautionDirections: ['为了校名接受完全不能读的专业', '只追热门专业放弃平台', '无效稍高目标'],
    bottomLineAdvice: '高分段后段是否够稳重在可接受和路径清楚，不是越低越好。',
    forbiddenOverstatements: ['985/211一定优先', '热门专业一定优先']
  },
  'high-platform-zone': {
    zoneKey: 'high-platform-zone',
    zoneName: '高分平台优先区',
    humanName: '高分平台优先区',
    mainGoal: '在平台价值、专业牺牲边界、保研升学和城市之间精细排序。',
    mainConflict: '平台优势已经重要，但专业牺牲不能超过孩子长期承受边界。',
    preferDirections: ['高平台可接受专业', '强专业强城市组合', '升学和保研路径'],
    cautionDirections: ['过度追校名', '完全不接受冷门专业', '忽略城市与专业长期成本'],
    bottomLineAdvice: '后段是否够稳不应过度下沉，应选择路径清楚、专业能接受的高质量稳妥项。',
    forbiddenOverstatements: ['只看平台', '专业无所谓']
  },
  'top-platform-fine-sort-zone': {
    zoneKey: 'top-platform-fine-sort-zone',
    zoneName: '顶尖平台精细排序区',
    humanName: '顶尖平台精细排序区',
    mainGoal: '精细比较顶尖平台、强专业、城市、升学和长期发展。',
    mainConflict: '主要矛盾不是后段是否够稳，而是强平台与强专业的精细取舍。',
    preferDirections: ['高层次平台可接受专业', '强基/拔尖/本研路径', '长期发展匹配方向'],
    cautionDirections: ['盲目冲极限专业', '忽略专业兴趣和培养强度', '把普通后段是否够稳逻辑套到高分段'],
    bottomLineAdvice: '后段是否够稳以高质量可接受为底线，重点核验专业组、校区和培养路径。',
    forbiddenOverstatements: ['不用后段是否够稳', '随便报都好']
  }
};

export function getAdvisorZonePolicy(zoneKey) {
  return ADVISOR_ZONE_POLICIES[zoneKey] || ADVISOR_ZONE_POLICIES['missing-rank-zone'];
}

export function getAdvisorZonePolicies(zoneKeys = []) {
  const out = {};
  for (const key of zoneKeys) out[key] = getAdvisorZonePolicy(key);
  return out;
}
