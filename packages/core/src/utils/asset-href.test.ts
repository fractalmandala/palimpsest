import { afterEach, describe, expect, test } from 'vitest';
import { toDesktopAssetHref } from './asset-href.ts';

const g = globalThis as { window?: unknown };

afterEach(() => {
  delete g.window;
});

describe('toDesktopAssetHref', () => {
  test('prefixes apiOrigin onto a server-absolute src when window.psDesktop is present', () => {
    g.window = { psDesktop: { config: { apiOrigin: 'http://localhost:12345' } } };
    expect(toDesktopAssetHref('/assets/x.png')).toBe('http://localhost:12345/assets/x.png');
  });

  test('identity when window.psDesktop is absent', () => {
    expect(toDesktopAssetHref('/assets/x.png')).toBe('/assets/x.png');
  });

  test('identity when window exists but psDesktop is absent', () => {
    g.window = {};
    expect(toDesktopAssetHref('/assets/x.png')).toBe('/assets/x.png');
  });

  test('identity when apiOrigin is empty or missing', () => {
    g.window = { psDesktop: { config: {} } };
    expect(toDesktopAssetHref('/assets/x.png')).toBe('/assets/x.png');
    g.window = { psDesktop: { config: { apiOrigin: '' } } };
    expect(toDesktopAssetHref('/assets/x.png')).toBe('/assets/x.png');
  });

  test('identity for non-server-absolute srcs even with psDesktop present', () => {
    g.window = { psDesktop: { config: { apiOrigin: 'http://localhost:12345' } } };
    expect(toDesktopAssetHref('https://example.com/x.png')).toBe('https://example.com/x.png');
    expect(toDesktopAssetHref('./x.png')).toBe('./x.png');
    expect(toDesktopAssetHref('')).toBe('');
  });
});
