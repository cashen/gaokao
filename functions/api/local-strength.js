import { handleLocalStrengthRequest } from '../_lib/local-strength-api.js';

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const mode = url.searchParams.get('mode') || 'meta';
  if (['list', 'list_all', 'school', 'score'].includes(mode)) {
    if (!url.searchParams.has('minScore')) url.searchParams.set('minScore', '344');
    if (!url.searchParams.has('maxScore')) url.searchParams.set('maxScore', '750');
    context = { ...context, request: new Request(url, context.request) };
  }
  return handleLocalStrengthRequest(context);
}
