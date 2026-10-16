import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { bootServer, ConfigSchema, initContent } from '@palimpsest/server';
import { afterEach, describe, expect, test } from 'vitest';
import { createLinkedWorktree, type LinkedWorktreeHandle } from './worktree-test-harness.ts';

const TEST_CONFIG = ConfigSchema.parse({});

let handle: LinkedWorktreeHandle | null = null;

afterEach(() => {
  handle?.cleanup();
  handle = null;
});

describe('initContent in a linked worktree (FR4 / D7)', () => {
  test('fresh worktree (P3): scaffolds .ps/ on first invocation', () => {
    handle = createLinkedWorktree({ seedPsScaffold: false });
    expect(existsSync(resolve(handle.worktreePath, '.ps'))).toBe(false);

    const result = initContent(handle.worktreePath);

    expect(existsSync(resolve(handle.worktreePath, '.ps/config.yml'))).toBe(true);
    expect(existsSync(resolve(handle.worktreePath, '.ps/.gitignore'))).toBe(true);
    expect(result.created).toContain('config.yml');
    expect(result.created).toContain('.gitignore');
  });

  test('committed config.yml (P1): writeIfMissing skip leaves bytes unchanged on second init', () => {
    handle = createLinkedWorktree({ seedPsScaffold: false });
    const psDir = resolve(handle.worktreePath, '.ps');
    const customConfig = '# user-customized\nlogLevel: debug\n';
    const customGitignore = '# user-customized\nprincipal.json\n';
    mkdirSync(psDir, { recursive: true });
    writeFileSync(resolve(psDir, 'config.yml'), customConfig, 'utf-8');
    writeFileSync(resolve(psDir, '.gitignore'), customGitignore, 'utf-8');

    const result = initContent(handle.worktreePath);

    expect(readFileSync(resolve(psDir, 'config.yml'), 'utf-8')).toBe(customConfig);
    expect(result.skipped).toContain('config.yml');
    const gitignoreAfter = readFileSync(resolve(psDir, '.gitignore'), 'utf-8');
    expect(gitignoreAfter).toContain('# user-customized');
    expect(gitignoreAfter).toContain('principal.json');
  });

  test('init then boot: same worktree, end-to-end pipeline succeeds', async () => {
    handle = createLinkedWorktree({ seedPsScaffold: false });
    initContent(handle.worktreePath);

    const booted = await bootServer({
      host: '127.0.0.1',
      config: TEST_CONFIG,
      contentDir: handle.worktreePath,
      port: 0,
      quiet: true,
      gitEnabled: false,
      idleShutdownMs: null,
    });
    try {
      await booted.ready;
      const expectedShadowHead = resolve(handle.worktreeGitdir, 'ps/HEAD');
      expect(existsSync(expectedShadowHead)).toBe(true);
    } finally {
      await booted.destroy();
    }
  });
});
