import type { SpawnOptions } from 'node:child_process';
import { PS_CHANNEL_ENV } from '@palimpsest/core';
import { describe, expect, test, vi } from 'vitest';
import {
  DESKTOP_BUNDLE_ID,
  type DetectDeps,
  detectDesktop,
  launchDesktop,
  notFoundMessage,
} from './desktop-dispatch.ts';

function baseDeps(overrides: Partial<DetectDeps> = {}): DetectDeps {
  return {
    platform: 'darwin',
    env: {},
    execPath: '/usr/local/bin/node',
    isTTY: true,
    statSync: () => null,
    homeDir: '/Users/andrew',
    ...overrides,
  };
}

function statForFile(path: string): DetectDeps['statSync'] {
  return (p) => (p === path ? { isFile: () => true, isDirectory: () => false } : null);
}

const APP_EXEC = '/Applications/Palimpsest.app/Contents/MacOS/Palimpsest';
const HOME_EXEC = '/Users/andrew/Applications/Palimpsest.app/Contents/MacOS/Palimpsest';
const BETA_APP_EXEC = '/Applications/Palimpsest Beta.app/Contents/MacOS/Palimpsest Beta';
const HOME_BETA_APP_EXEC =
  '/Users/andrew/Applications/Palimpsest Beta.app/Contents/MacOS/Palimpsest Beta';

describe('detectDesktop — platform gate (FR10)', () => {
  test('unknown platform → unsupported-platform', () => {
    const result = detectDesktop(
      baseDeps({ platform: 'freebsd' as NodeJS.Platform, statSync: statForFile(APP_EXEC) }),
    );
    expect(result).toEqual({
      available: false,
      reason: 'unsupported-platform',
      cliProduct: 'stable',
    });
  });

  test('linux with no install → no-bundle (falls back to browser mode)', () => {
    const result = detectDesktop(baseDeps({ platform: 'linux', statSync: statForFile(APP_EXEC) }));
    expect(result).toEqual({ available: false, reason: 'no-bundle', cliProduct: 'stable' });
  });

  test('win32 with no install → no-bundle (falls back to browser mode)', () => {
    const result = detectDesktop(baseDeps({ platform: 'win32', statSync: statForFile(APP_EXEC) }));
    expect(result).toEqual({ available: false, reason: 'no-bundle', cliProduct: 'stable' });
  });
});

