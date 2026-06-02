import { normalizeMajorCode, looksLikeStandardMajorCode } from './standard-major-normalizer.js';

function pick(raw, names = []) {
  for (const name of names) {
    const value = raw?.[name];
    if (value != null && String(value).trim() !== '') return String(value).trim();
  }
  return '';
}

export function normalizeFenxiCodes(raw = {}) {
  const rawMajorCode = pick(raw, [
    '专业代码', 'majorCode', 'major_code', 'majorNo', 'major_no', 'enrollMajorCode', 'enrollMajorNo',
    '专业代号', '招生专业代号', '填报专业代码', '填报代号', 'planMajorCode', 'rawMajorCode'
  ]);
  const standardMajorCode = pick(raw, [
    '本科专业代码', '国标专业代码', '标准专业代码', 'standardMajorCode', 'eduMajorCode', 'professionCode'
  ]);
  const schoolCode = pick(raw, ['院校代码', '院校代号', 'schoolCode', 'collegeCode', 'enrollSchoolCode']);
  const rawFenxiId = pick(raw, ['id', '_id', 'rawId', 'detailId', 'planItemCode', '招生计划编号']);
  // 注意：用户确认 /fenxi 详细卡片该字段前端叫“专业代码”。它可能不是 080601 这种本科专业代码。
  return {
    majorCode: normalizeMajorCode(rawMajorCode),
    schoolCode: normalizeMajorCode(schoolCode),
    standardMajorCode: normalizeMajorCode(standardMajorCode),
    rawFenxiId: normalizeMajorCode(rawFenxiId),
    majorCodeLooksStandard: looksLikeStandardMajorCode(rawMajorCode)
  };
}
