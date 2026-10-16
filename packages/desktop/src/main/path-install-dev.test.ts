import { existsSync, mkdtempSync, readFileSync, readlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, test, vi } from 'vitest';

const previousChannel = vi.hoisted(() => {
  const previous = process.env.PS_CHANNEL;
  process.env.PS_CHANNEL = 'dev';
  return previous;
});

import { ensureCliOnPath, pathInstallMarkerPath } from './path-install.ts';

afterAll(() => {
  if (previousChannel === undefined) delete process.env.PS_CHANNEL;
  else process.env.PS_CHANNEL = previousChannel;
});

const STABLE_EXE = '/Applications/Palimpsest.app/Contents/MacOS/Palimpsest';
const STABLE_WRAPPER = '/Applications/Palimpsest.app/Contents/Resources/cli/bin/ps.sh';

describe('forced PATH install from a dev build', () => {
  test('lands in the dev home under dev command names, leaving Stable untouched', async () => {
    const userHome = mkdtempSync(join(tmpdir(), 'ps-dev-path-install-'));
    const zshrc = join(userHome, '.zshrc');
    const stableBlock = '# >>> palimpsest cli >>>\nstable\n# <<< palimpsest cli <<<\n';
    writeFileSync(zshrc, stableBlock);

    const result = await ensureCliOnPath({
      executablePath: STABLE_EXE,
      isPackaged: false,
      forceEnv: '1',
      platform: 'darwin',
      home: userHome,
      bundleVersion: '0.0.0-dev',
      env: { HOME: userHome, SHELL: '/bin/zsh' },
      spawn: async () => ({ code: 0, stdout: '/usr/bin:/bin', stderr: '' }),
      consentDecision: { status: 'granted', at: '2026-10-13T00:00:00.000Z' },
    });

    expect(result.status).toBe('installed');
    const devRoot = join(userHome, '.ps-dev');
    expect(pathInstallMarkerPath(userHome)).toBe(join(devRoot, 'path-install.json'));
    expect(readlinkSync(join(devRoot, 'bin', 'ps-dev'))).toBe(STABLE_WRAPPER);
    expect(readlinkSync(join(devRoot, 'bin', 'palimpsest-dev'))).toBe(STABLE_WRAPPER);
    expect(readFileSync(join(devRoot, 'env.sh'), 'utf8')).toContain('$' + '{HOME}/.ps-dev/bin');
    const rc = readFileSync(zshrc, 'utf8');
    expect(rc).toContain(stableBlock);
    expect(rc).toContain('# >>> palimpsest dev cli >>>');
    expect(existsSync(join(userHome, '.ps'))).toBe(false);
    expect(
      existsSync(
        join(userHome, 'Library', 'Application Support', 'Palimpsest', 'path-install.json'),
      ),
    ).toBe(false);
  });
});
