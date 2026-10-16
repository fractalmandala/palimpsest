import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { skillsCommand } from './skills.ts';

let projectDir: string;

beforeEach(() => {
  projectDir = mkdtempSync(join(tmpdir(), 'ps-skills-import-'));
  vi.spyOn(process, 'cwd').mockReturnValue(projectDir);
  vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  process.exitCode = undefined;
  rmSync(projectDir, { recursive: true, force: true });
});

describe('skills import without a running server', () => {
  test.each([
    ['stable', 'ok'],
    ['beta', 'ps-beta'],
  ])('%s: names %s start as the remedy', async (channel, command) => {
    vi.stubEnv('PS_CHANNEL', channel);
    await skillsCommand().parseAsync(['import', 'owner/repo'], { from: 'user' });
    const stderr = vi
      .mocked(process.stderr.write)
      .mock.calls.map(([text]) => String(text))
      .join('');
    expect(stderr).toContain('no running Palimpsest server for this project. Start it with');
    expect(stderr).toContain(`${command} start`);
    expect(stderr).toContain(' and retry.\n');
    expect(process.exitCode).toBe(1);
  });
});
