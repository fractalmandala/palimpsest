import { describe, expect, test } from 'vitest';
import { appBundleRootFromExecutable, wrapperPathInBundle } from './bundle-paths.ts';

describe('wrapperPathInBundle', () => {
  test('maps packaged executable path to bundled ps.sh wrapper', () => {
    expect(
      wrapperPathInBundle('/Applications/Palimpsest.app/Contents/MacOS/Palimpsest', 'darwin'),
    ).toBe('/Applications/Palimpsest.app/Contents/Resources/cli/bin/ps.sh');
  });
});

describe('appBundleRootFromExecutable', () => {
  test('darwin reduces the main binary to the .app root that also holds the helpers', () => {
    const root = appBundleRootFromExecutable(
      '/Applications/Palimpsest.app/Contents/MacOS/Palimpsest',
      'darwin',
    );

    expect(root).toBe('/Applications/Palimpsest.app');
    expect(
      '/Applications/Palimpsest.app/Contents/Frameworks/Palimpsest Helper.app/Contents/MacOS/Palimpsest Helper'.startsWith(
        `${root}/`,
      ),
    ).toBe(true);
  });

  test('a darwin binary run outside a bundle degrades to its own directory', () => {
    expect(appBundleRootFromExecutable('/opt/local/bin/palimpsest', 'darwin')).toBe(
      '/opt/local/bin',
    );
  });

  test('win32 and linux use the directory the helper binaries share', () => {
    expect(appBundleRootFromExecutable('C:\\Program Files\\OK\\Palimpsest.exe', 'win32')).toBe(
      'C:\\Program Files\\OK',
    );
    expect(appBundleRootFromExecutable('/opt/Palimpsest/palimpsest', 'linux')).toBe(
      '/opt/Palimpsest',
    );
  });
});
