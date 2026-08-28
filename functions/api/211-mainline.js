import { handle211StaticCompatibility } from '../_lib/211-static-compat-response.js';

export async function onRequest(context) {
  return handle211StaticCompatibility(context.request);
}
