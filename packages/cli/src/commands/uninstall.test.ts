import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { Readable } from 'node:stream';
import { SHARED_OK_ENTRIES } from '@palimpsest/core';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { ensurePiBridge } from './pi-acp-bridge.ts';
import {
  detectInstallMethods,
  resolveRecentDeinitProjects,
  runUninstall,
  uninstallCommand,
} from './uninstall.ts';

function write(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

describe('detectInstallMethods', () => {
  test('detects an app bundle, npm-global, and npx', () => {
    const home = mkdtempSync(join(tmpdir(), 'ps-detect-'));
    try {
      const userApp = join(home, 'Applications', 'Palimpsest.app');
      const npmStub = (args: string[]) =>
        args.includes('@palimpsest/cli') ? '@palimpsest/cli@1.2.3\n' : null;
      const methods = detectInstallMethods(
        home,
        '/Users/x/.npm/_npx/abcd/node_modules/.bin/ok',
        npmStub,
        (p) => p === userApp,
        { platform: 'darwin' },
      );
      const kinds = methods.map((m) => m.method);
      expect(kinds).toContain('app');
      expect(kinds).toContain('npm-global');
      expect(kinds).toContain('npx');
      expect(methods.find((m) => m.method === 'npm-global')?.instruction).toContain(
        'npm uninstall -g',
      );
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });

  test('reports Stable and Beta app bundles separately on macOS', () => {
    const home = '/Users/jane';
    const installed = new Set([
      '/Applications/Palimpsest.app',
      join(home, 'Applications', 'Palimpsest Beta.app'),
    ]);
    const methods = detectInstallMethods(
      home,
      undefined,
      () => null,
      (path) => installed.has(path),
      { platform: 'darwin' },
    );
    expect(methods).toHaveLength(2);
    expect(methods.map((method) => method.label)).toEqual([
      'Palimpsest (/Applications/Palimpsest.app)',
      'Palimpsest Beta (/Users/jane/Applications/Palimpsest Beta.app)',
    ]);
  });

  test('a Beta CLI lists the same Stable and Beta apps as a Stable CLI', () => {
    const home = '/Users/jane';
    const installed = new Set([
      '/Applications/Palimpsest.app',
      '/Applications/Palimpsest Beta.app',
    ]);
    const labels = (execPath: string) =>
      detectInstallMethods(
        home,
        undefined,
        () => null,
        (path) => installed.has(path),
        { platform: 'darwin', env: {}, execPath },
      ).map((method) => method.label);
    const expected = [
      'Palimpsest (/Applications/Palimpsest.app)',
      'Palimpsest Beta (/Applications/Palimpsest Beta.app)',
    ];
    expect(labels('/usr/local/bin/node')).toEqual(expected);
    expect(labels('/Applications/Palimpsest Beta.app/Contents/MacOS/Palimpsest Beta')).toEqual(
      expected,
    );
  });

  test('detects the Windows NSIS install and points at Settings → Apps', () => {
    const localAppData = 'C:\\Users\\Jane\\AppData\\Local';
    const exe = join(localAppData, 'Programs', '@palimpsestdesktop', 'Palimpsest.exe');
    const methods = detectInstallMethods(
      'C:\\Users\\Jane',
      undefined,
      () => null,
      (p) => p === exe,
      {
        platform: 'win32',
        env: { LOCALAPPDATA: localAppData },
      },
    );
    expect(methods.map((m) => m.method)).toEqual(['app']);
    expect(methods[0]?.instruction).toContain('Settings');
  });

  test('reports Stable and Beta Windows installs separately', () => {
    const localAppData = 'C:\\Users\\Jane\\AppData\\Local';
    const installed = new Set([
      join(localAppData, 'Programs', '@palimpsestdesktop', 'Palimpsest.exe'),
      join(localAppData, 'Programs', 'palimpsest-beta-desktop', 'Palimpsest Beta.exe'),
    ]);
    const methods = detectInstallMethods(
      'C:\\Users\\Jane',
      undefined,
      () => null,
      (path) => installed.has(path),
      { platform: 'win32', env: { LOCALAPPDATA: localAppData } },
    );
    expect(methods).toHaveLength(2);
    expect(methods.map((method) => method.label)).toEqual([
      expect.stringContaining('Palimpsest ('),
      expect.stringContaining('Palimpsest Beta ('),
    ]);
  });

  test('detects the Linux deb/rpm install and names both package managers', () => {
    const methods = detectInstallMethods(
      '/home/jane',
      undefined,
      () => null,
      (p) => p === '/opt/Palimpsest/palimpsest',
      { platform: 'linux', queryPackageDatabase: () => null },
    );
    expect(methods.map((m) => m.method)).toEqual(['app']);
    expect(methods[0]?.instruction).toBe(
      'Remove with your package manager: sudo apt remove palimpsest (Debian/Ubuntu), sudo dnf remove palimpsest (Fedora/RHEL) or sudo zypper remove palimpsest (openSUSE)',
    );
  });

  test('reports the Beta Linux install by product name', () => {
    const methods = detectInstallMethods(
      '/home/jane',
      undefined,
      () => null,
      (path) => path === '/opt/Palimpsest Beta/palimpsest-beta',
      { platform: 'linux', queryPackageDatabase: () => null },
    );
    expect(methods).toEqual([
      {
        method: 'app',
        label: 'Palimpsest Beta (/opt/Palimpsest Beta)',
        instruction:
          'Remove with your package manager: sudo apt remove palimpsest-beta (Debian/Ubuntu), sudo dnf remove palimpsest-beta (Fedora/RHEL) or sudo zypper remove palimpsest-beta (openSUSE)',
      },
    ]);
  });

  test.each([
    {
      installed: 'a Beta deb from before the rename',
      executable: '/opt/Palimpsest Beta/palimpsest-beta',
      dpkg: 'palimpsest-beta-desktop: /opt/Palimpsest Beta/palimpsest-beta\n',
      rpm: null,
      instruction: 'sudo apt remove palimpsest-beta-desktop',
    },
    {
      installed: 'a renamed Beta deb',
      executable: '/opt/Palimpsest Beta/palimpsest-beta',
      dpkg: 'palimpsest-beta: /opt/Palimpsest Beta/palimpsest-beta\n',
      rpm: null,
      instruction: 'sudo apt remove palimpsest-beta',
    },
    {
      installed: 'a Stable rpm from before the rename',
      executable: '/opt/Palimpsest/palimpsest',
      dpkg: null,
      rpm: 'Palimpsest\n',
      instruction:
        'sudo dnf remove Palimpsest (Fedora/RHEL) or sudo zypper remove Palimpsest (openSUSE)',
    },
    {
      installed: 'a renamed Stable rpm',
      executable: '/opt/Palimpsest/palimpsest',
      dpkg: null,
      rpm: 'palimpsest\n',
      instruction:
        'sudo dnf remove palimpsest (Fedora/RHEL) or sudo zypper remove palimpsest (openSUSE)',
    },
  ])('names the package that owns $installed', ({ executable, dpkg, rpm, instruction }) => {
    const queries: string[][] = [];
    const methods = detectInstallMethods(
      '/home/jane',
      undefined,
      () => null,
      (p) => p === executable,
      {
        platform: 'linux',
        queryPackageDatabase: (command, args) => {
          queries.push([command, ...args]);
          return command === 'dpkg-query' ? dpkg : rpm;
        },
      },
    );
    expect(methods.map((m) => m.instruction)).toEqual([
      `Remove with your package manager: ${instruction}`,
    ]);
    expect(queries).toEqual([
      ['dpkg-query', '-S', executable],
      ...(dpkg === null ? [['rpm', '-qf', '--queryformat', '%{NAME}\n', executable]] : []),
    ]);
  });

  test('returns nothing when no install is detected', () => {
    const home = mkdtempSync(join(tmpdir(), 'ps-detect-'));
    try {
      expect(
        detectInstallMethods(
          home,
          '/usr/local/bin/ok',
          () => null,
          () => false,
        ),
      ).toEqual([]);
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });
});

describe('resolveRecentDeinitProjects', () => {
  function twoProjects(): { home: string; a: string; b: string } {
    const home = mkdtempSync(join(tmpdir(), 'ps-recent-'));
    const a = join(home, 'projA');
    const b = join(home, 'projB');
    write(join(a, '.ps', 'config.yml'), 'x\n');
    write(join(b, '.ps', 'config.yml'), 'x\n');
    return { home, a, b };
  }

  test('--yes alone selects NO projects (opt-in — global only)', async () => {
    const { home, a, b } = twoProjects();
    try {
      const selected = await resolveRecentDeinitProjects({
        home,
        platform: 'darwin',
        cwd: a,
        lockDirs: [],
        yes: true,
        readRecents: () => [{ path: b }],
        findRoot: () => ({ rootPath: a, distance: 0 }),
      });
      expect(selected).toEqual([]);
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });

  test('--all-projects selects current + recents', async () => {
    const { home, a, b } = twoProjects();
    try {
      const selected = await resolveRecentDeinitProjects({
        home,
        platform: 'darwin',
        cwd: a,
        lockDirs: [],
        yes: true,
        allProjects: true,
        readRecents: () => [{ path: b }],
        findRoot: () => ({ rootPath: a, distance: 0 }),
      });
      expect(selected).toContain(a);
      expect(selected).toContain(b);
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });

  test('--dry-run selects nothing by default (opt-in preview)', async () => {
    const { home, a, b } = twoProjects();
    try {
      const selected = await resolveRecentDeinitProjects({
        home,
        platform: 'darwin',
        cwd: a,
        lockDirs: [],
        dryRun: true,
        readRecents: () => [{ path: b }],
        findRoot: () => ({ rootPath: a, distance: 0 }),
      });
      expect(selected).toEqual([]);
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });

  test('interactive: only the ticked projects are selected (default is none)', async () => {
    const { home, a, b } = twoProjects();
    try {
      const selected = await resolveRecentDeinitProjects({
        home,
        platform: 'darwin',
        cwd: a,
        lockDirs: [],
        isTTY: true,
        readRecents: () => [{ path: b }],
        findRoot: () => ({ rootPath: a, distance: 0 }),
        promptFn: async (candidates) => candidates.filter((c) => c.path === b).map((c) => c.path),
      });
      expect(selected).toEqual([b]);
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });

  test('--all-projects skips recent entries whose dir no longer exists / is not an OK project', async () => {
    const { home, a } = twoProjects();
    try {
      const selected = await resolveRecentDeinitProjects({
        home,
        platform: 'darwin',
        cwd: a,
        lockDirs: [],
        allProjects: true,
        readRecents: () => [{ path: join(home, 'deleted-project') }],
        findRoot: () => ({ rootPath: a, distance: 0 }),
      });
      expect(selected).toEqual([a]);
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });
});

describe('runUninstall', () => {
  test('uses its explicit environment to clean Pi trust for selected projects', async () => {
    const home = mkdtempSync(join(tmpdir(), 'ps-uninstall-pi-'));
    const cwd = join(home, 'project');
    const agentDir = join(home, 'custom-pi');
    const trustPath = join(agentDir, 'trust.json');
    const defaultTrustPath = join(home, '.pi', 'agent', 'trust.json');
    const unrelated = join(home, 'other-project');
    const env = { PI_CODING_AGENT_DIR: agentDir };
    const defaultTrust = `${JSON.stringify({ [cwd]: true })}\n`;
    try {
      write(join(cwd, '.ps', 'config.yml'), 'content:\n  dir: .\n');
      write(defaultTrustPath, defaultTrust);
      write(trustPath, JSON.stringify({ [unrelated]: true }));
      await ensurePiBridge(cwd, { mode: 'published' }, home, env);

      const result = await runUninstall({
        home,
        cwd,
        env,
        platform: 'darwin',
        yes: true,
        deps: {
          discoverLockDirs: async () => [],
          resolveRecentProjects: async () => [cwd],
          detectInstallMethods: () => [],
          probeClients: async () => null,
          runRemovalDeps: {
            clearToken: async () => ({ touched: [] }),
            clearEmbeddingsKey: async () => ({ touched: [] }),
            stopServer: async () => ({ stopped: 0, failed: [] }),
          },
        },
      });

      expect(result.status).toBe('done');
      expect(existsSync(join(cwd, '.pi', 'extensions', 'palimpsest.ts'))).toBe(false);
      expect(JSON.parse(readFileSync(trustPath, 'utf8'))).toEqual({ [unrelated]: true });
      expect(readFileSync(defaultTrustPath, 'utf8')).toBe(defaultTrust);
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });

  test.each([
    ['/usr/local/bin/node', 'The palimpsest:// URL scheme'],
    ['/opt/Palimpsest Beta/palimpsest-beta', 'The palimpsest-beta:// URL scheme'],
  ])('names the URL scheme of the CLI that ran (%s)', async (execPath, note) => {
    const home = mkdtempSync(join(tmpdir(), 'ps-uninstall-scheme-'));
    try {
      const result = await runUninstall({
        home,
        cwd: home,
        env: {},
        execPath,
        platform: 'darwin',
        yes: true,
        deps: {
          discoverLockDirs: async () => [],
          resolveRecentProjects: async () => [],
          detectInstallMethods: () => [],
          probeClients: async () => null,
          runRemovalDeps: {
            clearToken: async () => ({ touched: [] }),
            clearEmbeddingsKey: async () => ({ touched: [] }),
            stopServer: async () => ({ stopped: 0, failed: [] }),
          },
        },
      });
      expect(result.status).toBe('done');
      expect(result.message).toContain(note);
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });

  test('dry-run renders the plan + binary instructions, removing nothing', async () => {
    const home = mkdtempSync(join(tmpdir(), 'ps-uninst-cmd-'));
    try {
      write(join(home, '.ps', 'auth.yml'), 'x\n');
      const result = await runUninstall({
        home,
        platform: 'darwin',
        cwd: home,
        dryRun: true,
        deps: {
          discoverLockDirs: async () => [],
          detectInstallMethods: () => [
            { method: 'app', label: 'Palimpsest Desktop', instruction: 'Move to Trash' },
          ],
        },
      });
      expect(result.status).toBe('dry-run');
      expect(result.message).toContain('Would remove');
      expect(result.message).toContain('Move to Trash');
      expect(existsSync(join(home, '.ps'))).toBe(true);
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });

  test('refuses to run non-interactively without --yes', async () => {
    const home = mkdtempSync(join(tmpdir(), 'ps-uninst-cmd-'));
    try {
      const result = await runUninstall({
        home,
        platform: 'darwin',
        cwd: home,
        isTTY: false,
        deps: { discoverLockDirs: async () => [] },
      });
      expect(result.status).toBe('cancelled');
      expect(result.exitCode).toBe(1);
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });

  test('empty prompt input aborts and removes nothing', async () => {
    const home = mkdtempSync(join(tmpdir(), 'ps-uninst-cmd-'));
    try {
      write(join(home, '.ps', 'auth.yml'), 'x\n');
      const result = await runUninstall({
        home,
        platform: 'darwin',
        cwd: home,
        isTTY: true,
        confirmStream: Readable.from(['\n']),
        deps: { discoverLockDirs: async () => [] },
      });
      expect(result.status).toBe('cancelled');
      expect(existsSync(join(home, '.ps'))).toBe(true);
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });

  test('reports failed + exit 1 when an op fails (e.g. a server won’t stop)', async () => {
    const home = mkdtempSync(join(tmpdir(), 'ps-uninst-cmd-'));
    try {
      write(join(home, '.ps', 'auth.yml'), 'x\n');
      const result = await runUninstall({
        home,
        platform: 'darwin',
        cwd: home,
        yes: true,
        deps: {
          discoverLockDirs: async () => ['/some/proj/.ps/local'],
          detectInstallMethods: () => [],
          runRemovalDeps: {
            clearToken: async () => ({ touched: [] }),
            clearEmbeddingsKey: async () => ({ touched: [] }),
            stopServer: () => ({ stopped: 0, failed: [{ pid: 99, error: 'EPERM' }] }),
          },
        },
      });
      expect(result.status).toBe('failed');
      expect(result.exitCode).toBe(1);
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });

  test('--json without --yes is rejected (no interactive prompt possible)', async () => {
    const home = mkdtempSync(join(tmpdir(), 'ps-uninst-cmd-'));
    try {
      const result = await runUninstall({
        home,
        platform: 'darwin',
        cwd: home,
        json: true,
        deps: { discoverLockDirs: async () => [] },
      });
      expect(result.status).toBe('failed');
      expect(result.exitCode).toBe(1);
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });

  test('--yes success path runs the removal and reports done (creds stubbed)', async () => {
    const home = mkdtempSync(join(tmpdir(), 'ps-uninst-cmd-'));
    try {
      write(join(home, '.ps', 'auth.yml'), 'x\n');
      write(join(home, '.agents', 'skills', 'palimpsest-discovery', 'SKILL.md'), '# d\n');
      const result = await runUninstall({
        home,
        platform: 'darwin',
        cwd: home,
        yes: true,
        deps: {
          discoverLockDirs: async () => [],
          detectInstallMethods: () => [],
          runRemovalDeps: {
            clearToken: async () => ({ touched: ['file'] }),
            clearEmbeddingsKey: async () => ({ touched: [] }),
            stopServer: () => ({ stopped: 0, failed: [] }),
          },
        },
      });
      expect(result.status).toBe('done');
      expect(result.exitCode).toBe(0);
      expect(result.message).toContain('Removed');
      expect(existsSync(join(home, '.ps', 'auth.yml'))).toBe(false);
      expect(existsSync(join(home, '.agents', 'skills', 'palimpsest-discovery'))).toBe(false);
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });
});

describe('runUninstall attached-client disclosure', () => {
  test('names attached clients in the plan without adding a gate', async () => {
    const home = mkdtempSync(join(tmpdir(), 'ps-uninst-clients-'));
    try {
      write(join(home, '.ps', 'auth.yml'), 'x\n');
      const result = await runUninstall({
        home,
        platform: 'darwin',
        cwd: home,
        dryRun: true,
        deps: {
          discoverLockDirs: async () => ['/some/proj/.ps/local'],
          detectInstallMethods: () => [],
          probeClients: async () => 1,
        },
      });
      expect(result.status).toBe('dry-run');
      expect(result.exitCode).toBe(0);
      expect(result.message).toContain('1 collaboration client');
      expect(result.message).toContain('restarting will NOT recover them');
      expect(result.message).not.toContain('--force');
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });

  test('--json --dry-run carries the probe result', async () => {
    const home = mkdtempSync(join(tmpdir(), 'ps-uninst-clients-'));
    try {
      write(join(home, '.ps', 'auth.yml'), 'x\n');
      const result = await runUninstall({
        home,
        platform: 'darwin',
        cwd: home,
        dryRun: true,
        json: true,
        deps: {
          discoverLockDirs: async () => ['/some/proj/.ps/local'],
          detectInstallMethods: () => [],
          probeClients: async () => 1,
        },
      });
      const json = JSON.parse(result.message);
      expect(json.mode).toBe('dry-run');
      expect(json.attachedClients).toHaveLength(1);
      expect(json.attachedClients[0]).toContain('1 collaboration client');
      expect(json.attachedClients[0]).toContain('restarting will NOT recover them');
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });

  test('--json --dry-run reports an empty probe result when nothing is attached', async () => {
    const home = mkdtempSync(join(tmpdir(), 'ps-uninst-clients-'));
    try {
      const result = await runUninstall({
        home,
        platform: 'darwin',
        cwd: home,
        dryRun: true,
        json: true,
        deps: {
          discoverLockDirs: async () => ['/some/proj/.ps/local'],
          detectInstallMethods: () => [],
          probeClients: async () => null,
        },
      });
      expect(JSON.parse(result.message).attachedClients).toEqual([]);
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });

  test('silent when nothing is attached', async () => {
    const home = mkdtempSync(join(tmpdir(), 'ps-uninst-clients-'));
    try {
      const result = await runUninstall({
        home,
        platform: 'darwin',
        cwd: home,
        dryRun: true,
        deps: {
          discoverLockDirs: async () => ['/some/proj/.ps/local'],
          detectInstallMethods: () => [],
          probeClients: async () => null,
        },
      });
      expect(result.message).not.toContain('collaboration client');
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });
});

test.each([false, true])(
  'unreadable editor configuration reports incomplete uninstall (json=%s)',
  async (json) => {
    const home = mkdtempSync(join(tmpdir(), 'ps-uninstall-incomplete-'));
    try {
      write(join(home, '.cursor', 'mcp.json'), '{broken json');
      const result = await runUninstall({
        home,
        cwd: home,
        platform: 'darwin',
        yes: true,
        json,
        deps: {
          discoverLockDirs: async () => [],
          resolveRecentProjects: async () => [],
          detectInstallMethods: () => [],
          runRemovalDeps: {
            clearToken: async () => ({ touched: [] }),
            clearEmbeddingsKey: async () => ({ touched: [] }),
          },
        },
      });
      expect(result.status).toBe('failed');
      expect(result.exitCode).toBe(1);
      expect(result.runFeedbackAfterReport).toBeUndefined();
      if (json)
        expect(
          JSON.parse(result.message).failed.some((item: { label: string }) =>
            item.label.includes('Cursor'),
          ),
        ).toBe(true);
      else
        expect(result.message).not.toContain(
          "Palimpsest's files have been removed from this machine.",
        );
      expect(existsSync(join(home, '.cursor', 'mcp.json'))).toBe(true);
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  },
);

describe('uninstallCommand', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test('building the command never resolves the channel', () => {
    vi.stubEnv('PS_CHANNEL', 'bogus');
    const command = uninstallCommand();
    expect(command.description()).toContain('~/.ps (~/.ps-beta on Beta)');
    const kept =
      '~/.ps/machine-id, ~/.ps/skills-lock.json, ~/.ps/local/installed-skills.json, ~/.ps/local/skill-placements.json, ~/.ps/local/skill-move-retained.json, ~/.ps/local/server-authority.sqlite, ~/.ps/local/server-authority.sqlite-journal, ~/.ps/local/server-authority-leases';
    expect(command.description()).toContain(`always keeps ${kept}, shared by every channel.`);
    expect(command.options.find((o) => o.long === '--purge-content')?.description).toBe(
      `Also remove user-authored content (~/.ps/skills, shared by every channel); still keeps ${kept}`,
    );
    for (const entry of SHARED_OK_ENTRIES) {
      expect(command.description()).toContain(`~/.ps/${entry}`);
    }
  });
});
