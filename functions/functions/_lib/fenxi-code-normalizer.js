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
  // v3.9.7.5：ln-rank 前端“专业代码”统一指 080601 这类本科专业代码。
  // /fenxi 原始条目号仅保留在 rawFenxiMajorCode，不参与前端显示。
  return {
    rawFenxiMajorCode: normalizeMajorCode(rawMajorCode),
    schoolCode: normalizeMajorCode(schoolCode),
    standardMajorCode: normalizeMajorCode(standardMajorCode),
    rawFenxiId: normalizeMajorCode(rawFenxiId),
    rawFenxiMajorCodeLooksStandard: looksLikeStandardMajorCode(rawMajorCode)
  };
}
