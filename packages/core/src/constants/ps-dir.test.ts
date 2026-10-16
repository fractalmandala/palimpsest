import { posix } from 'node:path';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { PS_BIN_DIRNAME, PS_DIR, posixPsManagedBinDir, psUserHomeDisplayPath } from './ps-dir.ts';

describe('psUserHomeDisplayPath', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test('names the Stable home folder by default', () => {
    vi.stubEnv('PS_CHANNEL', '');
    expect(psUserHomeDisplayPath()).toBe('~/.ps');
    expect(psUserHomeDisplayPath('global.yml')).toBe('~/.ps/global.yml');
    expect(psUserHomeDisplayPath('logs')).toBe('~/.ps/logs');
  });

  test('names the Beta home folder when the running channel is Beta', () => {
    vi.stubEnv('PS_CHANNEL', 'beta');
    expect(psUserHomeDisplayPath('global.yml')).toBe('~/.ps-beta/global.yml');
    expect(psUserHomeDisplayPath('secrets.yml')).toBe('~/.ps-beta/secrets.yml');
  });
});

describe('posixPsManagedBinDir', () => {
  test('is the OK dir plus the bin dirname, under the given home', () => {
    expect(posixPsManagedBinDir('/Users/alice')).toBe(`/Users/alice/${PS_DIR}/${PS_BIN_DIRNAME}`);
    expect(posixPsManagedBinDir('/Users/alice')).toBe('/Users/alice/.ps/bin');
  });

  test('normalizes trailing separators on the home it is given', () => {
    expect(posixPsManagedBinDir('/Users/alice/')).toBe('/Users/alice/.ps/bin');
    expect(posixPsManagedBinDir('/Users/alice///')).toBe('/Users/alice/.ps/bin');
  });

  test('collapses repeated interior separators the way posix.join would', () => {
    expect(posixPsManagedBinDir('/Users//alice')).toBe('/Users/alice/.ps/bin');
    expect(posixPsManagedBinDir('//Users/alice')).toBe('/Users/alice/.ps/bin');
  });

  test('leaves a backslash alone, since it is a legal character in a POSIX home', () => {
    expect(posixPsManagedBinDir('/home/a\\b')).toBe('/home/a\\b/.ps/bin');
  });

  test('leaves a root home resolvable', () => {
    expect(posixPsManagedBinDir('/')).toBe('/.ps/bin');
  });

  test('stays byte-identical to the posix join both call sites used before they shared it', () => {
    for (const home of ['/Users/alice', '/Users/alice/', '/home/a\\b', '/']) {
      expect(posixPsManagedBinDir(home)).toBe(posix.join(home, PS_DIR, PS_BIN_DIRNAME));
    }
  });
});
