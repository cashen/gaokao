import { getStatusByDelta } from "../../config/status-rules.js";
export function getCurrentViewStatus(viewDelta) { return getStatusByDelta(viewDelta); }
