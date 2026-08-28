import { AI_INTENT_TYPES } from '../../../shared/ai/ai-workspace-contract.v3990_2.js';
import { runAiProvider } from './provider-router.js';

export const AI_INTENT_INTERPRETER_VERSION = 'ai-intent-interpreter-v3990_2';

const REGION_PHRASES = Object.freeze([
  ['东北三省', ['ln', 'jilin', 'heilongjiang']], ['东北', ['ln', 'jilin', 'heilongjiang']],
  ['辽宁省内', ['ln']], ['辽宁', ['ln']], ['沈阳', ['shenyang']], ['大连', ['dalian']],
  ['吉林', ['jilin']], ['黑龙江', ['heilongjiang']], ['北京', ['beijing']], ['天津', ['tianjin']],
  ['河北', ['hebei']], ['山东', ['shandong']], ['江浙沪', ['jiangzhehu']], ['广东', ['guangdong']],
  ['华中', ['huazhong']], ['西南', ['southwest']], ['西北', ['northwest']], ['省外', ['outside']]
]);

const MAJOR_TERMS = Object.freeze([
  '计算机', '软件工程', '软件', '数据科学', '人工智能', '电子信息', '电气', '自动化', '通信',
  '机械', '能源', '石油', '化工', '材料', '土木', '建筑', '医学', '临床医学', '口腔医学',
  '药学', '护理', '法学', '师范', '数学', '物理', '化学', '生物', '会计', '金融', '经济',
  '工商管理', '新闻', '中文', '外语', '英语', '农学', '动物医学', '食品'
]);

function clean(value, max = 300) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function unique(values, max = 16) {
  return [...new Set((Array.isArray(values) ? values : []).map(value => clean(value, 100)).filter(Boolean))].slice(0, max);
}

function parseJsonText(text) {
  const source = clean(text, 6000);
  if (!source) return null;
  const unfenced = source.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try { return JSON.parse(unfenced); } catch {}
  const start = unfenced.indexOf('{');
  const end = unfenced.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try { return JSON.parse(unfenced.slice(start, end + 1)); } catch {}
  }
  return null;
}

function scoreFromText(text) {
  const match = String(text || '').match(/(?:^|[^\d])(\d{3})(?:\s*分)?(?:[^\d]|$)/);
  const score = Number(match?.[1]);
  return Number.isFinite(score) && score >= 150 && score <= 750 ? score : null;
}

function majorTermsFromText(text) {
  const source = String(text || '');
  return MAJOR_TERMS.filter(term => source.includes(term)).slice(0, 8);
}

function schoolNamesFromText(text) {
  const matches = String(text || '').match(/[\u4e00-\u9fa5]{2,16}?(?:大学|学院)/g) || [];
  return unique(matches.map(value => value.replace(/^(比较|对比|看看|再看|想问|帮我看|帮我比较|把|那|和|跟|与)/, '').trim()), 4);
}

function regionMentions(text) {
  const source = String(text || '');
  const include = [];
  const exclude = [];
  const negative = /(不去|不要|不考虑|排除|不接受|肯定不|绝对不)/;
  for (const [phrase, keys] of REGION_PHRASES) {
    if (!source.includes(phrase)) continue;
    const index = source.indexOf(phrase);
    const around = source.slice(Math.max(0, index - 8), Math.min(source.length, index + phrase.length + 8));
    if (negative.test(around)) exclude.push(...keys);
    else include.push(...keys);
  }
  return { include: unique(include), exclude: unique(exclude) };
}

function bottomLineFromText(text) {
  const source = String(text || '');
  if (/只看公办普通|只要公办普通|(?:不接受|不要|排除|取消|去掉|不看).{0,5}民办/.test(source)) return 'public_regular_only';
  if (/(?:不接受|不要|排除|取消|去掉|不看).{0,5}(中外|高收费)/.test(source)) return 'exclude_sino';
  if (/公办优先/.test(source)) return 'public_first';
  if (/(接受|可以).{0,5}(中外|高收费)|公办含中外/.test(source)) return 'public_include_sino';
  return 'all';
}

function mainMajorKeywords(workspace = {}) {
  const main = Array.isArray(workspace.tasks) ? workspace.tasks.find(task => task?.id === workspace.mainTaskId) : null;
  return unique(main?.intent?.majorKeywords || [], 8);
}

