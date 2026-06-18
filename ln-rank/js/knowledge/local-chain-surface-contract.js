/* v3.9.32 legacy compatibility wrapper.
 * 前台统一使用“院校专业背景 / 本校方向 / 本校相关 / 方向提醒”。
 */
import { safeGetLocalContextPresentation, renderLocalContextShortText } from './local-context-resolver.js?v=3949_0';

export function getLocalChainPresentation(record = {}, surface = 'card') {
  return safeGetLocalContextPresentation(record, surface);
}

export function renderLocalChainShortText(record = {}, surface = 'card') {
  return renderLocalContextShortText(record, surface);
}
