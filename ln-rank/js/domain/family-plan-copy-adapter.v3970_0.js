import {
  HUMAN_REPLACEMENTS,
  HUMAN_FORBIDDEN_VISIBLE_WORDS,
  REPORT_COPY
} from './human-copy-dictionary.v3964_0.js?v=3964_0';
import { FAMILY_PLAN_COPY } from '../../../shared/ui/contracts/copy-contract.v3970_0.js?v=3970_0';

export const FAMILY_PLAN_COPY_ADAPTER_VERSION = 'family-plan-copy-adapter-v3970_0';

Object.assign(REPORT_COPY, {
  add: FAMILY_PLAN_COPY.add,
  added: FAMILY_PLAN_COPY.added,
  duplicate: '这个专业已经在家庭方案里',
  remove: '移出家庭方案',
  selectedCount: count => `家庭方案 ${count} 个专业`,
  floatingEntry: count => `家庭方案 ${count} 个专业`,
  confirmTitle: '生成家庭方案报告前确认',
  confirmSubtitle: '下面这些专业会进入家庭方案报告。不合适的可以先移除，确认后再生成。',
  distributionTitle: '家庭方案中的专业分布',
  beforeCheckTitle: '检查当前家庭方案',
  selectedMajorsTitle: '家庭方案',
  generate: '生成家庭方案报告',
  generateFeishu: '生成飞书报告',
  copyText: '复制文字版',
  listReport: '生成清单版',
  explainReport: '生成解读版',
  successTitle: '家庭方案报告已生成',
  failText: '飞书报告暂时没有生成成功，当前家庭方案不会丢失，可以先复制文字版。'
});

HUMAN_REPLACEMENTS.push(
  [/已选专业/g, '家庭方案'],
  [/加入已选/g, '加入家庭方案'],
  [/移出已选/g, '移出家庭方案']
);

for (const word of ['已选 0 个 · 去整理', '还没选专业 · 回到结果继续看']) {
  if (!HUMAN_FORBIDDEN_VISIBLE_WORDS.includes(word)) HUMAN_FORBIDDEN_VISIBLE_WORDS.push(word);
}

globalThis.__GAOKAO_FAMILY_PLAN_COPY_ADAPTER__ = Object.freeze({
  version: FAMILY_PLAN_COPY_ADAPTER_VERSION
});
