import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const outputArgIndex = process.argv.indexOf('--output');
const outputPath = path.resolve(root, outputArgIndex >= 0 && process.argv[outputArgIndex + 1]
  ? process.argv[outputArgIndex + 1]
  : 'school-name-index.generated.json');

const INCLUDED_EXTENSIONS = new Set(['.json', '.js', '.mjs', '.cjs', '.html', '.md', '.txt', '.csv']);
const IGNORED_DIRS = new Set(['.git', 'node_modules', '.wrangler', 'dist', 'build', 'coverage']);
const IGNORED_FILES = new Set([
  'school-name-index.generated.json',
  'school-name-resolver.js',
  'verify-school-name-resolver.mjs',
  'verify-tongxue-live.mjs',
  'build-school-name-index.mjs'
]);
const MAX_FILE_BYTES = 12_000_000;
const SCHOOL_SUFFIX = '(?:大学(?:医学院|医学部|珠海校区|威海校区|秦皇岛分校|盘锦校区|苏州校区|深圳校区|中外合作办学)?|学院|高等专科学校|职业技术大学|职业大学|职业学院|专科学校)';
const EXACT_SCHOOL_RE = new RegExp(`^[\\u4e00-\\u9fffA-Za-z0-9·（）()]{2,46}${SCHOOL_SUFFIX}$`, 'u');
const EMBEDDED_SCHOOL_RE = new RegExp(`[\\u4e00-\\u9fffA-Za-z0-9·（）()]{2,46}${SCHOOL_SUFFIX}`, 'gu');
const BAD_PREFIXES = ['报考', '选择', '推荐', '适合', '就读', '毕业于', '来自', '考入', '关于', '进入', '申请', '学校', '院校', '高校'];

const files = [];
await walk(root, files);

const schoolSources = new Map();
const parseErrors = [];
for (const file of files) {
  try {
    const info = await stat(file);
    if (info.size > MAX_FILE_BYTES) continue;
    const text = await readFile(file, 'utf8');
    const relative = path.relative(root, file).replaceAll(path.sep, '/');
    if (path.extname(file).toLowerCase() === '.json') {
      try {
        collectJson(JSON.parse(text), relative);
      } catch (error) {
        parseErrors.push({ file: relative, error: error instanceof Error ? error.message : String(error) });
        collectQuotedStrings(text, relative);
      }
    } else {
      collectQuotedStrings(text, relative);
      collectDelimitedText(text, relative);
    }
  } catch (error) {
    parseErrors.push({ file: path.relative(root, file), error: error instanceof Error ? error.message : String(error) });
  }
}

const names = [...schoolSources.keys()].sort((a, b) => a.localeCompare(b, 'zh-CN'));
const exactMap = Object.fromEntries(names.map((name) => [name, 'school']));
const sourceCounts = Object.fromEntries([...schoolSources.entries()].map(([name, sources]) => [name, sources.size]));
const payload = {
  version: 'v1.0.9',
  generatedAt: new Date().toISOString(),
  count: names.length,
  exactMap,
  sourceCounts,
  parseErrors
};
await writeFile(outputPath, JSON.stringify(payload, null, 2) + '\n');
console.log(`SCHOOL_INDEX_BUILT ${JSON.stringify({ output: outputPath, count: names.length, filesScanned: files.length, parseErrors: parseErrors.length })}`);

async function walk(directory, output) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.') && entry.name !== '.github') continue;
    if (entry.isDirectory() && IGNORED_DIRS.has(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await walk(fullPath, output);
      continue;
    }
    if (!entry.isFile()) continue;
    if (IGNORED_FILES.has(entry.name)) continue;
    if (!INCLUDED_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) continue;
    output.push(fullPath);
  }
}

function collectJson(value, source) {
  if (typeof value === 'string') {
    collectCandidate(value, source);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectJson(item, source);
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    collectCandidate(key, source);
    collectJson(child, source);
  }
}

function collectQuotedStrings(text, source) {
  const pattern = /(["'`])([^"'`\n\r]{2,100})\1/g;
  for (const match of text.matchAll(pattern)) collectCandidate(match[2], source);
}

function collectDelimitedText(text, source) {
  for (const line of text.split(/\r?\n/)) {
    if (line.length > 500) continue;
    for (const part of line.split(/[\t,，|]/)) collectCandidate(part, source);
  }
}

function collectCandidate(rawValue, source) {
  const value = cleanValue(rawValue);
  if (!value || value.length > 60) return;
  if (EXACT_SCHOOL_RE.test(value)) {
    addSchool(value, source);
    return;
  }
  for (const match of value.matchAll(EMBEDDED_SCHOOL_RE)) {
    const candidate = trimBadPrefix(match[0]);
    if (EXACT_SCHOOL_RE.test(candidate)) addSchool(candidate, source);
  }
}

function cleanValue(value) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/^[\s#>*+\-:：;；,，.。]+/, '')
    .replace(/[\s:：;；,，.。]+$/, '')
    .replace(/\s+/g, '')
    .replace(/[【\[]/g, '（')
    .replace(/[】\]]/g, '）')
    .trim();
}

function trimBadPrefix(value) {
  let candidate = value;
  for (const prefix of BAD_PREFIXES) {
    if (candidate.startsWith(prefix) && candidate.length > prefix.length + 3) candidate = candidate.slice(prefix.length);
  }
  return candidate;
}

function addSchool(name, source) {
  if (!schoolSources.has(name)) schoolSources.set(name, new Set());
  schoolSources.get(name).add(source);
}
