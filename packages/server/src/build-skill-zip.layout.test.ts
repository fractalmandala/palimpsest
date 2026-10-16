import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { afterEach, describe, expect, test, vi } from 'vitest';

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  const buildOutput = fileURLToPath(new URL('../dist/', import.meta.url));
  return {
    ...actual,
    existsSync: (path: Parameters<typeof actual.existsSync>[0]) =>
      String(path).startsWith(buildOutput) || actual.existsSync(path),
  };
});

import { __testing, resolveBundledSkillDir } from './build-skill-zip.ts';
import { listPackSkillSources } from './skill-pack-sources.ts';

const { bundledSkillCandidates, missingBundleMessage } = __testing;
const PACKAGE = fileURLToPath(new URL('..', import.meta.url));
const APP_SKILLS = join(
  'Palimpsest.app',
  'Contents',
  'Resources',
  'cli',
  'dist',
  'assets',
  'skills',
);
const ROOT = join(tmpdir(), 'ps-bundled-skill-layout');
const moduleAt = (...segments: string[]) => pathToFileURL(join(ROOT, ...segments)).href;
const at = (...segments: string[]) => join(ROOT, ...segments);

describe('resolveBundledSkillDir running from source', () => {
  test('reads the package source assets even when a build output is present', () => {
    expect(resolveBundledSkillDir('project')).toBe(join(PACKAGE, '..', '..', 'skills', 'project'));
    expect(listPackSkillSources('psf')[0]?.sourceDir).toBe(
      join(PACKAGE, '..', '..', 'skills', 'packs', 'psf'),
    );
  });

  test('a bundle missing from the source stays missing even when a build output holds it', () => {
    expect(() => resolveBundledSkillDir('packs/removed-pack')).toThrow(/not found/);
    expect(listPackSkillSources('removed-pack')).toEqual([]);
  });

  test('a miss names the source assets and prescribes no build', () => {
    expect(() => resolveBundledSkillDir('no-such-bundle')).toThrow(
      join(PACKAGE, '..', '..', 'skills', 'no-such-bundle'),
    );
    expect(() => resolveBundledSkillDir('no-such-bundle')).not.toThrow(/pnpm run build/);
  });
});

describe('missingBundleMessage', () => {
  test('a miss from a build prescribes the package build', () => {
    const tried = [at('packages', 'cli', 'dist', 'assets', 'skills', 'project')];
    expect(missingBundleMessage('project', moduleAt('packages', 'cli', 'dist', 'cli.mjs'), tried)).toContain(
      'Run `pnpm run build`',
    );
    expect(
      missingBundleMessage('project', moduleAt('pkg', 'src', 'build-skill-zip.ts'), tried),
    ).not.toContain('pnpm run build');
  });
});

describe('bundledSkillCandidates', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test('a module running from source probes only the package source assets', () => {
    expect(
      bundledSkillCandidates('project', moduleAt('pkg', 'server', 'src', 'build-skill-zip.ts'), {}),
    ).toEqual([at('skills', 'project')]);
  });

  test('a query on the module URL leaves it running from source', () => {
    const url = `${moduleAt('pkg', 'server', 'src', 'build-skill-zip.ts')}?t=1`;
    expect(bundledSkillCandidates('project', url, {})).toEqual([at('skills', 'project')]);
  });

  test('the server build installed with the desktop app probes its build output first', () => {
    const server = ['app', 'node_modules', '@example', 'palimpsest-server'];
    expect(
      bundledSkillCandidates('packs/psf', moduleAt(...server, 'dist', 'index.mjs'), {}),
    ).toEqual([
      at(...server, 'dist', 'assets', 'skills', 'packs', 'psf'),
      at('app', 'node_modules', 'skills', 'packs', 'psf'),
      at(...server, 'dist', 'assets', 'skills', 'packs', 'psf'),
    ]);
  });

  test('the CLI bundle probes the assets beside it first', () => {
    expect(bundledSkillCandidates('discovery', moduleAt('packages', 'cli', 'dist', 'cli.mjs'), {})).toEqual([
      at('packages', 'cli', 'dist', 'assets', 'skills', 'discovery'),
      at('skills', 'discovery'),
      at('packages', 'cli', 'dist', 'assets', 'skills', 'discovery'),
    ]);
  });

  test('a co-installed desktop app comes first in both layouts, /Applications skipped under test', () => {
    vi.stubEnv('NODE_ENV', 'test');
    const opts = { checkDesktop: true, platform: 'darwin' as const, home: at('home') };
    const desktop = join(at('home'), 'Applications', APP_SKILLS, 'project');
    expect(
      bundledSkillCandidates('project', moduleAt('pkg', 'server', 'src', 'build-skill-zip.ts'), opts),
    ).toEqual([desktop, at('skills', 'project')]);
    expect(bundledSkillCandidates('project', moduleAt('packages', 'cli', 'dist', 'cli.mjs'), opts)).toEqual([
      desktop,
      at('packages', 'cli', 'dist', 'assets', 'skills', 'project'),
      at('skills', 'project'),
      at('packages', 'cli', 'dist', 'assets', 'skills', 'project'),
    ]);
  });
});
