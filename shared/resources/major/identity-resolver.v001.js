export const MAJOR_IDENTITY_VERSION = 'v002';

const catalog = [
  {
    id: '080601',
    name: '电气工程及其自动化',
    category: 'engineering',
    aliases: ['电气', '电气工程', '电气工程及其自动化']
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
