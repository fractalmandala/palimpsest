import { describe, expect, test } from 'vitest';
import { DESKTOP_VARIANTS } from '../shared/desktop-variant.ts';
import { buildAboutInfo } from './about-info.ts';

describe('buildAboutInfo', () => {
  test('names the installed product and links its own release notes', () => {
    expect(
      buildAboutInfo({
        version: '0.83.0-beta.8',
        variant: DESKTOP_VARIANTS.beta,
        updateChecksAvailable: true,
      }),
    ).toEqual({
      productName: 'Palimpsest Beta',
      version: '0.83.0-beta.8',
      releasesUrl: 'https://github.com/fractalmandala/palimpsest/releases',
      releaseNotesUrl: 'https://github.com/fractalmandala/palimpsest/releases/tag/v0.83.0-beta.8',
      updateChecks: 'available',
    });
  });

  test('reports update checks as unavailable when the updater did not start', () => {
    const info = buildAboutInfo({
      version: '0.82.3',
      variant: DESKTOP_VARIANTS.stable,
      updateChecksAvailable: false,
    });
    expect(info.productName).toBe('Palimpsest');
    expect(info.updateChecks).toBe('unavailable');
  });
});
