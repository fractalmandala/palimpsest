import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  DESKTOP_LEGACY_PRODUCT_NAMES,
  DESKTOP_PRODUCT_NAME,
  DESKTOP_UPDATER_CACHE_DIR_NAME,
  desktopUpdaterCacheDir,
  desktopUserDataDir,
  readDesktopRecentProjects,
  stateDirIsOurs,
} from './desktop-state.ts';

describe('desktopUserDataDir', () => {
  test('resolves the Electron userData path per platform', () => {
    expect(desktopUserDataDir({ home: '/Users/x', platformName: 'darwin' })).toBe(
      '/Users/x/Library/Application Support/Palimpsest',
    );
    expect(desktopUserDataDir({ home: '/home/x', platformName: 'linux', env: {} })).toBe(
      '/home/x/.config/Palimpsest',
    );
    expect(
      desktopUserDataDir({ home: '/home/x', platformName: 'linux', env: { XDG_CONFIG_HOME: '' } }),
    ).toBe('/home/x/.config/Palimpsest');
    expect(
      desktopUserDataDir({
        home: '/home/x',
        platformName: 'linux',
        env: { XDG_CONFIG_HOME: '/cfg' },
      }),
    ).toBe('/cfg/Palimpsest');
    expect(
      desktopUserDataDir({
        home: 'C:\\Users\\x',
        platformName: 'win32',
        env: { APPDATA: 'C:\\Users\\x\\AppData\\Roaming' },
      }),
    ).toBe('C:\\Users\\x\\AppData\\Roaming\\Palimpsest');
    expect(desktopUserDataDir({ home: 'C:\\Users\\x', platformName: 'win32', env: {} })).toBe(
      'C:\\Users\\x\\AppData\\Roaming\\Palimpsest',
    );
    expect(
      desktopUserDataDir({ home: 'C:\\Users\\x', platformName: 'win32', env: { APPDATA: '' } }),
    ).toBe('C:\\Users\\x\\AppData\\Roaming\\Palimpsest');
  });

  test('the legacy product names resolve the upstream macOS dirs', () => {
    expect(DESKTOP_LEGACY_PRODUCT_NAMES).toEqual(['OpenKnowledge', 'Open Knowledge']);
    for (const legacy of DESKTOP_LEGACY_PRODUCT_NAMES) {
      expect(
        desktopUserDataDir({ home: '/Users/x', platformName: 'darwin', productName: legacy }),
      ).toBe(`/Users/x/Library/Application Support/${legacy}`);
    }
    expect(DESKTOP_LEGACY_PRODUCT_NAMES).not.toContain(DESKTOP_PRODUCT_NAME);
  });
});

describe('desktopUpdaterCacheDir', () => {
  test('matches legacy updater cache paths per platform', () => {
    expect(desktopUpdaterCacheDir({ home: '/Users/x', platformName: 'darwin', env: {} })).toBe(
      `/Users/x/Library/Caches/${DESKTOP_UPDATER_CACHE_DIR_NAME}`,
    );
    expect(desktopUpdaterCacheDir({ home: '/home/x', platformName: 'linux', env: {} })).toBe(
      `/home/x/.cache/${DESKTOP_UPDATER_CACHE_DIR_NAME}`,
    );
    expect(
      desktopUpdaterCacheDir({
        home: '/home/x',
        platformName: 'linux',
        env: { XDG_CACHE_HOME: '' },
      }),
    ).toBe(`/home/x/.cache/${DESKTOP_UPDATER_CACHE_DIR_NAME}`);
    expect(
      desktopUpdaterCacheDir({
        home: '/home/x',
        platformName: 'linux',
        env: { XDG_CACHE_HOME: '/cache' },
      }),
    ).toBe(`/cache/${DESKTOP_UPDATER_CACHE_DIR_NAME}`);
    expect(
      desktopUpdaterCacheDir({
        home: 'C:\\Users\\x',
        platformName: 'win32',
        env: { LOCALAPPDATA: 'D:\\Local' },
      }),
    ).toBe(`D:\\Local\\${DESKTOP_UPDATER_CACHE_DIR_NAME}`);
    expect(desktopUpdaterCacheDir({ home: 'C:\\Users\\x', platformName: 'win32', env: {} })).toBe(
      `C:\\Users\\x\\AppData\\Local\\${DESKTOP_UPDATER_CACHE_DIR_NAME}`,
    );
    expect(
      desktopUpdaterCacheDir({
        home: 'C:\\Users\\x',
        platformName: 'win32',
        env: { LOCALAPPDATA: '' },
      }),
    ).toBe(`C:\\Users\\x\\AppData\\Local\\${DESKTOP_UPDATER_CACHE_DIR_NAME}`);
  });
});

function writeState(dir: string, value: unknown): void {
  writeFileSync(join(dir, 'state.json'), JSON.stringify(value));
}

describe('readDesktopRecentProjects', () => {
  test('reads the recent-projects list, keeping only string path+name entries', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ps-state-'));
    try {
      writeState(dir, {
        recentProjects: [
          { path: '/a', name: 'A', lastOpenedAt: 't' },
          { path: '/b', name: 'B' },
          { path: 123, name: 'bad' },
          'garbage',
        ],
        lastOpenedProject: '/a',
      });
      expect(readDesktopRecentProjects(dir)).toEqual([
        { path: '/a', name: 'A' },
        { path: '/b', name: 'B' },
      ]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('returns [] for an absent, malformed, or foreign-shaped state.json', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ps-state-'));
    try {
      expect(readDesktopRecentProjects(dir)).toEqual([]);
      writeFileSync(join(dir, 'state.json'), 'not json');
      expect(readDesktopRecentProjects(dir)).toEqual([]);
      writeState(dir, { somethingElse: true });
      expect(readDesktopRecentProjects(dir)).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('stateDirIsOurs', () => {
  test('true only when state.json parses as our AppState shape', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ps-state-'));
    try {
      expect(stateDirIsOurs(dir)).toBe(false);
      writeState(dir, { recentProjects: [] });
      expect(stateDirIsOurs(dir)).toBe(true);
      writeState(dir, { recentProjects: [{ path: '/p', name: 'P', lastOpenedAt: 't' }] });
      expect(stateDirIsOurs(dir)).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('false for a FOREIGN vendor’s same-named dir (no recentProjects array)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ps-state-'));
    try {
      writeState(dir, { windows: [], preferences: { theme: 'dark' } });
      expect(stateDirIsOurs(dir)).toBe(false);
      writeFileSync(join(dir, 'state.json'), '{ broken json');
      expect(stateDirIsOurs(dir)).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
