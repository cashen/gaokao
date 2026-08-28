/* v3.9.33.12 专业代码识别合同
 * 区分招生专业代码（04/9U/BC）与本科目录代码（080601/081504）。
 */
function clean(value, max = 80) { return String(value == null ? '' : value).replace(/\s+/g, ' ').trim().slice(0, max); }
export function normalizeCatalogCode(value) {
  const text = clean(value, 40).toUpperCase();
  return /^[0-9]{6}[A-Z]{0,2}$/.test(text) ? text : '';
}
export function normalizeAdmissionMajorCode(value) {
  const text = clean(value, 20).toUpperCase();
  return /^[0-9A-Z]{1,4}$/.test(text) && !normalizeCatalogCode(text) ? text : '';
}
export function resolveMajorCodes(record = {}) {
  const catalogCode = normalizeCatalogCode(record.catalogCode)
    || normalizeCatalogCode(record.majorCatalogCode)
    || normalizeCatalogCode(record.standardMajor?.code)
    || normalizeCatalogCode(record.codes?.catalogCode)
    || normalizeCatalogCode(record.codes?.standardMajorCode);
  const admissionMajorCode = normalizeAdmissionMajorCode(record.admissionMajorCode)
    || normalizeAdmissionMajorCode(record.majorAdmissionCode)
    || normalizeAdmissionMajorCode(record.majorCode)
    || normalizeAdmissionMajorCode(record.code)
    || normalizeAdmissionMajorCode(record.codes?.admissionMajorCode);
  return {
    admissionMajorCode,
    catalogCode,
    catalogCodeSource: catalogCode ? 'standardMajor/catalogCode' : '',
    mappingStatus: catalogCode ? 'exact' : 'missing'
  };
}