function classifyFallback(text, workspace, extracted) {
  const source = String(text || '');
  if (/(比较|对比|哪个好|哪个更|差别)/.test(source)) return 'comparison';
  if (/(如果|假如|假设|要是|假定)/.test(source)) return 'simulation';
  if (/(撤销|回退|恢复刚才|退回)/.test(source)) return 'undo';
  if (/(继续上次|继续刚才|接着来)/.test(source)) return 'resume';
  if (/(章程|招生计划|学费|校区|体检|选科|官方|来源|核验|资格)/.test(source)) return 'verification';
  if (/(不去|不要|不考虑|排除|不接受|不能超过|只看|只要|肯定不|绝对不)/.test(source)) return 'hard_constraint';
  if (/(最好|优先|倾向|希望|更看重|比较看重|尽量)/.test(source)) return 'soft_preference';
  const currentMajors = mainMajorKeywords(workspace);
  const changedMajor = extracted.majorKeywords.some(term => !currentMajors.includes(term));
  if (changedMajor && /(也看看|再看看|换个|换成|那.{0,12}呢|呢[？?]?$)/.test(source)) return 'branch';
  if (/(改成|刚才说错|不是.{0,12}是|纠正)/.test(source)) return 'correction';
  return 'question';
}

function topicFallback(text, type, extracted) {
  const source = String(text || '');
  if (/(方案|选择池|自选|已选|选了些|选了一些|还缺什么)/.test(source)) return 'selection_review';
  if (type === 'comparison') return 'comparison';
  if (type === 'verification') return 'verification';
  if (/(位次|排名|多少名)/.test(source) && extracted.score) return 'rank';
  if (extracted.score || extracted.majorKeywords.length || extracted.schoolNames.length || /(能上|能报|候选|学校|专业|方向)/.test(source)) return 'candidate_search';
  return 'general_question';
}

function taskActionFor(type, workspace) {
  if (!workspace?.mainTaskId) return 'create_main';
  if (type === 'branch') return 'branch';
  if (type === 'simulation') return 'simulation';
  if (type === 'comparison') return 'comparison';
  return 'update_main';
}

function fallbackIntent(text, workspace = {}) {
  const regions = regionMentions(text);
  const extracted = {
    score: scoreFromText(text),
    majorKeywords: majorTermsFromText(text),
    schoolNames: schoolNamesFromText(text),
    regionIncludeKeys: regions.include,
    regionExcludeKeys: regions.exclude,
    bottomLineMode: bottomLineFromText(text)
  };
  const type = classifyFallback(text, workspace, extracted);
  const topic = topicFallback(text, type, extracted);
  const hardWithoutResolvableBase = type === 'hard_constraint' && extracted.regionExcludeKeys.length > 0 && extracted.regionIncludeKeys.length === 0
    && !(workspace?.hardConstraints || []).some(item => item?.key === 'regionInclude' && Array.isArray(item.values) && item.values.length);
  return {
    version: AI_INTENT_INTERPRETER_VERSION,
    type,
    topic,
    score: extracted.score,
    majorKeywords: extracted.majorKeywords,
    regionIncludeKeys: extracted.regionIncludeKeys,
    regionExcludeKeys: extracted.regionExcludeKeys,
    schoolNames: extracted.schoolNames,
    bottomLineMode: extracted.bottomLineMode,
    question: clean(text, 1000),
    taskTitle: '',
    confidence: hardWithoutResolvableBase ? 0.68 : 0.88,
    requiresConfirmation: hardWithoutResolvableBase,
    taskAction: taskActionFor(type, workspace),
    reason: hardWithoutResolvableBase
      ? '明确排除了地区，但当前没有可安全相减的地区集合；先确认范围，避免候选被错误缩水。'
      : '由本地确定性规则解析。',
    rawText: clean(text, 1200),
    source: 'deterministic'
  };
}

