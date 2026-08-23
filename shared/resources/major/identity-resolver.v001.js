export const MAJOR_IDENTITY_VERSION = 'v001';

const aliases = new Map([
  ['电气', '080601'],
  ['电气工程', '080601'],
  ['电气工程及其自动化', '080601']
]);

export function resolveMajorIdentity(input) {
  if (!input) return null;

  const normalized = String(input).trim();
  const id = aliases.get(normalized);

  if (!id) return null;

  return {
    id,
    name: '电气工程及其自动化',
    version: MAJOR_IDENTITY_VERSION
  };
}
