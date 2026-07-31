import { handleLocalStrengthRequest } from '../_lib/local-strength-api.js';

export async function onRequest(context) {
  return handleLocalStrengthRequest(context);
}