describe('detectDesktop — Windows/Linux install resolution', () => {
  const WIN_EXE =
    'C:\\Users\\u\\AppData\\Local\\Programs\\@palimpsestdesktop\\Palimpsest.exe';
  const BETA_WIN_EXE =
    'C:\\Users\\u\\AppData\\Local\\Programs\\palimpsest-beta-desktop\\Palimpsest Beta.exe';
  const DEB_EXE = '/opt/Palimpsest/palimpsest';
  const BETA_DEB_EXE = '/opt/Palimpsest Beta/palimpsest-beta';

  test('win32: %LOCALAPPDATA% per-user install → available', () => {
    const result = detectDesktop(
      baseDeps({
        platform: 'win32',
        env: { LOCALAPPDATA: 'C:\\Users\\u\\AppData\\Local' },
        statSync: statForFile(WIN_EXE),
      }),
    );
    expect(result).toEqual({
      available: true,
      reason: 'available',
      bundlePath: WIN_EXE,
      product: 'stable',
      cliProduct: 'stable',
    });
  });

  test('win32: bundled-CLI introspection (ps.cmd wrapper) → the running exe', () => {
    const result = detectDesktop(
      baseDeps({
        platform: 'win32',
        env: { ELECTRON_RUN_AS_NODE: '1' },
        execPath: WIN_EXE,
        statSync: () => null,
      }),
    );
    expect(result).toEqual({
      available: true,
      reason: 'available',
      bundlePath: WIN_EXE,
      product: 'stable',
      cliProduct: 'stable',
    });
  });

  test('win32: bundled-CLI introspection reports the Beta product for the Beta exe', () => {
    const result = detectDesktop(
      baseDeps({
        platform: 'win32',
        env: { ELECTRON_RUN_AS_NODE: '1' },
        execPath: BETA_WIN_EXE,
        statSync: () => null,
      }),
    );
    expect(result).toEqual({
      available: true,
      reason: 'available',
      bundlePath: BETA_WIN_EXE,
      product: 'beta',
      cliProduct: 'beta',
    });
  });

  test('win32: Beta per-user install → available', () => {
    const result = detectDesktop(
      baseDeps({
        platform: 'win32',
        env: { LOCALAPPDATA: 'C:\\Users\\u\\AppData\\Local' },
        statSync: statForFile(BETA_WIN_EXE),
      }),
    );
    expect(result).toEqual({
      available: true,
      reason: 'available',
      bundlePath: BETA_WIN_EXE,
      product: 'beta',
      cliProduct: 'stable',
    });
  });

  test('linux: deb install at /opt → available (with a display)', () => {
    const result = detectDesktop(
      baseDeps({
        platform: 'linux',
        env: { DISPLAY: ':0' },
        statSync: statForFile(DEB_EXE),
      }),
    );
    expect(result).toEqual({
      available: true,
      reason: 'available',
      bundlePath: DEB_EXE,
      product: 'stable',
      cliProduct: 'stable',
    });
  });

  test('linux: no DISPLAY/WAYLAND_DISPLAY → headless even on a TTY', () => {
    const result = detectDesktop(
      baseDeps({ platform: 'linux', env: {}, statSync: statForFile(DEB_EXE) }),
    );
    expect(result).toEqual({
      available: false,
      reason: 'headless',
      bundlePath: DEB_EXE,
      product: 'stable',
      cliProduct: 'stable',
    });
  });

  test('linux: Beta deb install at /opt → available', () => {
    const result = detectDesktop(
      baseDeps({
        platform: 'linux',
        env: { DISPLAY: ':0' },
        statSync: statForFile(BETA_DEB_EXE),
      }),
    );
    expect(result).toEqual({
      available: true,
      reason: 'available',
      bundlePath: BETA_DEB_EXE,
      product: 'beta',
      cliProduct: 'stable',
    });
  });
});

describe('detectDesktop — bundle resolution (FR10 D2 a/b/c)', () => {
  test('darwin + bundle in /Applications → available', () => {
    const result = detectDesktop(baseDeps({ statSync: statForFile(APP_EXEC) }));
    expect(result.available).toBe(true);
    expect(result.reason).toBe('available');
    expect(result.bundlePath).toBe('/Applications/Palimpsest.app');
  });

  test('darwin + bundle only in ~/Applications → available, home path', () => {
    const result = detectDesktop(baseDeps({ statSync: statForFile(HOME_EXEC) }));
    expect(result.available).toBe(true);
    expect(result.bundlePath).toBe('/Users/andrew/Applications/Palimpsest.app');
  });

  test('darwin + only Beta in /Applications → available', () => {
    const result = detectDesktop(baseDeps({ statSync: statForFile(BETA_APP_EXEC) }));
    expect(result).toEqual({
      available: true,
      reason: 'available',
      bundlePath: '/Applications/Palimpsest Beta.app',
      product: 'beta',
      cliProduct: 'stable',
    });
  });

  test('darwin prefers Stable across install locations when both products exist', () => {
    const installed = new Set([APP_EXEC, HOME_BETA_APP_EXEC]);
    const result = detectDesktop(
      baseDeps({ statSync: (path) => (installed.has(path) ? { isFile: () => true } : null) }),
    );
    expect(result.bundlePath).toBe('/Applications/Palimpsest.app');
  });

  test('darwin + no bundle → no-bundle', () => {
    const result = detectDesktop(baseDeps());
    expect(result).toEqual({ available: false, reason: 'no-bundle', cliProduct: 'stable' });
  });

  test('bundled-CLI introspection (FR10 D2 path a) — ELECTRON_RUN_AS_NODE + execPath in .app', () => {
    const result = detectDesktop(
      baseDeps({
        env: { ELECTRON_RUN_AS_NODE: '1' },
        execPath: '/Applications/Palimpsest.app/Contents/MacOS/Palimpsest',
        statSync: () => null,
      }),
    );
    expect(result.available).toBe(true);
    expect(result.bundlePath).toBe('/Applications/Palimpsest.app');
  });

  test('bundled-CLI introspection reports the Beta product for the Beta bundle', () => {
    const result = detectDesktop(
      baseDeps({
        env: { ELECTRON_RUN_AS_NODE: '1' },
        execPath: BETA_APP_EXEC,
        statSync: () => null,
      }),
    );
    expect(result.bundlePath).toBe('/Applications/Palimpsest Beta.app');
    expect(result.product).toBe('beta');
  });

  test('bundled-CLI introspection — execPath outside .app falls through to stat probes', () => {
    const result = detectDesktop(
      baseDeps({
        env: { ELECTRON_RUN_AS_NODE: '1' },
        execPath: '/usr/local/bin/electron',
        statSync: statForFile(APP_EXEC),
      }),
    );
    expect(result.available).toBe(true);
    expect(result.bundlePath).toBe('/Applications/Palimpsest.app');
  });

  test('stat throws unexpectedly → no-bundle (probeBundle catches before reason can bubble)', () => {
    const result = detectDesktop(
      baseDeps({
        statSync: () => {
          throw new Error('EACCES: synthetic');
        },
      }),
    );
    expect(result).toEqual({ available: false, reason: 'no-bundle', cliProduct: 'stable' });
  });
});