function normalizeIntent(candidate, text, workspace, fallback) {
  if (!candidate || typeof candidate !== 'object') return fallback;
  const type = AI_INTENT_TYPES.includes(candidate.type) ? candidate.type : fallback.type;
  const score = Number(candidate.score);
  const allowedTopics = ['rank', 'candidate_search', 'comparison', 'verification', 'selection_review', 'general_question'];
  const topic = allowedTopics.includes(clean(candidate.topic, 80)) ? clean(candidate.topic, 80) : fallback.topic;
  const intent = {
    version: AI_INTENT_INTERPRETER_VERSION,
    type,
    topic,
    score: Number.isFinite(score) && score >= 150 && score <= 750 ? score : fallback.score,
    majorKeywords: unique(candidate.majorKeywords || fallback.majorKeywords, 8),
    regionIncludeKeys: unique(candidate.regionIncludeKeys || fallback.regionIncludeKeys, 8),
    regionExcludeKeys: unique(candidate.regionExcludeKeys || fallback.regionExcludeKeys, 8),
    schoolNames: unique(candidate.schoolNames || fallback.schoolNames, 4),
    bottomLineMode: ['all', 'public_first', 'public_regular_only', 'public_include_sino'].includes(candidate.bottomLineMode) ? candidate.bottomLineMode : fallback.bottomLineMode,
    question: clean(candidate.question, 1000) || clean(text, 1000),
    taskTitle: clean(candidate.taskTitle, 100),
    confidence: Math.max(0, Math.min(1, Number(candidate.confidence ?? fallback.confidence))),
    requiresConfirmation: Boolean(candidate.requiresConfirmation),
    taskAction: taskActionFor(type, workspace),
    reason: clean(candidate.reason, 260) || '由模型进行语义解析，业务数据仍由确定性工具执行。',
    rawText: clean(text, 1200),
    source: 'ai'
  };
  if (intent.type === 'question' && fallback.type !== 'question' && fallback.confidence >= 0.85) return fallback;
  if (fallback.topic === 'selection_review') intent.topic = 'selection_review';
  if (intent.type === 'soft_preference') intent.regionExcludeKeys = [];
  if (intent.type === 'question') {
    intent.regionIncludeKeys = [];
    intent.regionExcludeKeys = [];
    intent.bottomLineMode = 'all';
  }
  if (intent.confidence < 0.72 && ['hard_constraint', 'correction'].includes(intent.type)) intent.requiresConfirmation = true;
  return intent;
}

function promptMessages(text, workspace, fallback) {
  const context = {
    examContext: workspace?.examContext || {},
    hardConstraints: workspace?.hardConstraints || [],
    softPreferences: workspace?.softPreferences || [],
    mainTask: Array.isArray(workspace?.tasks) ? workspace.tasks.find(task => task?.id === workspace.mainTaskId) || null : null,
    hasSelectionSnapshot: Boolean(workspace?.selectionSnapshot?.items?.length)
  };
  return [
    {
      role: 'system',
      content: '你是高考决策工作台的意图解析器，不回答高考事实，不推荐学校，不生成链接，不计算录取概率。只把用户本轮表达解析成 JSON。必须区分：明确硬约束、软偏好、普通提问、纠正、旁支、假设模拟、比较、事实核验、已有家庭方案审查。普通提问绝不能修改已有筛选条件；“最好/优先/倾向”通常是软偏好；“不去/不要/排除/只看/不接受”通常是硬约束。用户突然问另一个专业时优先建立旁支或模拟，不覆盖主任务。只输出一个 JSON 对象。'
    },
    {
      role: 'user',
      content: JSON.stringify({
        schema: {
          type: AI_INTENT_TYPES,
          topic: 'rank | candidate_search | comparison | verification | selection_review | general_question',
          score: '150-750 number or null',
          majorKeywords: 'string[]',
          regionIncludeKeys: 'only from ln,shenyang,dalian,ln-other,outside,beijing,tianjin,hebei,shandong,jilin,heilongjiang,jiangzhehu,guangdong,huazhong,southwest,northwest',
          regionExcludeKeys: 'same whitelist',
          schoolNames: 'string[] max 4',
          bottomLineMode: 'all | public_first | public_regular_only | public_include_sino',
          question: 'user meaning',
          taskTitle: 'short title',
          confidence: '0-1',
          requiresConfirmation: 'boolean',
          reason: 'why this is the intent, <=80 Chinese chars'
        },
        existingContext: context,
        deterministicHints: fallback,
        userText: clean(text, 1200)
      })
    }
  ];
}

export function deterministicIntent(text, workspace = {}) {
  return fallbackIntent(text, workspace);
}

export async function interpretAiIntent(text, workspace = {}, env = {}) {
  const fallback = fallbackIntent(text, workspace);
  const provider = await runAiProvider(env, promptMessages(text, workspace, fallback), { maxTokens: 700 });
  if (!provider.ok) return { intent: fallback, provider };
  const parsed = parseJsonText(provider.text);
  const intent = normalizeIntent(parsed, text, workspace, fallback);
  return { intent, provider };
}