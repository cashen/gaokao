import {
  LIAONING_PHYSICS_EXAM_CONFIG,
  getExamResourceConfig
} from '../../shared/resources/exam/liaoning-physics.js';

export const LN_PHYSICS_EXAM_CONFIG = { ...LIAONING_PHYSICS_EXAM_CONFIG };

export function getExamYearConfig(input = {}) {
  return getExamResourceConfig(input);
}
