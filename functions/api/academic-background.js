import { handleAcademicBackgroundRequest } from '../_lib/academic-background-api.js';
import { handle211StaticCompatibility, is211ScopeRequest } from '../_lib/211-static-compat-response.js';

export async function onRequest(context) {
  if (is211ScopeRequest(context.request)) {
    return handle211StaticCompatibility(context.request);
  }
  return handleAcademicBackgroundRequest(context);
}
