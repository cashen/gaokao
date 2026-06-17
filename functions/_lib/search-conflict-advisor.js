import { buildFilterConflicts } from './filter-conflict-contract.js';

export function buildSearchConflictAdvice({ keywordQuery, bottomLineMode, specialProjectMode, resultStats }) {
  const advices = [];
  const conflicts = buildFilterConflicts({ keywordQuery, bottomLineMode, specialProjectMode });
  const projectText = (keywordQuery?.projectKeywords || []).join(' ');
  const searchingSinoOrHighFee = /中外|合作办学|高收费|较高收费/.test(projectText);
  if (searchingSinoOrHighFee && Number(resultStats?.total || 0) === 0) {
    advices.push({
      level: 'info',
      type: 'no_sino_result',
      message: '当前条件下未找到中外/合作办学相关项目，可尝试选择“多看一些”，或切换办学费用底线。'
    });
  }
  return [...conflicts, ...advices];
}