describe('detectDesktop — env overrides (FR8)', () => {
  test('PS_FORCE_BROWSER=1 wins over everything', () => {
    const result = detectDesktop(
      baseDeps({
        env: { PS_FORCE_BROWSER: '1', PS_FORCE_DESKTOP: '1' },
        statSync: statForFile(APP_EXEC),
      }),
    );
    expect(result).toEqual({ available: false, reason: 'force-browser', cliProduct: 'stable' });
  });

  test('PS_FORCE_BROWSER=1 with darwin + bundle still returns false', () => {
    const result = detectDesktop(
      baseDeps({
        env: { PS_FORCE_BROWSER: '1' },
        statSync: statForFile(APP_EXEC),
      }),
    );
    expect(result.available).toBe(false);
    expect(result.reason).toBe('force-browser');
  });

  test('PS_FORCE_DESKTOP=1 skips headless gate when bundle present (FR10 ordering)', () => {
    const result = detectDesktop(
      baseDeps({
        env: { PS_FORCE_DESKTOP: '1', SSH_CONNECTION: '10.0.0.1 22' },
        isTTY: false,
        statSync: statForFile(APP_EXEC),
      }),
    );
    expect(result.available).toBe(true);
    expect(result.reason).toBe('available');
  });

  test('PS_FORCE_DESKTOP=1 still requires a bundle to exist', () => {
    const result = detectDesktop(
      baseDeps({
        env: { PS_FORCE_DESKTOP: '1' },
        statSync: () => null,
      }),
    );
    expect(result.available).toBe(false);
    expect(result.reason).toBe('no-bundle');
  });
});

