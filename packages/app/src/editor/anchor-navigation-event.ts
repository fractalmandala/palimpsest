export const REPEAT_ANCHOR_NAV_EVENT = 'palimpsest:repeat-anchor-nav';

export function requestRepeatAnchorNavigation(): void {
  window.dispatchEvent(new Event(REPEAT_ANCHOR_NAV_EVENT));
}
