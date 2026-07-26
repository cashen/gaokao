export class TongxueError extends Error {
  constructor(code, message, data = {}) {
    super(message);
    this.name = 'TongxueError';
    this.code = code;
    this.data = data;
  }
}

export function normalizeSchool(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

export function tidySummary(value) {
  return String(value || '')
    .replace(/\r/g, '')
    .replace(/\s*([，。！？；：、])\s*/g, '$1')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function isUsefulSummary(value) {
  const text = tidySummary(value);
  return text.length >= 20 && text.length <= 5000;
}

export function looksLikeHtml(value) {
  const text = String(value || '').trim().toLowerCase();
  return text.startsWith('<!doctype html') || text.startsWith('<html') || text.includes('<html');
}

export function cloneData(value) {
  return typeof structuredClone === 'function'
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

export function isAbortError(error) {
  return error?.name === 'AbortError' || String(error?.message || '').includes('aborted');
}

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}

export function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

export function formatTime(value) {
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) return '刚刚';
  return date.toLocaleString('zh-CN', {
    hour12: false,
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatReviewDate(value) {
  const date = new Date(value || '');
  if (Number.isNaN(date.getTime())) return String(value || '时间未知').slice(0, 16);
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

export function sourceInfo(source, school) {
  if (source && typeof source === 'object') {
    return {
      name: String(source.name || 'srgaoxiao.com'),
      url: String(source.url || buildSourceUrl(school))
    };
  }
  return { name: 'srgaoxiao.com', url: buildSourceUrl(school) };
}

export function buildSourceUrl(school) {
  return `https://srgaoxiao.com/school/${encodeURIComponent(normalizeSchool(school))}`;
}

export function reviewKey(review) {
  if (review?.id !== null && review?.id !== undefined) return `id:${review.id}`;
  return `content:${String(review?.content || '').replace(/\s+/g, '').slice(0, 500)}`;
}

export function dedupeReviews(reviews) {
  const seen = new Set();
  return (Array.isArray(reviews) ? reviews : []).filter(review => {
    const key = reviewKey(review);
    if (seen.has(key)) return false;
    seen.add(key);
    return Boolean(String(review?.content || '').trim());
  });
}

export function summaryGroups(summary) {
  const text = tidySummary(summary)
    .replace(/，但/g, '。但')
    .replace(/，不过/g, '。不过')
    .replace(/，然而/g, '。然而')
    .replace(/；/g, '。');
  const sentences = (text.match(/[^。！？\n]+[。！？]?/g) || [text])
    .map(item => item.trim())
    .filter(item => item.length > 2);
  const definitions = [
    { key:'life', title:'校园与生活', words:['宿舍','寝室','食堂','校区','校园','交通','环境','空调','卫浴','生活','住宿','设施'] },
    { key:'study', title:'学习与管理', words:['师资','课程','教学','学习','管理','跑操','自习','考试','课堂','形式主义','老师'] },
    { key:'career', title:'就业与发展', words:['就业','实习','转专业','保研','考研','升学','科研','机会','发展','深造','资源'] },
    { key:'attention', title:'需要留意', words:['但','不过','然而','较差','不足','较少','受限','问题','偏高','争议','参差','槽点'] },
    { key:'overall', title:'综合印象', words:[] }
  ];
  const groups = new Map(definitions.map(item => [item.key, { ...item, items: [] }]));
  for (const sentence of sentences) {
    let selectedKey = 'overall';
    if (/^(但|不过|然而)|较差|不足|较少|受限|问题|偏高|争议|参差|槽点/.test(sentence)) {
      selectedKey = 'attention';
    } else {
      selectedKey = definitions.find(item => !['attention','overall'].includes(item.key)
        && item.words.some(word => sentence.includes(word)))?.key || 'overall';
    }
    groups.get(selectedKey).items.push(sentence);
  }
  const output = ['overall','life','study','career','attention']
    .map(key => groups.get(key))
    .filter(group => group.items.length);
  return output.length ? output : [{ key:'overall', title:'综合印象', items:[tidySummary(summary)] }];
}
