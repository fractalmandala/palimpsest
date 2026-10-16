import '@/lib/desktop-bridge-types';

export function isSlidesHost(
  windowLike: { psDesktop?: { slides?: unknown } } | undefined = typeof window === 'undefined'
    ? undefined
    : window,
): boolean {
  return windowLike?.psDesktop?.slides != null;
}
