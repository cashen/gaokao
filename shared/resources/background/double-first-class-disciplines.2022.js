import part1 from './double-first-class-disciplines.2022.part1.js';
import part2 from './double-first-class-disciplines.2022.part2.js';
import part3 from './double-first-class-disciplines.2022.part3.js';
import part4b from './double-first-class-disciplines.2022.part4b.js';
import part5b from './double-first-class-disciplines.2022.part5b.js';

export const DOUBLE_FIRST_CLASS_2022_VERSION = 'double-first-class-disciplines-2022-v3972_0';
export const DOUBLE_FIRST_CLASS_2022_SOURCE = Object.freeze({
  sourceId: 'MOE_DOUBLE_FIRST_CLASS_2022',
  title: '第二轮“双一流”建设高校及建设学科名单',
  publisher: '教育部、财政部、国家发展改革委',
  year: 2022,
  noticeUrl: 'https://hudong.moe.gov.cn/srcsite/A22/s7065/202202/t20220211_598710.html',
  attachmentUrl: 'https://hudong.moe.gov.cn/srcsite/A22/s7065/202202/W020220214318455516037.pdf',
  official: true,
  canSupportDisciplineEvidence: true,
  coverageMode: 'reviewed-official-entries-v3972_0'
});

export function normalizeDoubleFirstClassSchoolName(value = '') {
  return String(value || '').normalize('NFKC').replace(/[（[]/g, '(').replace(/[）\]]/g, ')').replace(/\s+/g, '').replace(/^中国人民解放军/, '').replace(/^中国人民解放军国防科学技术大学$/, '国防科技大学').replace(/^国防科学技术大学$/, '国防科技大学').replace(/^第二军医大学$/, '海军军医大学').replace(/^第四军医大学$/, '空军军医大学');
}

const RAW = [part1, part2, part3, part4b, part5b].join('\n');
const entries = RAW.trim().split('\n').map(line => {
  const [school, disciplinesText = ''] = line.split('|');
  const selfDetermined = disciplinesText === 'SELF';
  return Object.freeze({ school: school.trim(), key: normalizeDoubleFirstClassSchoolName(school), selfDetermined, disciplines: Object.freeze(selfDetermined ? [] : disciplinesText.split('、').map(value => value.trim()).filter(Boolean)) });
});
const bySchool = new Map(entries.map(entry => [entry.key, entry]));
export const DOUBLE_FIRST_CLASS_2022_ENTRIES = Object.freeze(entries);
export function getDoubleFirstClassDisciplines(schoolName = '') { return bySchool.get(normalizeDoubleFirstClassSchoolName(schoolName)) || null; }
