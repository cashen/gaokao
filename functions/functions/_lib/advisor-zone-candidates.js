import { getAdvisorZonePolicy } from './advisor-zone-policy.js';

function cand(key, confidence, evidence = []) {
  const policy = getAdvisorZonePolicy(key);
  return {
    zoneKey: key,
    zoneName: policy.zoneName,
    humanName: policy.humanName || policy.zoneName,
    confidence,
    evidence: evidence.filter(Boolean).slice(0, 5),
    possibleMainGoal: policy.mainGoal,
    mainConflict: policy.mainConflict
  };
}

function addPair(primaryKey, secondaryKey, primaryConfidence, evidencePrimary, evidenceSecondary) {
  const out = [cand(primaryKey, primaryConfidence, evidencePrimary)];
  if (secondaryKey && secondaryKey !== primaryKey) out.push(cand(secondaryKey, Math.max(0.15, 1 - primaryConfidence), evidenceSecondary));
  return out;
}

export function buildZoneCandidates(facts = {}) {
  const score = facts.candidate?.score;
  const rank = facts.candidate?.rank;
  const sp = facts.offsets?.scoreOffsetFromSpecial;
  const ug = facts.offsets?.scoreOffsetFromUndergraduate;
  const rp = facts.offsets?.rankOffsetFromSpecial;
  const stats = facts.poolStructure || {};
  if (score == null || rank == null) return [cand('missing-rank-zone', 1, ['考生分数或一分一段位次缺失'])];

  // 本科线以下/附近，优先用本科线锚点。
  if (ug != null && ug < 0) return addPair('below-undergraduate-zone', 'undergraduate-edge-zone', 0.72, ['考生低于本科控制线', '应先讨论本科机会与专科优质路径'], ['接近本科线时仍可关注征集和边缘本科机会']);
  if (ug != null && ug <= 25) return addPair('undergraduate-edge-zone', 'undergraduate-quality-zone', 0.68, ['考生处于本科线附近', '首要任务是本科机会与专业接受度'], ['如果位次明显优于本科线，可上移到本科质量守门区']);
  if (sp != null && sp < -35) return addPair('undergraduate-quality-zone', 'public-sensitive-zone', 0.64, ['考生已高于本科线但距离特控线较远', '本科质量、学费和专业接受度是主矛盾'], ['若自选专业多为公办边缘项，需要按公办竞争敏感区复核']);
  if (sp != null && sp < 0) return addPair('public-sensitive-zone', 'special-edge-zone', 0.64, ['考生低于特控线但距离不远', '公办本科和热门专业竞争敏感'], ['若自选专业冲高较多，要按特控线边缘区的后段是否够稳复核']);

  // 特控线上方，用分差、位次差和自选专业结构共同给候选。
  const rushHeavy = stats.total >= 12 && stats.rushCount > Math.ceil(stats.total * 0.38);
  const platformHint = sp >= 75 || (rp != null && rp <= -34500);
  const topHint = sp >= 115 || (rp != null && rp <= -52000);
  const eliteHint = sp >= 155 || (rp != null && rp <= -70000);

  if (sp <= 15 || (rp != null && rp >= -7600)) return addPair('special-edge-zone', 'applied-tech-main-zone', 0.68, ['考生贴近特控线', '稳妥区和深后段是否够稳仍是重点'], ['如果自选专业应用工科承接足，可少量上移到应用技术主体区']);
  if (sp <= 35 || (rp != null && rp >= -18000)) return addPair('applied-tech-main-zone', 'industry-entry-zone', rushHeavy ? 0.55 : 0.66, ['考生明显高于特控线', '主体仍适合围绕应用工科和老牌公办承接'], ['已有部分行业院校/强专业选择空间']);
  if (sp <= 55 || (rp != null && rp >= -26000)) return addPair('industry-entry-zone', 'industry-platform-zone', 0.64, ['考生开始具备行业院校和专业选择权', '需要比较行业属性与专业质量'], ['若省外行业特色院校/211边缘较多，可辅助按特色行业院校区判断']);
  if (sp <= 75 || (rp != null && rp >= -34500)) return addPair('industry-platform-zone', 'platform-major-balance-zone', 0.62, ['考生进入特色行业院校选择区', '平台、行业、城市和家庭容错需要排序'], ['若高平台冲刺较多，要按平台专业博弈区复核']);
  if (sp <= 105) return addPair('platform-major-balance-zone', 'high-platform-zone', 0.62, ['考生进入平台与专业博弈区', '不能只看校名或只看热门专业'], ['分数位次已具备部分高平台比较空间']);
  if (sp <= 145) return addPair('high-platform-zone', 'top-platform-fine-sort-zone', 0.62, ['考生进入高分平台优先区', '平台价值、专业牺牲边界和城市需要综合判断'], ['如果接近顶尖平台边缘，需要更精细排序']);
  return addPair('top-platform-fine-sort-zone', 'high-platform-zone', 0.64, ['考生处于顶尖平台精细排序区', '主矛盾是强平台强专业和长期发展匹配'], ['仍需设置高质量可接受后段是否够稳']);
}