describe('detectDesktop — unsupported channel override', () => {
  test('an unsupported channel falls back to the npm CLI product and warns once', () => {
    const warn = vi.fn();
    const result = detectDesktop(
      baseDeps({ env: { [PS_CHANNEL_ENV]: 'nightly' }, statSync: statForFile(APP_EXEC), warn }),
    );
    expect(result).toEqual({
      available: true,
      reason: 'available',
      bundlePath: '/Applications/Palimpsest.app',
      product: 'stable',
      cliProduct: 'stable',
    });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      `Treating this CLI as Palimpsest (Stable) for this command: Unsupported ${PS_CHANNEL_ENV}="nightly". Expected stable or beta or dev.`,
    );
  });

  test('an unsupported channel falls back to the bundled Beta executable, not Stable', () => {
    const warn = vi.fn();
    const result = detectDesktop(
      baseDeps({
        platform: 'linux',
        env: { [PS_CHANNEL_ENV]: 'nightly', ELECTRON_RUN_AS_NODE: '1', DISPLAY: ':0' },
        execPath: '/opt/Palimpsest Beta/palimpsest-beta',
        warn,
      }),
    );
    expect(result).toEqual({
      available: true,
      reason: 'available',
      bundlePath: '/opt/Palimpsest Beta/palimpsest-beta',
      product: 'beta',
      cliProduct: 'beta',
    });
    expect(warn).toHaveBeenCalledWith(
      `Treating this CLI as Palimpsest Beta for this command: Unsupported ${PS_CHANNEL_ENV}="nightly". Expected stable or beta or dev.`,
    );
  });

  test('a supported channel override does not warn', () => {
    const warn = vi.fn();
    const result = detectDesktop(baseDeps({ env: { [PS_CHANNEL_ENV]: 'beta' }, warn }));
    expect(result.cliProduct).toBe('beta');
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('detectDesktop — dev channel', () => {
  test('a dev-channel CLI never probes for a dev app, which is never packaged', () => {
    const probed: string[] = [];
    const result = detectDesktop(
      baseDeps({
        env: { [PS_CHANNEL_ENV]: 'dev' },
        statSync: (p) => {
          probed.push(p);
          return p === APP_EXEC ? { isFile: () => true, isDirectory: () => false } : null;
        },
      }),
    );
    expect(result).toMatchObject({ available: true, product: 'stable', cliProduct: 'dev' });
    expect(probed.filter((p) => p.includes('Palimpsest Dev'))).toEqual([]);
  });
});

describe('detectDesktop — headless gate (FR9 — CI is intentionally NOT a trigger)', () => {
  const WIN_EXE =
    'C:\\Users\\u\\AppData\\Local\\Programs\\@palimpsestdesktop\\Palimpsest.exe';

  test('isTTY=false → headless', () => {
    const result = detectDesktop(baseDeps({ isTTY: false, statSync: statForFile(APP_EXEC) }));
    expect(result.available).toBe(false);
    expect(result.reason).toBe('headless');
    expect(result.bundlePath).toBe('/Applications/Palimpsest.app');
  });

  test('isTTY=undefined → headless (treated as false)', () => {
    const result = detectDesktop(baseDeps({ isTTY: undefined, statSync: statForFile(APP_EXEC) }));
    expect(result.reason).toBe('headless');
  });

  test('win32: isTTY=undefined → available (console-wrapper signature)', () => {
    const result = detectDesktop(
      baseDeps({
        platform: 'win32',
        isTTY: undefined,
        env: { LOCALAPPDATA: 'C:\\Users\\u\\AppData\\Local' },
        statSync: statForFile(WIN_EXE),
      }),
    );
    expect(result).toEqual({
      available: true,
      reason: 'available',
      bundlePath: WIN_EXE,
      product: 'stable',
      cliProduct: 'stable',
    });
  });

  test('win32: isTTY=undefined + CI env → headless', () => {
    const result = detectDesktop(
      baseDeps({
        platform: 'win32',
        isTTY: undefined,
        env: { LOCALAPPDATA: 'C:\\Users\\u\\AppData\\Local', CI: 'true' },
        statSync: statForFile(WIN_EXE),
      }),
    );
    expect(result.reason).toBe('headless');
  });

  test('win32: isTTY=undefined + SSH_CONNECTION → headless', () => {
    const result = detectDesktop(
      baseDeps({
        platform: 'win32',
        isTTY: undefined,
        env: { LOCALAPPDATA: 'C:\\Users\\u\\AppData\\Local', SSH_CONNECTION: '10.0.0.1 22' },
        statSync: statForFile(WIN_EXE),
      }),
    );
    expect(result.reason).toBe('headless');
  });

  test('win32: isTTY=false stays headless (explicit non-TTY signal)', () => {
    const result = detectDesktop(
      baseDeps({
        platform: 'win32',
        isTTY: false,
        env: { LOCALAPPDATA: 'C:\\Users\\u\\AppData\\Local' },
        statSync: statForFile(WIN_EXE),
      }),
    );
    expect(result.reason).toBe('headless');
  });

  test('SSH_CONNECTION set → headless', () => {
    const result = detectDesktop(
      baseDeps({
        env: { SSH_CONNECTION: '10.0.0.1 22 192.168.1.1 22' },
        statSync: statForFile(APP_EXEC),
      }),
    );
    expect(result.reason).toBe('headless');
  });

  test('SSH_TTY set → headless', () => {
    const result = detectDesktop(
      baseDeps({
        env: { SSH_TTY: '/dev/pts/0' },
        statSync: statForFile(APP_EXEC),
      }),
    );
    expect(result.reason).toBe('headless');
  });

  test('CI=1 with isTTY=true → still available (CI not a trigger per design challenge 4)', () => {
    const result = detectDesktop(
      baseDeps({
        env: { CI: '1' },
        isTTY: true,
        statSync: statForFile(APP_EXEC),
      }),
    );
    expect(result.available).toBe(true);
    expect(result.reason).toBe('available');
  });

  test('CI=true with isTTY=false → headless via isTTY (CI redundant)', () => {
    const result = detectDesktop(
      baseDeps({
        env: { CI: 'true' },
        isTTY: false,
        statSync: statForFile(APP_EXEC),
      }),
    );
    expect(result.reason).toBe('headless');
  });
});

describe('launchDesktop — spawn shape (FR11)', () => {
  test('spawns open with the detected bundle path, detached, stdio:ignore, unref()', () => {
    let captured: { command?: string; args?: readonly string[]; opts?: SpawnOptions } = {};
    let unrefCalled = false;

    const fakeChild = {
      unref: () => {
        unrefCalled = true;
      },
    };
    const fakeSpawn = ((command: string, args: readonly string[], opts: SpawnOptions) => {
      captured = { command, args, opts };
      return fakeChild;
    }) as unknown as Parameters<typeof launchDesktop>[0]['spawn'];

    let logged = '';
    launchDesktop(
      { spawn: fakeSpawn, log: (m) => (logged = m), platform: 'darwin' },
      {
        available: true,
        reason: 'available',
        bundlePath: '/Applications/Palimpsest.app',
        product: 'stable',
        cliProduct: 'stable',
      },
    );

    expect(captured.command).toBe('open');
    expect(captured.args).toEqual(['-a', '/Applications/Palimpsest.app']);
    expect(captured.opts?.detached).toBe(true);
    expect(captured.opts?.stdio).toBe('ignore');
    expect(unrefCalled).toBe(true);
    expect(logged).toContain('Launching Palimpsest desktop');
    expect(logged).toContain('PS_FORCE_BROWSER=1');
    expect(logged).toContain('ps start');
  });

  test('a Stable CLI opening a Beta-only install names the Beta app but its own start command', () => {
    let spawnedArgs: readonly string[] | undefined;
    const fakeSpawn = ((_command: string, args: readonly string[]) => {
      spawnedArgs = args;
      return { unref: () => {} };
    }) as unknown as Parameters<typeof launchDesktop>[0]['spawn'];
    const detection = detectDesktop(baseDeps({ statSync: statForFile(BETA_APP_EXEC) }));
    let logged = '';
    launchDesktop({ spawn: fakeSpawn, log: (m) => (logged = m), platform: 'darwin' }, detection);

    expect(spawnedArgs).toEqual(['-a', '/Applications/Palimpsest Beta.app']);
    expect(logged).toContain('Launching Palimpsest Beta desktop');
    expect(logged).toContain('`ps start`');
    expect(logged).not.toContain('ps-beta');
  });

  test('a Beta CLI that falls back to the Stable app still names its own start command', () => {
    const fakeSpawn = (() => ({ unref: () => {} })) as unknown as Parameters<
      typeof launchDesktop
    >[0]['spawn'];
    const detection = detectDesktop(
      baseDeps({ env: { PS_CHANNEL: 'beta' }, statSync: statForFile(APP_EXEC) }),
    );
    let logged = '';
    launchDesktop({ spawn: fakeSpawn, log: (m) => (logged = m), platform: 'darwin' }, detection);

    expect(detection).toMatchObject({ product: 'stable', cliProduct: 'beta' });
    expect(logged).toContain('Launching Palimpsest desktop');
    expect(logged).toContain('`ps-beta start`');
  });

  test('skips the spawn when the detection carries no executable', () => {
    let spawned = false;
    const fakeSpawn = (() => {
      spawned = true;
      return { unref: () => {} };
    }) as unknown as Parameters<typeof launchDesktop>[0]['spawn'];
    const logs: string[] = [];
    launchDesktop(
      { spawn: fakeSpawn, log: (m) => logs.push(m), platform: 'darwin' },
      { available: false, reason: 'no-bundle', cliProduct: 'stable' },
    );
    expect(spawned).toBe(false);
    expect(logs).toEqual(['Desktop launch skipped: no resolved desktop executable (caller bug).']);
  });

  for (const platform of ['win32', 'linux'] as const) {
    test(`${platform}: spawns the detected desktop executable directly, detached + unref`, () => {
      let captured: { command?: string; args?: readonly string[]; opts?: SpawnOptions } = {};
      let unrefCalled = false;
      const fakeSpawn = ((command: string, args: readonly string[], opts: SpawnOptions) => {
        captured = { command, args, opts };
        return {
          unref: () => {
            unrefCalled = true;
          },
        };
      }) as unknown as Parameters<typeof launchDesktop>[0]['spawn'];

      const exe =
        platform === 'win32'
          ? 'C:\\Users\\u\\AppData\\Local\\Programs\\@palimpsestdesktop\\Palimpsest.exe'
          : '/opt/Palimpsest/palimpsest';
      launchDesktop(
        { spawn: fakeSpawn, log: () => {}, platform },
        {
          available: true,
          reason: 'available',
          bundlePath: exe,
          product: 'stable',
          cliProduct: 'stable',
        },
      );

      expect(captured.command).toBe(exe);
      expect(captured.args).toEqual([]);
      expect(captured.opts?.detached).toBe(true);
      expect(captured.opts?.stdio).toBe('ignore');
      expect(unrefCalled).toBe(true);
    });
  }

  test('spawn env omits ELECTRON_RUN_AS_NODE so the launched GUI does not boot as a Node host', () => {
    const prevValue = process.env.ELECTRON_RUN_AS_NODE;
    process.env.ELECTRON_RUN_AS_NODE = '1';
    try {
      let captured: { opts?: SpawnOptions } = {};
      const fakeSpawn = ((_command: string, _args: readonly string[], opts: SpawnOptions) => {
        captured = { opts };
        return { unref: () => {} };
      }) as unknown as Parameters<typeof launchDesktop>[0]['spawn'];

      launchDesktop(
        { spawn: fakeSpawn, log: () => {}, platform: 'darwin' },
        {
          available: true,
          reason: 'available',
          bundlePath: '/Applications/Palimpsest.app',
          product: 'stable',
          cliProduct: 'stable',
        },
      );

      expect(captured.opts?.env).toBeDefined();
      expect(captured.opts?.env).not.toHaveProperty('ELECTRON_RUN_AS_NODE');
    } finally {
      if (prevValue === undefined) delete process.env.ELECTRON_RUN_AS_NODE;
      else process.env.ELECTRON_RUN_AS_NODE = prevValue;
    }
  });

  test('uses bundle ID com.fractalmandala.palimpsest (matches electron-builder appId)', () => {
    expect(DESKTOP_BUNDLE_ID).toBe('com.fractalmandala.palimpsest');
  });
});

describe('UX message helpers — FR5 contextual notFoundMessage(reason)', () => {
  test('default (no-bundle) explains the miss + omit-mode hint', () => {
    const msg = notFoundMessage();
    expect(msg).toContain('not found');
    expect(msg).toContain('https://github.com/fractalmandala/palimpsest/download');
    expect(msg).toContain('--mode');
  });

  test('headless reason explains the gate + names PS_FORCE_DESKTOP override', () => {
    const msg = notFoundMessage('headless');
    expect(msg).toContain('headless');
    expect(msg).toContain('PS_FORCE_DESKTOP');
    expect(msg).not.toContain('not found');
  });

  test('unsupported-platform (and legacy darwin-only) name the platform constraint', () => {
    for (const reason of ['darwin-only', 'unsupported-platform'] as const) {
      const msg = notFoundMessage(reason);
      expect(msg).toContain('platform');
      expect(msg).toContain('--mode=browser');
    }
  });

  test('force-browser reason names the env override', () => {
    const msg = notFoundMessage('force-browser');
    expect(msg).toContain('PS_FORCE_BROWSER');
  });

  test('stat-error reason names the filesystem failure, platform-agnostically', () => {
    const msg = notFoundMessage('stat-error');
    expect(msg).not.toContain('/Applications');
    expect(msg).toMatch(/filesystem|permission/i);
  });

  test("'available' is a defensive case — caller bug surfaced in the message", () => {
    const msg = notFoundMessage('available');
    expect(msg).toContain('caller bug');
  });
});
