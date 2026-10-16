import { describe, expect, test } from 'vitest';
import { wrapperPathInBundle } from './bundle-paths.ts';
import { agentConnectionsAvailability, classifyInstallShape } from './install-shape.ts';

describe('classifyInstallShape', () => {
  test('darwin bundle → mac-bundle with Contents/Resources wrapper', () => {
    const shape = classifyInstallShape(
      'darwin',
      '/Applications/Palimpsest.app/Contents/MacOS/Palimpsest',
      {},
    );
    expect(shape).toEqual({
      kind: 'mac-bundle',
      wrapperPath: '/Applications/Palimpsest.app/Contents/Resources/cli/bin/ps.sh',
    });
  });

  test('darwin non-bundle executable is unsupported', () => {
    expect(classifyInstallShape('darwin', '/usr/local/bin/electron', {})).toEqual({
      kind: 'unsupported',
    });
  });

  test('win32 NSIS layout → resources\\cli\\bin\\ps.cmd', () => {
    const shape = classifyInstallShape(
      'win32',
      'C:\\Users\\u\\AppData\\Local\\Programs\\Palimpsest\\Palimpsest.exe',
      {},
    );
    expect(shape).toEqual({
      kind: 'windows',
      installRoot: 'C:\\Users\\u\\AppData\\Local\\Programs\\Palimpsest',
      wrapperPath:
        'C:\\Users\\u\\AppData\\Local\\Programs\\Palimpsest\\resources\\cli\\bin\\ps.cmd',
    });
  });

  test('win32 non-exe is unsupported', () => {
    expect(classifyInstallShape('win32', 'C:\\weird\\electron', {})).toEqual({
      kind: 'unsupported',
    });
  });

  test('linux deb layout → resources/cli/bin/ps.sh', () => {
    const shape = classifyInstallShape('linux', '/opt/Palimpsest/palimpsest', {});
    expect(shape).toEqual({
      kind: 'linux',
      installRoot: '/opt/Palimpsest',
      wrapperPath: '/opt/Palimpsest/resources/cli/bin/ps.sh',
    });
  });

  test('linux AppImage launch (APPIMAGE env) declines persistent integrations', () => {
    const shape = classifyInstallShape('linux', '/tmp/.mount_OpenKnXYZ/palimpsest', {
      APPIMAGE: '/home/u/Palimpsest-x86_64.AppImage',
    });
    expect(shape).toEqual({ kind: 'appimage' });
  });

  test('unknown platform is unsupported', () => {
    expect(classifyInstallShape('freebsd', '/opt/ok/ok', {})).toEqual({ kind: 'unsupported' });
  });
});

describe('wrapperPathInBundle per-platform layouts', () => {
  test('darwin default stays byte-identical to the historical mapping', () => {
    expect(
      wrapperPathInBundle('/Applications/Palimpsest.app/Contents/MacOS/Palimpsest', 'darwin'),
    ).toBe('/Applications/Palimpsest.app/Contents/Resources/cli/bin/ps.sh');
  });

  test('win32 maps beside the exe under resources\\', () => {
    expect(wrapperPathInBundle('C:\\Programs\\Palimpsest\\Palimpsest.exe', 'win32')).toBe(
      'C:\\Programs\\Palimpsest\\resources\\cli\\bin\\ps.cmd',
    );
  });

  test('linux maps beside the executable under resources/', () => {
    expect(wrapperPathInBundle('/opt/Palimpsest/palimpsest', 'linux')).toBe(
      '/opt/Palimpsest/resources/cli/bin/ps.sh',
    );
  });
});

describe('agentConnectionsAvailability', () => {
  const devExe = '/repo/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron';
  const packagedExe = '/Applications/Palimpsest.app/Contents/MacOS/Palimpsest';

  test.each([
    ['plain unpackaged build', false, 'darwin', devExe, {}, { available: false, devBuild: true }],
    [
      'unpackaged build forced open',
      false,
      'darwin',
      devExe,
      { PS_M6B_FORCE: '1' },
      { available: true, devBuild: false },
    ],
    [
      'unpackaged build locked by PS_RECLAIM_DISABLE',
      false,
      'darwin',
      devExe,
      { PS_RECLAIM_DISABLE: '1' },
      { available: false, devBuild: false },
    ],
    [
      'unpackaged build forced open but locked by PS_RECLAIM_DISABLE',
      false,
      'darwin',
      devExe,
      { PS_M6B_FORCE: '1', PS_RECLAIM_DISABLE: '1' },
      { available: false, devBuild: false },
    ],
    [
      'unpackaged build forced open but locked by install shape',
      false,
      'linux',
      '/tmp/.mount_ok/palimpsest',
      { PS_M6B_FORCE: '1', APPIMAGE: '/home/u/OK.AppImage' },
      { available: false, devBuild: false },
    ],
    ['packaged build', true, 'darwin', packagedExe, {}, { available: true, devBuild: false }],
    [
      'packaged build in an unsupported shape',
      true,
      'darwin',
      '/usr/local/bin/Palimpsest',
      {},
      { available: false, devBuild: false },
    ],
  ] as const)('%s', (_label, isPackaged, platform, exe, env, expected) => {
    expect(agentConnectionsAvailability(isPackaged, platform, exe, env)).toEqual(expected);
  });
});
