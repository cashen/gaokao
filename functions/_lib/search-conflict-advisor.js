export function buildSearchConflictAdvice({ keywordQuery, bottomLineMode, resultStats }) {
  const advices = [];
  const projectText = (keywordQuery?.projectKeywords || []).join(' ');
  const searchingSinoOrHighFee = /中外|合作办学|高收费|较高收费/.test(projectText);

  if (searchingSinoOrHighFee && bottomLineMode === 'public_regular_only') {
    advices.push({
      level: 'warn',
      type: 'sino_excluded_by_public_regular',
      message: '你输入了“中外/合作办学/高收费”相关关键词，但当前底线为“只看公办普通”，该条件会排除中外/高收费项目。如需查看公办中外，请切换为“公办含中外/高收费”。',
      action: { type: 'switch_bottomline', target: 'public_include_sino', label: '切换为公办含中外/高收费' }
    });
  }

  if (searchingSinoOrHighFee && Number(resultStats?.total || 0) === 0) {
    advices.push({
      level: 'info',
      type: 'no_sino_result',
      message: '当前条件下未找到中外/合作办学相关项目，可尝试放宽查询范围或切换办学费用底线。'
    });
  }

  return advices;
}
