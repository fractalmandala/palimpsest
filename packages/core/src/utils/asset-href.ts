export function toDesktopAssetHref(src: string): string {
  if (typeof src !== 'string' || !src.startsWith('/')) return src;
  const origin = (globalThis as { window?: { psDesktop?: { config?: { apiOrigin?: unknown } } } })
    .window?.psDesktop?.config?.apiOrigin;
  return typeof origin === 'string' && origin ? origin + src : src;
}
