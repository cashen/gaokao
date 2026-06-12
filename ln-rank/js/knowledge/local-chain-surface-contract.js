/* v3.9.32 legacy compatibility wrapper.
 * 前台统一使用“院校专业背景 / 本校主干方向 / 本校特色相关 / 方向提醒”。
 */
import { getLocalContextPresentation, renderLocalContextShortText } from './local-context-resolver.js?v=3933';

export function getLocalChainPresentation(record = {}, surface = 'card') {
  return getLocalContextPresentation(record, surface);
}

export function renderLocalChainShortText(record = {}, surface = 'card') {
  return renderLocalContextShortText(record, surface);
}
