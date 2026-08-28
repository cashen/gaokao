import { handleAcademicBackgroundRequest } from '../_lib/academic-background-api.js';

export async function onRequest(context) {
  return handleAcademicBackgroundRequest(context, 'liaoning');
}
