export const MAJOR_IDENTITY_VERSION = 'v003';

// Canonical identity registry entry point.
// New majors are added here as catalog data, not as product-specific logic.
const catalog = [
  {
    id: '080601',
    name: '电气工程及其自动化',
    category: 'engineering',
    aliases: ['电气', '电气工程', '电气工程及其自动化']
  },
  {
    id: '080204',
    name: '机械电子工程',
    category: 'engineering',
    aliases: ['机械电子', '机械电子工程']
  },
  {
    id: '080801',
    name: '自动化',
    category: 'engineering',
    aliases: ['自动化']
  }
];

function normalize(value) {
  return String(value || '')
    .trim()
    .replace(/[（）()]/g, '')
    .replace(/专业$/, '');
}

export function resolveMajorIdentity(input) {
  const normalized = normalize(input);
  if (!normalized) return null;

  const major = catalog.find((item) =>
    item.aliases.some((alias) => normalize(alias) === normalized)
  );

  if (!major) return null;

  return {
    id: major.id,
    name: major.name,
    category: major.category,
    version: MAJOR_IDENTITY_VERSION
  };
}

export function listMajorIdentityCatalog() {
  return catalog.map((item) => ({
    id: item.id,
    name: item.name,
    category: item.category
  }));
}
