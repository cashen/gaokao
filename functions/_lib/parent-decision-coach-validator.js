function clean(value) { return String(value == null ? '' : value); }
export function validateParentCoach(coach = {}, ctx = {}) {
  const warnings = [];
  const text = clean(JSON.stringify(coach));
  if (/保证录取|一定上岸|闭眼报/.test(text)) warnings.push('forbidden_claim');
  if (ctx?.facts?.bottomLineSummary?.mode === 'public_include_sino' && /中外.*不符合.*公办/.test(text)) warnings.push('wrong_sino_violation');
  if (!Array.isArray(coach.nextActions)) warnings.push('nextActions_invalid');
  return { ok: warnings.length === 0, warnings };
}
export function cleanParentCoach(coach = {}) {
  const cleanList = arr => Array.isArray(arr) ? arr.map(x => clean(x).replace(/^\s*[-•]\s*/, '').replace(/^\s*\d+[\.、]\s*/, '').trim()).filter(Boolean).slice(0, 8) : [];
  return {
    ...coach,
    nextActions: cleanList(coach.nextActions),
    familyQuestions: cleanList(coach.familyQuestions),
    manualCheckList: cleanList(coach.manualCheckList)
  };
}
