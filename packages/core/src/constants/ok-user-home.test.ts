import { join, relative, resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveConfigPath } from '../config/write-config-patch.ts';
import { posixOkManagedBinDir } from './ps-dir.ts';
import { psUserHomeDir } from './ps-user-home.ts';

const HOME = '/Users/someone';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('per-channel user home', () => {
  it('keeps Stable on ~/.ps exactly as before', () => {
    vi.stubEnv('PS_CHANNEL', 'stable');
    expect(psUserHomeDir(HOME)).toBe(join(HOME, '.ps'));
    expect(posixOkManagedBinDir(HOME)).toBe('/Users/someone/.ps/bin');
    expect(resolveConfigPath('user', '/project', HOME)).toBe(resolve(HOME, '.ps', 'global.yml'));
  });

  it('gives Beta a sibling ~/.ps-beta root for its home, PATH shims, and user config', () => {
    vi.stubEnv('PS_CHANNEL', 'beta');
    expect(psUserHomeDir(HOME)).toBe(join(HOME, '.ps-beta'));
    expect(posixOkManagedBinDir(HOME)).toBe('/Users/someone/.ps-beta/bin');
    expect(resolveConfigPath('user', '/project', HOME)).toBe(
      resolve(HOME, '.ps-beta', 'global.yml'),
    );
  });

  it('never nests one channel root inside the other', () => {
    vi.stubEnv('PS_CHANNEL', 'stable');
    const stable = psUserHomeDir(HOME);
    vi.stubEnv('PS_CHANNEL', 'beta');
    const beta = psUserHomeDir(HOME);
    expect(relative(stable, beta).startsWith('..')).toBe(true);
    expect(relative(beta, stable).startsWith('..')).toBe(true);
  });

  it('resolves the channel from a Beta executable without an override', () => {
    vi.stubEnv('PS_CHANNEL', undefined);
    const execPath = process.execPath;
    Object.defineProperty(process, 'execPath', {
      value: '/Applications/Palimpsest Beta.app/Contents/MacOS/Palimpsest Beta',
      configurable: true,
    });
    try {
      expect(psUserHomeDir(HOME)).toBe(join(HOME, '.ps-beta'));
    } finally {
      Object.defineProperty(process, 'execPath', { value: execPath, configurable: true });
    }
  });
});
