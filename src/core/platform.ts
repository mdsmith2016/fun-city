/**
 * Phone/tablet detection. Any one of these signals counts:
 *  - `?mobile=1` in the URL (forces the mode for testing on desktop; `?mobile=0` forces it off)
 *  - the User-Agent Client Hints `navigator.userAgentData.mobile` flag
 *  - a coarse primary pointer with no hover support (touch-only device)
 *  - a mobile UA string, or an iPad that reports as a Mac (MacIntel with multiple touch points)
 */
export function isMobileDevice(): boolean {
  const forced = new URLSearchParams(window.location.search).get('mobile');
  if (forced === '1' || forced === 'true') return true;
  if (forced === '0' || forced === 'false') return false;

  const nav = navigator as Navigator & { userAgentData?: { mobile?: boolean } };
  if (nav.userAgentData?.mobile) return true;

  const coarseOnly =
    window.matchMedia('(pointer: coarse)').matches && !window.matchMedia('(hover: hover)').matches;
  if (coarseOnly) return true;

  if (/Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(nav.userAgent)) return true;
  return nav.platform === 'MacIntel' && nav.maxTouchPoints > 1;
}
