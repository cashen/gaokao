function text(value) { return String(value == null ? '' : value).trim(); }
function hasAny(source, re) { return re.test(text(source)); }
function keywordText(keywordQuery = {}, raw = '') {
  const parts = [raw, ...(keywordQuery.projectKeywords || []), ...(keywordQuery.rawTokens || []), ...(keywordQuery.majorKeywords || [])];
  return parts.map(text).filter(Boolean).join(' ');
}
export const FILTER_CONFLICT_TYPES = {
  SINO_PUBLIC_REGULAR: 'sino_excluded_by_public_regular',
  SPECIAL_HIDDEN: 'special_hidden_by_default',
  PRIVATE_PUBLIC_ONLY: 'private_excluded_by_public'
};
export function buildFilterConflicts({ keywordQuery = {}, rawKeywordText = '', bottomLineMode = 'all', specialProjectMode = 'hide_eligibility_projects', querySignature = '', confirmedSignatures = [] } = {}) {
  const raw = keywordText(keywordQuery, rawKeywordText);
  const conflicts = [];
  const hasSino = hasAny(raw, /中外|合作办学|高收费|较高收费|国际本科|国际班/);
  const hasSpecial = hasAny(raw, /定向|专项|公费师范|优师|预科|民族班|公安|司法|航海|轮机/);
  const hasPrivate = hasAny(raw, /民办|独立学院|独立院校/);
  if (hasSino && bottomLineMode === 'public_regular_only') {
    conflicts.push({
      level: 'warn',
      type: FILTER_CONFLICT_TYPES.SINO_PUBLIC_REGULAR,
      signature: `${FILTER_CONFLICT_TYPES.SINO_PUBLIC_REGULAR}|${querySignature || raw}`,
      message: '你选择了“只看公办普通”，同时搜索“中外/高收费”。这两个条件方向相反：公办普通会排除中外/高收费项目。',
      explanation: '如果家庭可以接受较高学费和合作培养模式，应切换为“公办含中外/高收费”；如果不接受，就去掉中外/高收费关键词。',
      actions: [
        { type: 'switch_bottomline', target: 'public_include_sino', label: '切换为公办含中外/高收费' },
        { type: 'remove_keyword_group', target: 'sino_high_fee', label: '去掉中外/高收费关键词' },
        { type: 'keep_current', label: '继续按当前条件查看' }
      ]
    });
  }
  if (hasSpecial && specialProjectMode !== 'show_eligibility_projects') {
    conflicts.push({
      level: 'warn',
      type: FILTER_CONFLICT_TYPES.SPECIAL_HIDDEN,
      signature: `${FILTER_CONFLICT_TYPES.SPECIAL_HIDDEN}|${querySignature || raw}`,
      message: '你正在搜索定向、专项、公费师范、预科等需要资格核验的项目，但当前系统默认隐藏这类项目。',
      explanation: '这类项目通常涉及资格、协议、服务年限、批次、体检或政审，不能按普通专业简单比较。',
      actions: [
        { type: 'switch_special_project', target: 'show_eligibility_projects', label: '显示特殊项目' },
        { type: 'remove_keyword_group', target: 'special_project', label: '去掉特殊项目关键词' },
        { type: 'keep_current', label: '继续隐藏，只看普通项目' }
      ]
    });
  }
  if (hasPrivate && (bottomLineMode === 'public_regular_only' || bottomLineMode === 'public_include_sino')) {
    conflicts.push({
      level: 'warn',
      type: FILTER_CONFLICT_TYPES.PRIVATE_PUBLIC_ONLY,
      signature: `${FILTER_CONFLICT_TYPES.PRIVATE_PUBLIC_ONLY}|${querySignature || raw}`,
      message: '你选择了只看公办，同时搜索民办或独立学院。当前条件会排除你搜索的项目。',
      explanation: '如果想比较民办或独立学院，需要切换为“全部院校”；如果只想看公办，应去掉民办相关关键词。',
      actions: [
        { type: 'switch_bottomline', target: 'all', label: '切换为全部院校' },
        { type: 'remove_keyword_group', target: 'private_school', label: '去掉民办关键词' },
        { type: 'keep_current', label: '继续按当前条件查看' }
      ]
    });
  }
  const confirmed = new Set(Array.isArray(confirmedSignatures) ? confirmedSignatures : []);
  return conflicts.filter(item => !item.signature || !confirmed.has(item.signature));
}

const CONFIRMED_KEY = 'lnRank.conflict.confirmedSignatures';
export function readConfirmedConflictSignatures() {
  try { return JSON.parse(localStorage.getItem(CONFIRMED_KEY) || '[]'); } catch { return []; }
}
export function confirmFilterConflict(signature) {
  if (!signature) return;
  try {
    const list = readConfirmedConflictSignatures().filter(Boolean);
    const next = [...new Set([...list.slice(-30), String(signature)])];
    localStorage.setItem(CONFIRMED_KEY, JSON.stringify(next));
  } catch {}
}
export function clearConfirmedConflictsForNewQuery() {
  try { localStorage.removeItem(CONFIRMED_KEY); } catch {}
}

export function hasBlockingFilterConflict(input = {}) { return buildFilterConflicts(input).some(x => x.level === 'block' || x.level === 'warn'); }
export function removeKeywordGroup(rawKeywordText = '', group = '') {
  const words = text(rawKeywordText).split(/[,，、\s/；;|]+/).filter(Boolean);
  const matchers = {
    sino_high_fee: /中外|合作办学|高收费|较高收费|国际本科|国际班/,
    special_project: /定向|专项|公费师范|优师|预科|民族班|公安|司法|航海|轮机/,
    private_school: /民办|独立学院|独立院校/
  };
  const re = matchers[group];
  if (!re) return words.join(' ');
  return words.filter(w => !re.test(w)).join(' ');
}
