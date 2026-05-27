import { fetchFenxiJson } from './fenxi-fetcher.js';
export async function loadManifest(request, env) {
  return fetchFenxiJson(request, env, 'manifest.json');
}
export async function loadAllRecords(request, env, manifest) {
  const chunks = Array.isArray(manifest.chunks) ? manifest.chunks : [];
  const lists = await Promise.all(chunks.map(async (chunk) => {
    const data = await fetchFenxiJson(request, env, chunk.file);
    return Array.isArray(data) ? data : (Array.isArray(data.records) ? data.records : []);
  }));
  return lists.flat();
}
