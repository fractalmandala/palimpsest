import { execFileSync } from 'node:child_process';
import { chmodSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { runningAsRoot } from '../../../test-support/capabilities.test-helper.ts';
import {
  COMMIT_SUBJECT_MAX_LEN,
  composeCommitSubject,
  formatCheckpointBodyLine,
  formatCheckpointSubject,
  formatImportSubject,
  formatParkSubject,
  formatPsActor,
  formatReconcileSubject,
  formatRenameSubject,
  formatRollbackSubject,
  formatWipSubject,
  GitDirAccessError,
  getShadowRepoPath,
  getWipRefPattern,
  gitAuthorWriterId,
  MalformedGitPointerError,
  PS_GENERATOR_WRITER_ID,
  type PsActorEntry,
  parseCheckpoint,
  parseContributors,
  parsePsActor,
  parsePsActors,
  parseWriterId,
  readContributors,
  resolveGitDir,
  resolveProjectIdentity,
  resolveShadowDir,
} from './shadow-repo-layout.ts';

let tmp: string;

beforeEach(async () => {
  tmp = await mkdtemp(resolve(tmpdir(), 'ps-shadow-layout-test-'));
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

describe('parseContributors', () => {
  test('empty string → []', () => {
    expect(parseContributors('')).toEqual([]);
  });

  test('body with no contributor lines → []', () => {
    expect(parseContributors('WIP auto-save 2026-04-01T00:00:00.000Z')).toEqual([]);
  });

  test('parses a single valid contributor line', () => {
    const body = '\nps-contributors: {"id":"agent-abc","name":"Claude","docs":["articles/foo"]}';
    const result = parseContributors(body);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 'agent-abc', name: 'Claude', docs: ['articles/foo'] });
  });

  test('parses multiple contributor lines', () => {
    const body = [
      '',
      'ps-contributors: {"id":"agent-a","name":"Alice","docs":["a"]}',
      'ps-contributors: {"id":"agent-b","name":"Bob","docs":["b","c"]}',
    ].join('\n');
    const result = parseContributors(body);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('agent-a');
    expect(result[1].id).toBe('agent-b');
    expect(result[1].docs).toEqual(['b', 'c']);
  });

  test('parses versioned format (v:1)', () => {
    const body = '\nps-contributors: {"v":1,"id":"agent-x","name":"X","docs":["d"]}';
    const result = parseContributors(body);
    expect(result).toHaveLength(1);
    expect(result[0].v).toBe(1);
  });

  test('parses colorSeed field when present', () => {
    const body =
      '\nps-contributors: {"id":"agent-a","name":"A","colorSeed":"my-seed","docs":["x"]}';
    const result = parseContributors(body);
    expect(result).toHaveLength(1);
    expect(result[0]?.colorSeed).toBe('my-seed');
  });

  test('silently skips malformed JSON', () => {
    const body = '\nps-contributors: {not valid json}';
    expect(parseContributors(body)).toEqual([]);
  });

  test('skips entry missing id field', () => {
    const body = '\nps-contributors: {"name":"Claude","docs":["x"]}';
    expect(parseContributors(body)).toEqual([]);
  });

  test('skips entry missing name field', () => {
    const body = '\nps-contributors: {"id":"agent-a","docs":["x"]}';
    expect(parseContributors(body)).toEqual([]);
  });

  test('skips entry missing docs field', () => {
    const body = '\nps-contributors: {"id":"agent-a","name":"A"}';
    expect(parseContributors(body)).toEqual([]);
  });

  test('skips entry where docs is not an array (type guard)', () => {
    const body = '\nps-contributors: {"id":"agent-a","name":"A","docs":"not-an-array"}';
    expect(parseContributors(body)).toEqual([]);
  });

  test('skips entry where id is not a string (type guard)', () => {
    const body = '\nps-contributors: {"id":123,"name":"A","docs":["x"]}';
    expect(parseContributors(body)).toEqual([]);
  });

  test('skips entry where name is not a string (type guard)', () => {
    const body = '\nps-contributors: {"id":"agent-a","name":null,"docs":["x"]}';
    expect(parseContributors(body)).toEqual([]);
  });

  test('skips entry where colorSeed is not a string', () => {
    const body = '\nps-contributors: {"id":"agent-a","name":"A","colorSeed":123,"docs":["x"]}';
    expect(parseContributors(body)).toEqual([]);
  });

  test('skips entry where docs contains non-string elements', () => {
    const body = '\nps-contributors: {"id":"agent-a","name":"A","docs":["a",1,"b"]}';
    expect(parseContributors(body)).toEqual([]);
  });

  test('legacy commit (no summaries field) parses with summaries undefined', () => {
    const body = '\nps-contributors: {"id":"agent-a","name":"Claude","docs":["foo.md"]}';
    const result = parseContributors(body);
    expect(result).toHaveLength(1);
    expect(result[0]?.summaries).toBeUndefined();
  });

  test('parses summaries when present as empty array', () => {
    const body =
      '\nps-contributors: {"id":"agent-a","name":"Claude","docs":["foo.md"],"summaries":[]}';
    const result = parseContributors(body);
    expect(result).toHaveLength(1);
    expect(result[0]?.summaries).toEqual([]);
  });

  test('parses summaries when present as populated array', () => {
    const body =
      '\nps-contributors: {"id":"agent-a","name":"Claude","docs":["foo.md"],"summaries":["Fixed typo","Added example"]}';
    const result = parseContributors(body);
    expect(result).toHaveLength(1);
    expect(result[0]?.summaries).toEqual(['Fixed typo', 'Added example']);
  });

  test('D27 divergence: summaries not an array → drop field, contributor still parses', () => {
    const body =
      '\nps-contributors: {"id":"agent-a","name":"Claude","docs":["foo.md"],"summaries":"not-an-array"}';
    const result = parseContributors(body);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('agent-a');
    expect(result[0]?.name).toBe('Claude');
    expect(result[0]?.docs).toEqual(['foo.md']);
    expect(result[0]?.summaries).toBeUndefined();
  });

  test('D27 divergence: summaries contains non-string element → drop field, contributor still parses', () => {
    const body =
      '\nps-contributors: {"id":"agent-a","name":"Claude","docs":["foo.md"],"summaries":["ok",42,"also-ok"]}';
    const result = parseContributors(body);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('agent-a');
    expect(result[0]?.summaries).toBeUndefined();
  });
});

describe('parseWriterId (D34 taxonomy)', () => {
  test('agent-<id> → agent classification, isAgent true', () => {
    const p = parseWriterId('agent-claude-code-7x');
    expect(p.classification).toBe('agent');
    expect(p.isAgent).toBe(true);
    expect(p.id).toBe('agent-claude-code-7x');
  });

  test('principal-<id> → principal classification, isAgent false', () => {
    const p = parseWriterId('principal-tim');
    expect(p.classification).toBe('principal');
    expect(p.isAgent).toBe(false);
  });

  test('"file-system" → classified-file-system, isAgent null', () => {
    const p = parseWriterId('file-system');
    expect(p.classification).toBe('classified-file-system');
    expect(p.isAgent).toBe(null);
  });

  test('"git-upstream" → classified-git-upstream, isAgent null', () => {
    const p = parseWriterId('git-upstream');
    expect(p.classification).toBe('classified-git-upstream');
    expect(p.isAgent).toBe(null);
  });

  test('"palimpsest-service" → classified-palimpsest-service, isAgent null', () => {
    const p = parseWriterId('palimpsest-service');
    expect(p.classification).toBe('classified-palimpsest-service');
    expect(p.isAgent).toBe(null);
  });

  test('legacy "openknowledge-service" still reads as classified-palimpsest-service', () => {
    const p = parseWriterId('openknowledge-service');
    expect(p.classification).toBe('classified-palimpsest-service');
    expect(p.isAgent).toBe(null);
  });

  test('"git-author-<hash>" → classified-git-author, isAgent null', () => {
    const p = parseWriterId('git-author-1a2b3c4d');
    expect(p.classification).toBe('classified-git-author');
    expect(p.isAgent).toBe(null);
  });

  test('"ps-generator" → classified-ps-generator, isAgent null', () => {
    const p = parseWriterId(PS_GENERATOR_WRITER_ID);
    expect(p.classification).toBe('classified-ps-generator');
    expect(p.isAgent).toBe(null);
  });

  test('the generator writer id is classified, never "unknown"', () => {
    expect(parseWriterId(PS_GENERATOR_WRITER_ID).classification).not.toBe('unknown');
  });

  test('gitAuthorWriterId is stable per email and case/space-insensitive', () => {
    const a = gitAuthorWriterId('Ana@Example.com');
    const b = gitAuthorWriterId('  ana@example.com  ');
    expect(a).toBe(b);
    expect(a.startsWith('git-author-')).toBe(true);
    expect(parseWriterId(a).classification).toBe('classified-git-author');
    expect(gitAuthorWriterId('ben@example.com')).not.toBe(a);
  });

  test('legacy "human-<id>" → unknown (D34: human- prefix dropped)', () => {
    const p = parseWriterId('human-tim');
    expect(p.classification).toBe('unknown');
    expect(p.isAgent).toBe(null);
  });

  test('legacy "upstream" → unknown (D34: replaced by git-upstream)', () => {
    const p = parseWriterId('upstream');
    expect(p.classification).toBe('unknown');
    expect(p.isAgent).toBe(null);
  });

  test('legacy "server" → unknown (D34: replaced by palimpsest-service)', () => {
    const p = parseWriterId('server');
    expect(p.classification).toBe('unknown');
    expect(p.isAgent).toBe(null);
  });

  test('unknown prefix → unknown classification, isAgent null', () => {
    const p = parseWriterId('bot-xyz');
    expect(p.classification).toBe('unknown');
    expect(p.isAgent).toBe(null);
  });

  test('empty string → unknown', () => {
    const p = parseWriterId('');
    expect(p.classification).toBe('unknown');
    expect(p.isAgent).toBe(null);
  });

  test('agent- prefix without a suffix → unknown (regex requires non-empty suffix)', () => {
    const p = parseWriterId('agent-');
    expect(p.classification).toBe('unknown');
    expect(p.isAgent).toBe(null);
  });

  test('slash in id → unknown (would be a malformed ref)', () => {
    const p = parseWriterId('agent-abc/def');
    expect(p.classification).toBe('unknown');
    expect(p.isAgent).toBe(null);
  });
});

describe('getWipRefPattern', () => {
  test('main branch', () => {
    expect(getWipRefPattern('main')).toBe('refs/wip/main/');
  });
  test('branch with slash', () => {
    expect(getWipRefPattern('feat/exec-mcp')).toBe('refs/wip/feat/exec-mcp/');
  });
});

describe('resolveGitDir', () => {
  test('returns .git path when .git is a directory', () => {
    const project = resolve(tmp, 'project');
    mkdirSync(resolve(project, '.git'), { recursive: true });
    expect(resolveGitDir(project)).toBe(resolve(project, '.git'));
  });

  test('resolves worktree pointer when .git is a file with valid gitdir:', () => {
    const project = resolve(tmp, 'worktree');
    const realGitDir = resolve(tmp, 'real-git');
    mkdirSync(project, { recursive: true });
    mkdirSync(realGitDir, { recursive: true });
    writeFileSync(resolve(project, '.git'), `gitdir: ${realGitDir}\n`);
    expect(resolveGitDir(project)).toBe(realGitDir);
  });

  test('returns null when .git is absent', () => {
    const project = resolve(tmp, 'no-git');
    mkdirSync(project, { recursive: true });
    expect(resolveGitDir(project)).toBeNull();
  });

  test('returns null when .git is a file without gitdir: prefix', () => {
    const project = resolve(tmp, 'malformed');
    mkdirSync(project, { recursive: true });
    writeFileSync(resolve(project, '.git'), 'not a gitdir pointer\n');
    expect(resolveGitDir(project)).toBeNull();
  });

  test('resolves a relative gitdir: pointer against the project root', () => {
    const project = resolve(tmp, 'relative-wt');
    const realGitDir = resolve(tmp, 'real-git-relative');
    mkdirSync(project, { recursive: true });
    mkdirSync(realGitDir, { recursive: true });
    writeFileSync(resolve(project, '.git'), 'gitdir: ../real-git-relative\n');
    expect(resolveGitDir(project)).toBe(realGitDir);
  });

  test('subfolder of repo: resolves ancestor .git directory', () => {
    const repo = resolve(tmp, 'repo');
    const sub = resolve(repo, 'docs');
    mkdirSync(resolve(repo, '.git'), { recursive: true });
    mkdirSync(sub, { recursive: true });
    expect(resolveGitDir(sub)).toBe(resolve(repo, '.git'));
  });
});

describe('resolveShadowDir', () => {
  test('main worktree: returns <projectRoot>/.git/ps', () => {
    const project = resolve(tmp, 'project');
    mkdirSync(resolve(project, '.git'), { recursive: true });
    expect(resolveShadowDir(project)).toBe(resolve(project, '.git/ps'));
  });

  test('linked worktree: appends ok to the resolved gitdir', () => {
    const project = resolve(tmp, 'wt');
    const adminDir = resolve(tmp, 'real-git/worktrees/wt');
    mkdirSync(project, { recursive: true });
    mkdirSync(adminDir, { recursive: true });
    writeFileSync(resolve(project, '.git'), `gitdir: ${adminDir}\n`);
    expect(resolveShadowDir(project)).toBe(resolve(adminDir, 'ps'));
  });

  test('throws MalformedGitPointerError when pointer references a missing admin dir', () => {
    const project = resolve(tmp, 'stale');
    mkdirSync(project, { recursive: true });
    const missingTarget = resolve(tmp, 'gone-admin');
    writeFileSync(resolve(project, '.git'), `gitdir: ${missingTarget}\n`);
    let caught: unknown;
    try {
      resolveShadowDir(project);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(MalformedGitPointerError);
    const e = caught as MalformedGitPointerError;
    expect(e.gitPointerPath).toBe(resolve(project, '.git'));
    expect(e.resolvedTarget).toBe(missingTarget);
    expect(e.message).toContain(missingTarget);
    expect(e.message).toContain('git worktree prune');
  });

  test('subfolder with stale pointer-file .git at ancestor: MalformedGitPointerError references ancestor .git path', () => {
    const repo = resolve(tmp, 'stale-ancestor-repo');
    const sub = resolve(repo, 'docs');
    mkdirSync(repo, { recursive: true });
    mkdirSync(sub, { recursive: true });
    const missingTarget = resolve(tmp, 'gone-admin');
    writeFileSync(resolve(repo, '.git'), `gitdir: ${missingTarget}\n`);
    let caught: unknown;
    try {
      resolveShadowDir(sub);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(MalformedGitPointerError);
    const e = caught as MalformedGitPointerError;
    expect(e.gitPointerPath).toBe(resolve(repo, '.git'));
    expect(e.resolvedTarget).toBe(missingTarget);
  });

  test('throws MalformedGitPointerError when .git is a file without a valid gitdir: line', () => {
    const project = resolve(tmp, 'garbage-pointer');
    mkdirSync(project, { recursive: true });
    writeFileSync(resolve(project, '.git'), 'not a gitdir pointer\n');
    let caught: unknown;
    try {
      resolveShadowDir(project);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(MalformedGitPointerError);
    const e = caught as MalformedGitPointerError;
    expect(e.gitPointerPath).toBe(resolve(project, '.git'));
    expect(e.resolvedTarget).toBe('');
    expect(e.message).toContain('git worktree prune');
  });

  test('threads the underlying readFileSync error as `cause` when the .git pointer is unreadable', (ctx) => {
    ctx.skip(runningAsRoot, 'root bypasses the chmod refusal this test induces');
    const project = resolve(tmp, 'unreadable');
    mkdirSync(project, { recursive: true });
    const gitPath = resolve(project, '.git');
    writeFileSync(gitPath, 'gitdir: /tmp/whatever\n');
    chmodSync(gitPath, 0o000);
    let stillReadable = false;
    try {
      readFileSync(gitPath, 'utf-8');
      stillReadable = true;
    } catch {}
    if (stillReadable) {
      chmodSync(gitPath, 0o644);
      return;
    }
    let caught: unknown;
    try {
      resolveShadowDir(project);
    } catch (err) {
      caught = err;
    } finally {
      chmodSync(gitPath, 0o644);
    }
    expect(caught).toBeInstanceOf(MalformedGitPointerError);
    const e = caught as MalformedGitPointerError & { cause?: unknown };
    expect(e.cause).toBeDefined();
    const causeCode = (e.cause as NodeJS.ErrnoException | undefined)?.code;
    expect(['EACCES', 'EPERM']).toContain(causeCode);
  });

  test('throws GitDirAccessError (not MalformedGitPointerError) when statSync fails with non-ENOENT', (ctx) => {
    ctx.skip(runningAsRoot, 'root bypasses the chmod refusal this test induces');
    const project = resolve(tmp, 'unstattable');
    mkdirSync(project, { recursive: true });
    writeFileSync(resolve(project, '.git'), 'gitdir: /tmp/whatever\n');
    chmodSync(project, 0o000);
    let stillStattable = false;
    try {
      readFileSync(resolve(project, '.git'), 'utf-8');
      stillStattable = true;
    } catch {}
    if (stillStattable) {
      chmodSync(project, 0o755);
      return;
    }
    let caught: unknown;
    try {
      resolveShadowDir(project);
    } catch (err) {
      caught = err;
    } finally {
      chmodSync(project, 0o755);
    }
    expect(caught).toBeInstanceOf(GitDirAccessError);
    expect(caught).not.toBeInstanceOf(MalformedGitPointerError);
    const e = caught as GitDirAccessError & { cause?: unknown };
    expect(e.gitPath).toBe(resolve(project, '.git'));
    expect(e.cause).toBeDefined();
    const causeCode = (e.cause as NodeJS.ErrnoException | undefined)?.code;
    expect(['EACCES', 'EPERM']).toContain(causeCode);
    expect(e.message).toContain('Check filesystem permissions');
    expect(e.message).not.toContain('git worktree prune');
    expect(e.message).toContain(`(${causeCode})`);
  });

  test('falls back to <projectRoot>/.git/ps when .git is truly absent', () => {
    const project = resolve(tmp, 'no-git');
    mkdirSync(project, { recursive: true });
    expect(resolveShadowDir(project)).toBe(resolve(project, '.git/ps'));
  });

  test('does not throw on a healthy .git file pointing at an existing populated admin dir', () => {
    const project = resolve(tmp, 'healthy-wt');
    const adminDir = resolve(tmp, 'real-git/worktrees/healthy-wt');
    mkdirSync(project, { recursive: true });
    mkdirSync(adminDir, { recursive: true });
    writeFileSync(resolve(adminDir, 'HEAD'), 'ref: refs/heads/main\n');
    writeFileSync(resolve(project, '.git'), `gitdir: ${adminDir}\n`);
    expect(() => resolveShadowDir(project)).not.toThrow();
  });

  test('subfolder of repo with directory .git at ancestor: shadow lives under ancestor with ps-<slug>', () => {
    const repo = resolve(tmp, 'repo');
    const sub = resolve(repo, 'docs');
    mkdirSync(resolve(repo, '.git'), { recursive: true });
    mkdirSync(sub, { recursive: true });
    expect(resolveShadowDir(sub)).toBe(resolve(repo, '.git/ps-docs'));
  });

  test('subfolder of repo with pointer-file .git at ancestor: shadow lives under linked admin dir with ps-<slug>', () => {
    const repo = resolve(tmp, 'wt-repo');
    const sub = resolve(repo, 'docs');
    const adminDir = resolve(tmp, 'real-git/worktrees/wt-repo');
    mkdirSync(repo, { recursive: true });
    mkdirSync(sub, { recursive: true });
    mkdirSync(adminDir, { recursive: true });
    writeFileSync(resolve(adminDir, 'HEAD'), 'ref: refs/heads/main\n');
    writeFileSync(resolve(repo, '.git'), `gitdir: ${adminDir}\n`);
    expect(resolveShadowDir(sub)).toBe(resolve(adminDir, 'ps-docs'));
  });

  test('subfolder that already has its own .git wins over ancestor walk-up (precedence)', () => {
    const repo = resolve(tmp, 'repo');
    const sub = resolve(repo, 'docs');
    mkdirSync(resolve(repo, '.git'), { recursive: true });
    mkdirSync(resolve(sub, '.git'), { recursive: true });
    expect(resolveShadowDir(sub)).toBe(resolve(sub, '.git/ps'));
  });

  test('deeply nested subfolder: slug derives from path from ancestor down', () => {
    const repo = resolve(tmp, 'repo');
    const sub = resolve(repo, 'packages/app');
    mkdirSync(resolve(repo, '.git'), { recursive: true });
    mkdirSync(sub, { recursive: true });
    expect(resolveShadowDir(sub)).toBe(resolve(repo, '.git/ps-packages-app'));
  });

  test('two subfolders of the same repo get distinct shadow dirs (no ref collision)', () => {
    const repo = resolve(tmp, 'repo');
    const subA = resolve(repo, 'sub-a');
    const subB = resolve(repo, 'sub-b');
    mkdirSync(resolve(repo, '.git'), { recursive: true });
    mkdirSync(subA, { recursive: true });
    mkdirSync(subB, { recursive: true });
    expect(resolveShadowDir(subA)).not.toBe(resolveShadowDir(subB));
    expect(resolveShadowDir(subA)).toBe(resolve(repo, '.git/ps-sub-a'));
    expect(resolveShadowDir(subB)).toBe(resolve(repo, '.git/ps-sub-b'));
  });

  test('long sub-paths trigger slug truncation and two paths with same long prefix get distinct shadows', () => {
    const repo = resolve(tmp, 'repo');
    const longPrefix = 'packages/very-long-package-name-that-exceeds-sixty-four-characters';
    const subA = resolve(repo, `${longPrefix}-alpha`);
    const subB = resolve(repo, `${longPrefix}-beta`);
    mkdirSync(resolve(repo, '.git'), { recursive: true });
    mkdirSync(subA, { recursive: true });
    mkdirSync(subB, { recursive: true });
    const shadowA = resolveShadowDir(subA);
    const shadowB = resolveShadowDir(subB);
    expect(shadowA).not.toBe(shadowB);
    expect(shadowA.startsWith(resolve(repo, '.git/ps-'))).toBe(true);
    expect(shadowB.startsWith(resolve(repo, '.git/ps-'))).toBe(true);
    const slugA = shadowA.slice(resolve(repo, '.git/ps-').length);
    const slugB = shadowB.slice(resolve(repo, '.git/ps-').length);
    expect(slugA.length).toBeLessThanOrEqual(64);
    expect(slugB.length).toBeLessThanOrEqual(64);
  });

  test('walk-up still legacy-fallthroughs when no ancestor .git is found within bound', () => {
    const project = resolve(tmp, 'orphan/deep/nest');
    mkdirSync(project, { recursive: true });
    expect(resolveShadowDir(project)).toBe(resolve(project, '.git/ps'));
  });
});
describe('resolveShadowDir sub-path keys are injective', () => {
  function legacyShadowName(rel: string): string {
    const flat = rel.split('/').join('-');
    return `ps-${flat.replace(/[^A-Za-z0-9._-]/g, '_').replace(/^\.+/, '_')}`;
  }

  function fakeShadow(dir: string, worktree: string): void {
    mkdirSync(dir, { recursive: true });
    writeFileSync(resolve(dir, 'HEAD'), 'ref: refs/heads/main\n');
    writeFileSync(
      resolve(dir, 'config'),
      `[core]\n\trepositoryformatversion = 0\n\tworktree = ${worktree}\n[user]\n\tname = palimpsest\n`,
    );
  }

  function makeRepo(...subs: string[]): string {
    const repo = resolve(tmp, 'repo');
    mkdirSync(resolve(repo, '.git'), { recursive: true });
    for (const sub of subs) mkdirSync(resolve(repo, sub), { recursive: true });
    return repo;
  }

  test('subfolders whose names differ only in non-Latin letters get distinct shadow dirs', () => {
    const repo = makeRepo('ノート', '日記帳');
    const a = resolveShadowDir(resolve(repo, 'ノート'));
    const b = resolveShadowDir(resolve(repo, '日記帳'));
    expect(a).not.toBe(b);
    for (const dir of [a, b]) {
      expect(dirname(dir)).toBe(resolve(repo, '.git'));
      expect(basename(dir)).toMatch(/^ps-[A-Za-z0-9._-]{1,64}$/);
    }
  });

  test('names that differ only in punctuation or spaces get distinct shadow dirs', () => {
    const repo = makeRepo('My Notes', 'My_Notes', 'My#Notes');
    const dirs = ['My Notes', 'My_Notes', 'My#Notes'].map((s) =>
      resolveShadowDir(resolve(repo, s)),
    );
    expect(new Set(dirs).size).toBe(3);
  });

  test('ASCII-safe sub-paths keep the exact key they had before', () => {
    const repo = makeRepo('my-notes_v2.0', 'public/palimpsest');
    expect(resolveShadowDir(resolve(repo, 'my-notes_v2.0'))).toBe(
      resolve(repo, '.git/ps-my-notes_v2.0'),
    );
    expect(resolveShadowDir(resolve(repo, 'public/palimpsest'))).toBe(
      resolve(repo, '.git/ps-public-palimpsest'),
    );
  });

  test('a lossy shadow dir created by an earlier version stays with the project that owns it', () => {
    const repo = makeRepo('ノート', '日記帳');
    const legacy = resolve(repo, '.git', legacyShadowName('ノート'));
    expect(legacy).toBe(resolve(repo, '.git', legacyShadowName('日記帳')));
    fakeShadow(legacy, resolve(repo, 'ノート'));
    expect(resolveShadowDir(resolve(repo, 'ノート'))).toBe(legacy);
    expect(getShadowRepoPath(resolve(repo, 'ノート'))).toBe(legacy);
    expect(resolveShadowDir(resolve(repo, '日記帳'))).not.toBe(legacy);
  });

  test('legacy ownership survives the repository moving to another path', () => {
    const repo = makeRepo('ノート');
    const legacy = resolve(repo, '.git', legacyShadowName('ノート'));
    fakeShadow(legacy, resolve(tmp, 'old-location', 'repo', 'ノート'));
    expect(resolveShadowDir(resolve(repo, 'ノート'))).toBe(legacy);
  });

  test('legacy ownership reads a core.worktree value that git itself wrote', () => {
    const sub = 'メモ #1; a b';
    const repo = makeRepo(sub, 'メモ');
    const legacy = resolve(repo, '.git', legacyShadowName(sub));
    execFileSync('git', ['init', '--bare', '--quiet', legacy]);
    execFileSync('git', ['config', 'core.worktree', resolve(repo, sub)], {
      env: { ...process.env, GIT_DIR: legacy },
    });
    expect(resolveShadowDir(resolve(repo, sub))).toBe(legacy);
    expect(resolveShadowDir(resolve(repo, 'メモ'))).not.toBe(legacy);
  });

  test('a lossy legacy dir with no recorded owner is kept rather than abandoned', () => {
    const repo = makeRepo('ノート');
    const legacy = resolve(repo, '.git', legacyShadowName('ノート'));
    mkdirSync(legacy, { recursive: true });
    writeFileSync(resolve(legacy, 'HEAD'), 'ref: refs/heads/main\n');
    writeFileSync(resolve(legacy, 'config'), '[core]\n\trepositoryformatversion = 0\n');
    expect(resolveShadowDir(resolve(repo, 'ノート'))).toBe(legacy);
  });

  test('an unreadable legacy config keeps the legacy dir rather than moving to a new one', () => {
    const repo = makeRepo('ノート');
    const legacy = resolve(repo, '.git', legacyShadowName('ノート'));
    mkdirSync(resolve(legacy, 'config'), { recursive: true });
    expect(resolveShadowDir(resolve(repo, 'ノート'))).toBe(legacy);
  });

  test('a separator and a hyphen no longer share a dir once the hyphenated one owns it', () => {
    const repo = makeRepo('a-b', 'a/b');
    const shared = resolve(repo, '.git/ps-a-b');
    fakeShadow(shared, resolve(repo, 'a-b'));
    expect(resolveShadowDir(resolve(repo, 'a-b'))).toBe(shared);
    const nested = resolveShadowDir(resolve(repo, 'a/b'));
    expect(nested).not.toBe(shared);
    expect(basename(nested)).toMatch(/^ps-[A-Za-z0-9._-]{1,64}$/);
  });

  test('a project that moved off a foreign-owned dir keeps its own dir after the owner leaves', () => {
    const repo = makeRepo('a-b', 'a/b');
    const shared = resolve(repo, '.git/ps-a-b');
    fakeShadow(shared, resolve(repo, 'a-b'));
    const own = resolveShadowDir(resolve(repo, 'a/b'));
    fakeShadow(own, resolve(repo, 'a/b'));
    rmSync(shared, { recursive: true, force: true });
    expect(resolveShadowDir(resolve(repo, 'a/b'))).toBe(own);
  });

  test('NFC and NFD spellings of one name resolve to the same shadow dir', () => {
    const repo = makeRepo('café');
    const nfc = resolveShadowDir(resolve(repo, 'café'.normalize('NFC')));
    const nfd = resolveShadowDir(resolve(repo, 'café'.normalize('NFD')));
    expect(nfd).toBe(nfc);
  });
});

describe('getShadowRepoPath', () => {
  test('returns null when no shadow repo exists', () => {
    expect(getShadowRepoPath(tmp)).toBe(null);
  });

  test('always resolves to <projectRoot>/.git/ps/', () => {
    const project = resolve(tmp, 'project');
    mkdirSync(resolve(project, '.git/ps'), { recursive: true });
    writeFileSync(resolve(project, '.git/ps/HEAD'), 'ref: refs/heads/main\n');
    expect(getShadowRepoPath(project)).toBe(resolve(project, '.git/ps'));
  });

  test('never returns legacy .git/palimpsest/ path (single-mode layout)', () => {
    const project = resolve(tmp, 'project');
    mkdirSync(resolve(project, '.git/palimpsest'), { recursive: true });
    writeFileSync(resolve(project, '.git/palimpsest/HEAD'), 'ref: refs/heads/main\n');
    expect(getShadowRepoPath(project)).toBe(null);
  });

  test('never returns .palimpsest/ (standalone path deleted)', () => {
    const project = resolve(tmp, 'project');
    mkdirSync(resolve(project, '.palimpsest'), { recursive: true });
    writeFileSync(resolve(project, '.palimpsest/HEAD'), 'ref: refs/heads/main\n');
    expect(getShadowRepoPath(project)).toBe(null);
  });

  test('returns null when .git/ps exists but HEAD is missing', () => {
    const project = resolve(tmp, 'project');
    mkdirSync(resolve(project, '.git/ps'), { recursive: true });
    expect(getShadowRepoPath(project)).toBe(null);
  });

  test('returns null on stale .git pointer instead of throwing — preserves string|null contract', () => {
    const project = resolve(tmp, 'stale-probe');
    mkdirSync(project, { recursive: true });
    writeFileSync(resolve(project, '.git'), `gitdir: ${resolve(tmp, 'gone')}\n`);
    expect(() => resolveShadowDir(project)).toThrow(MalformedGitPointerError);
    expect(getShadowRepoPath(project)).toBe(null);
  });

  test('returns null when .git is a file with malformed pointer text — preserves string|null contract', () => {
    const project = resolve(tmp, 'garbage-probe');
    mkdirSync(project, { recursive: true });
    writeFileSync(resolve(project, '.git'), 'not a gitdir pointer\n');
    expect(() => resolveShadowDir(project)).toThrow(MalformedGitPointerError);
    expect(getShadowRepoPath(project)).toBe(null);
  });

  test('swallows GitDirAccessError, returns null — preserves string|null contract on EACCES', (ctx) => {
    ctx.skip(runningAsRoot, 'root bypasses the chmod refusal this test induces');
    const project = resolve(tmp, 'eaccess-probe');
    mkdirSync(project, { recursive: true });
    writeFileSync(resolve(project, '.git'), 'gitdir: /tmp/whatever\n');
    chmodSync(project, 0o000);
    let stillStattable = false;
    try {
      readFileSync(resolve(project, '.git'), 'utf-8');
      stillStattable = true;
    } catch {}
    if (stillStattable) {
      chmodSync(project, 0o755);
      return;
    }
    try {
      expect(() => resolveShadowDir(project)).toThrow(GitDirAccessError);
      expect(getShadowRepoPath(project)).toBe(null);
    } finally {
      chmodSync(project, 0o755);
    }
  });
});

describe('GitDirAccessError', () => {
  test('extends Error with named class and gitPath field', () => {
    const cause = new Error('boom') as NodeJS.ErrnoException;
    cause.code = 'EACCES';
    const err = new GitDirAccessError('/tmp/proj/.git', { cause });
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(GitDirAccessError);
    expect(err.name).toBe('GitDirAccessError');
    expect(err.gitPath).toBe('/tmp/proj/.git');
    expect((err as { cause?: unknown }).cause).toBe(cause);
  });

  test('message includes errno code from cause when available', () => {
    const cause = new Error('boom') as NodeJS.ErrnoException;
    cause.code = 'EACCES';
    const err = new GitDirAccessError('/tmp/proj/.git', { cause });
    expect(err.message).toContain('/tmp/proj/.git');
    expect(err.message).toContain('(EACCES)');
    expect(err.message).toContain('Check filesystem permissions');
  });

  test('message omits the errno parenthetical when cause has no code field', () => {
    const err = new GitDirAccessError('/tmp/proj/.git', { cause: new Error('unknown') });
    expect(err.message).not.toContain('(undefined)');
    expect(err.message).not.toContain('()');
    expect(err.message).toContain('Check filesystem permissions');
  });

  test('constructs cleanly when cause is undefined entirely', () => {
    const err = new GitDirAccessError('/tmp/proj/.git');
    expect(err.message).toContain('/tmp/proj/.git');
    expect(err.message).not.toContain('(undefined)');
    expect((err as { cause?: unknown }).cause).toBeUndefined();
  });
});

describe('parseCheckpoint / formatCheckpointBodyLine (bridge-correctness SPEC §6 R7d)', () => {
  test('round-trips bridge-merge-loss with enriched docName + size', () => {
    const line = formatCheckpointBodyLine({
      kind: 'bridge-merge-loss',
      docName: 'notes/foo.md',
      size: 1234,
      metadata: { lostSubstrings: ['a', 'b', 'c'] },
    });
    const body = `checkpoint: X\n\n${line}`;
    const parsed = parseCheckpoint(body);
    expect(parsed?.kind).toBe('bridge-merge-loss');
    if (parsed?.kind === 'bridge-merge-loss') {
      expect(parsed.metadata.lostSubstrings).toEqual(['a', 'b', 'c']);
      expect(parsed.docName).toBe('notes/foo.md');
      expect(parsed.size).toBe(1234);
    }
  });

  test('round-trips external-change-rescue with enriched docName + size', () => {
    const line = formatCheckpointBodyLine({
      kind: 'external-change-rescue',
      docName: 'root.md',
      size: 42,
      metadata: { incomingDiskSha: 'deadbeef' },
    });
    const body = `checkpoint: Y\n\n${line}`;
    const parsed = parseCheckpoint(body);
    expect(parsed?.kind).toBe('external-change-rescue');
    if (parsed?.kind === 'external-change-rescue') {
      expect(parsed.metadata.incomingDiskSha).toBe('deadbeef');
      expect(parsed.docName).toBe('root.md');
      expect(parsed.size).toBe(42);
    }
  });

  test('round-trips producer-guard-loss with its construct locator', () => {
    const line = formatCheckpointBodyLine({
      kind: 'producer-guard-loss',
      docName: 'notes/table.md',
      size: 128,
      metadata: { construct: 'jsxComponent,tableCell' },
    });
    const body = `checkpoint: Before producer-guard content-loss\n\n${line}`;
    const parsed = parseCheckpoint(body);
    expect(parsed?.kind).toBe('producer-guard-loss');
    if (parsed?.kind === 'producer-guard-loss') {
      expect(parsed.metadata.construct).toBe('jsxComponent,tableCell');
      expect(parsed.docName).toBe('notes/table.md');
      expect(parsed.size).toBe(128);
    }
  });

  test('producer-guard-loss with a non-string construct is rejected (unknown-shape fallback)', () => {
    const body =
      'checkpoint: X\n\nps-checkpoint-v1: {"kind":"producer-guard-loss","metadata":{"construct":5}}';
    expect(parseCheckpoint(body)).toBe(null);
  });

  test('backward-compat: pre-enrichment body without docName/size returns nulls', () => {
    const legacyLine =
      'ps-checkpoint-v1: {"kind":"external-change-rescue","metadata":{"incomingDiskSha":"abc"}}';
    const body = `checkpoint: Legacy\n\n${legacyLine}`;
    const parsed = parseCheckpoint(body);
    expect(parsed?.kind).toBe('external-change-rescue');
    if (parsed?.kind === 'external-change-rescue') {
      expect(parsed.docName).toBe(null);
      expect(parsed.size).toBe(null);
    }
  });

  test('returns null for empty body', () => {
    expect(parseCheckpoint('')).toBe(null);
  });

  test('returns null for body without the ps-checkpoint-v1 prefix', () => {
    expect(parseCheckpoint('checkpoint: Save Version\n\nok-contributors: {...}')).toBe(null);
  });

  test('returns null for malformed JSON', () => {
    expect(parseCheckpoint('\nps-checkpoint-v1: {not json')).toBe(null);
  });

  test('returns null for unknown kind', () => {
    expect(parseCheckpoint('\nps-checkpoint-v1: {"kind":"something-else","metadata":{}}')).toBe(
      null,
    );
  });

  test('returns null when metadata shape does not match kind', () => {
    expect(
      parseCheckpoint('\nps-checkpoint-v1: {"kind":"bridge-merge-loss","metadata":{"other":"x"}}'),
    ).toBe(null);
  });

  test('parseContributors tolerates sibling ps-checkpoint-v1 lines (Q7)', () => {
    const body = [
      'checkpoint: some label',
      '',
      'ps-contributors: {"id":"human-a","name":"Alice","docs":["a.md"]}',
      'ps-checkpoint-v1: {"kind":"bridge-merge-loss","docName":"x.md","size":10,"metadata":{"lostSubstrings":["x"]}}',
      'ps-contributors: {"id":"human-b","name":"Bob","docs":["b.md"]}',
    ].join('\n');

    const contributors = parseContributors(body);
    expect(contributors.map((c) => c.id)).toEqual(['human-a', 'human-b']);

    const checkpoint = parseCheckpoint(body);
    expect(checkpoint?.kind).toBe('bridge-merge-loss');
  });

  test('round-trips auto-consolidation with foldedRefs + trigger', () => {
    const line = formatCheckpointBodyLine({
      kind: 'auto-consolidation',
      docName: null,
      size: null,
      metadata: { foldedRefs: 7, trigger: 'dead-chain' },
    });
    const body = `checkpoint: Consolidated 7 inactive sessions\n\n${line}`;
    const parsed = parseCheckpoint(body);
    expect(parsed?.kind).toBe('auto-consolidation');
    if (parsed?.kind === 'auto-consolidation') {
      expect(parsed.metadata.foldedRefs).toBe(7);
      expect(parsed.metadata.trigger).toBe('dead-chain');
    }
  });

  test('auto-consolidation: malformed metadata returns null (foldedRefs/trigger required)', () => {
    expect(
      parseCheckpoint(
        '\nps-checkpoint-v1: {"kind":"auto-consolidation","metadata":{"foldedRefs":3}}',
      ),
    ).toBe(null);
    expect(
      parseCheckpoint(
        '\nps-checkpoint-v1: {"kind":"auto-consolidation","metadata":{"trigger":"boot"}}',
      ),
    ).toBe(null);
  });

  test('auto-consolidation: trigger parses as a bare string (forward-compat with new triggers)', () => {
    const parsed = parseCheckpoint(
      '\nps-checkpoint-v1: {"kind":"auto-consolidation","metadata":{"foldedRefs":1,"trigger":"some-future-trigger"}}',
    );
    expect(parsed?.kind).toBe('auto-consolidation');
    if (parsed?.kind === 'auto-consolidation') {
      expect(parsed.metadata.trigger).toBe('some-future-trigger');
    }
  });

  test('D22: a reader lacking the auto-consolidation branch treats it as untyped (null)', () => {
    const line = formatCheckpointBodyLine({
      kind: 'auto-consolidation',
      docName: null,
      size: null,
      metadata: { foldedRefs: 2, trigger: 'boot' },
    });
    expect(line.startsWith('ps-checkpoint-v1: ')).toBe(true);
    expect(JSON.parse(line.slice('ps-checkpoint-v1: '.length)).kind).toBe('auto-consolidation');
  });
});

describe('formatWipSubject', () => {
  test('empty docs → wip: auto-save', () => {
    expect(formatWipSubject([])).toBe('wip: auto-save');
  });

  test('one doc → wip: <docName>', () => {
    expect(formatWipSubject(['notes/ideas.md'])).toBe('wip: notes/ideas.md');
  });

  test('two docs → wip: 2 docs', () => {
    expect(formatWipSubject(['a.md', 'b.md'])).toBe('wip: 2 docs');
  });

  test('five docs → wip: 5 docs', () => {
    const docs = ['a.md', 'b.md', 'c.md', 'd.md', 'e.md'];
    expect(formatWipSubject(docs)).toBe('wip: 5 docs');
  });
});

describe('parsePsActor / formatPsActor (US-015, FR-8, D13)', () => {
  const baseEntry: PsActorEntry = {
    v: 1,
    writer_id: 'agent-conn-abc123',
    principal: null,
    agent_session: 'conn-abc123',
    agent_type: 'claude-3-5-sonnet',
    client_name: 'claude-code',
    client_version: '1.0.0',
    label: 'My agent',
    display_name: 'Claude (abc1)',
    color_seed: 'conn-abc123',
    docs: ['notes.md', 'ideas.md'],
  };

  test('round-trips a full PsActorEntry', () => {
    const line = formatPsActor(baseEntry);
    const body = `wip: notes.md\n\n${line}`;
    const parsed = parsePsActor(body);
    expect(parsed).not.toBeNull();
    expect(parsed?.v).toBe(1);
    expect(parsed?.agent_session).toBe('conn-abc123');
    expect(parsed?.agent_type).toBe('claude-3-5-sonnet');
    expect(parsed?.client_name).toBe('claude-code');
    expect(parsed?.display_name).toBe('Claude (abc1)');
    expect(parsed?.color_seed).toBe('conn-abc123');
    expect(parsed?.docs).toEqual(['notes.md', 'ideas.md']);
    expect(parsed?.principal).toBeNull();
    expect(parsed?.label).toBe('My agent');
  });

  test('round-trips an entry with all nullable fields null', () => {
    const sparse: PsActorEntry = {
      v: 1,
      writer_id: 'openknowledge-service',
      principal: null,
      agent_session: null,
      agent_type: null,
      client_name: null,
      client_version: null,
      label: null,
      display_name: 'Palimpsest (service)',
      color_seed: 'openknowledge-service',
      docs: [],
    };
    const line = formatPsActor(sparse);
    const parsed = parsePsActor(`wip: auto-save\n\n${line}`);
    expect(parsed).not.toBeNull();
    expect(parsed?.writer_id).toBe('openknowledge-service');
    expect(parsed?.agent_session).toBeNull();
    expect(parsed?.docs).toEqual([]);
  });

  test('returns null for empty body', () => {
    expect(parsePsActor('')).toBeNull();
  });

  test('returns null when ps-actor: line is absent', () => {
    expect(parsePsActor('wip: auto-save\n\nok-contributors: {...}')).toBeNull();
  });

  test('returns null for malformed JSON', () => {
    expect(parsePsActor('ps-actor: {not json')).toBeNull();
  });

  test('rejects v:0 (schema version must be 1)', () => {
    const line = 'ps-actor: {"v":0,"display_name":"X","docs":[]}';
    expect(parsePsActor(line)).toBeNull();
  });

  test('rejects missing display_name', () => {
    const line = 'ps-actor: {"v":1,"docs":[]}';
    expect(parsePsActor(line)).toBeNull();
  });

  test('rejects missing docs array', () => {
    const line = 'ps-actor: {"v":1,"display_name":"X"}';
    expect(parsePsActor(line)).toBeNull();
  });

  test('tolerates sibling ps-contributors: and ps-checkpoint-v1: lines (coexistence)', () => {
    const actorLine = formatPsActor(baseEntry);
    const body = [
      'wip: notes.md',
      '',
      'ps-contributors: {"v":1,"id":"agent-abc","name":"Claude","docs":["notes.md"]}',
      actorLine,
    ].join('\n');
    const parsed = parsePsActor(body);
    expect(parsed?.display_name).toBe('Claude (abc1)');
    const contributors = parseContributors(body);
    expect(contributors).toHaveLength(1);
    expect(contributors[0]?.id).toBe('agent-abc');
  });

  test('color_seed defaults to "unknown" when missing in stored JSON', () => {
    const line = 'ps-actor: {"v":1,"display_name":"X","docs":[]}';
    const parsed = parsePsActor(line);
    expect(parsed?.color_seed).toBe('unknown');
  });
});

describe('PsActorEntry writer_id field + derivation back-compat', () => {
  test('formatPsActor emits writer_id inline', () => {
    const entry: PsActorEntry = {
      v: 1,
      writer_id: 'agent-abc123',
      principal: null,
      agent_session: 'abc123',
      agent_type: 'claude',
      client_name: 'claude-code',
      client_version: null,
      label: null,
      display_name: 'Claude (abc1)',
      color_seed: 'claude-code',
      docs: ['a.md'],
    };
    const line = formatPsActor(entry);
    expect(line).toContain('"writer_id":"agent-abc123"');
  });

  test('parsePsActor derives writer_id from agent_session when missing (pre-consolidation commit back-compat)', () => {
    const line =
      'ps-actor: {"v":1,"principal":null,"agent_session":"old-conn","display_name":"Claude","docs":[]}';
    const parsed = parsePsActor(line);
    expect(parsed?.writer_id).toBe('agent-old-conn');
  });

  test('parsePsActor derives writer_id from principal when agent_session is null', () => {
    const line =
      'ps-actor: {"v":1,"principal":"principal-alice-uuid","agent_session":null,"display_name":"Alice","docs":[]}';
    const parsed = parsePsActor(line);
    expect(parsed?.writer_id).toBe('principal-alice-uuid');
  });

  test('parsePsActor derives writer_id from display_name for classified writers (file-system)', () => {
    const line = 'ps-actor: {"v":1,"display_name":"File System","docs":[]}';
    const parsed = parsePsActor(line);
    expect(parsed?.writer_id).toBe('file-system');
  });

  test('parsePsActor derives writer_id from display_name for classified writers (git-upstream)', () => {
    const line = 'ps-actor: {"v":1,"display_name":"Git (upstream)","docs":[]}';
    const parsed = parsePsActor(line);
    expect(parsed?.writer_id).toBe('git-upstream');
  });

  test('parsePsActor falls back to palimpsest-service for unknown classified display_name', () => {
    const line = 'ps-actor: {"v":1,"display_name":"Palimpsest (service)","docs":[]}';
    const parsed = parsePsActor(line);
    expect(parsed?.writer_id).toBe('palimpsest-service');
  });

  test('parsePsActor reads a legacy openknowledge-service writer_id as-is', () => {
    const line =
      'ps-actor: {"v":1,"writer_id":"openknowledge-service","principal":null,"display_name":"Palimpsest (service)","docs":[]}';
    const parsed = parsePsActor(line);
    expect(parsed?.writer_id).toBe('openknowledge-service');
  });

  test('explicit writer_id in stored JSON wins over any derivation', () => {
    const line =
      'ps-actor: {"v":1,"writer_id":"custom-writer","principal":"principal-ignored","display_name":"X","docs":[]}';
    const parsed = parsePsActor(line);
    expect(parsed?.writer_id).toBe('custom-writer');
  });
});

describe('PsActorEntry summaries field (consolidated from ps-contributors:)', () => {
  test('formatPsActor elides summaries when empty/absent (legacy byte-identity)', () => {
    const entry: PsActorEntry = {
      v: 1,
      writer_id: 'agent-a',
      principal: null,
      agent_session: 'a',
      agent_type: null,
      client_name: null,
      client_version: null,
      label: null,
      display_name: 'Claude',
      color_seed: 'claude',
      docs: ['a.md'],
    };
    expect(formatPsActor(entry)).not.toContain('summaries');
  });

  test('formatPsActor elides summaries when explicitly empty array', () => {
    const entry: PsActorEntry = {
      v: 1,
      writer_id: 'agent-a',
      principal: null,
      agent_session: 'a',
      agent_type: null,
      client_name: null,
      client_version: null,
      label: null,
      display_name: 'Claude',
      color_seed: 'claude',
      docs: ['a.md'],
      summaries: [],
    };
    expect(formatPsActor(entry)).not.toContain('summaries');
  });

  test('formatPsActor includes summaries when populated', () => {
    const entry: PsActorEntry = {
      v: 1,
      writer_id: 'agent-a',
      principal: null,
      agent_session: 'a',
      agent_type: null,
      client_name: null,
      client_version: null,
      label: null,
      display_name: 'Claude',
      color_seed: 'claude',
      docs: ['a.md'],
      summaries: ['Added auth design', 'Fixed typo'],
    };
    const line = formatPsActor(entry);
    expect(line).toContain('"summaries":["Added auth design","Fixed typo"]');
  });

  test('parsePsActor round-trips summaries', () => {
    const entry: PsActorEntry = {
      v: 1,
      writer_id: 'agent-a',
      principal: null,
      agent_session: 'a',
      agent_type: null,
      client_name: null,
      client_version: null,
      label: null,
      display_name: 'Claude',
      color_seed: 'claude',
      docs: ['a.md'],
      summaries: ['one', 'two'],
    };
    const parsed = parsePsActor(formatPsActor(entry));
    expect(parsed?.summaries).toEqual(['one', 'two']);
  });

  test('parsePsActor drops summaries field when malformed (D27 divergence — keep entry)', () => {
    const line =
      'ps-actor: {"v":1,"writer_id":"agent-a","display_name":"Claude","docs":["a.md"],"summaries":"not-an-array"}';
    const parsed = parsePsActor(line);
    expect(parsed).not.toBeNull();
    expect(parsed?.writer_id).toBe('agent-a');
    expect(parsed?.summaries).toBeUndefined();
  });

  test('parsePsActor drops summaries field when array has non-string element', () => {
    const line =
      'ps-actor: {"v":1,"writer_id":"agent-a","display_name":"Claude","docs":["a.md"],"summaries":["ok",42,"also-ok"]}';
    const parsed = parsePsActor(line);
    expect(parsed?.summaries).toBeUndefined();
  });
});

describe('PsActorEntry previous_paths field (timeline rename-history mitigation)', () => {
  const baseEntry: PsActorEntry = {
    v: 1,
    writer_id: 'agent-a',
    principal: null,
    agent_session: 'a',
    agent_type: null,
    client_name: null,
    client_version: null,
    label: null,
    display_name: 'Claude',
    color_seed: 'claude',
    docs: ['essays/auth.md'],
  };

  test('formatPsActor elides previous_paths when absent (legacy byte-identity)', () => {
    expect(formatPsActor(baseEntry)).not.toContain('previous_paths');
  });

  test('formatPsActor elides previous_paths when explicitly empty array', () => {
    const entry: PsActorEntry = { ...baseEntry, previous_paths: [] };
    expect(formatPsActor(entry)).not.toContain('previous_paths');
  });

  test('formatPsActor includes previous_paths when populated', () => {
    const entry: PsActorEntry = {
      ...baseEntry,
      previous_paths: [{ from: 'articles/auth', to: 'essays/auth' }],
    };
    const line = formatPsActor(entry);
    expect(line).toContain('"previous_paths":[{"from":"articles/auth","to":"essays/auth"}]');
  });

  test('formatPsActor includes previous_paths after summaries when both present', () => {
    const entry: PsActorEntry = {
      ...baseEntry,
      summaries: ['rename'],
      previous_paths: [{ from: 'articles/auth', to: 'essays/auth' }],
    };
    const line = formatPsActor(entry);
    const summariesIdx = line.indexOf('"summaries"');
    const previousPathsIdx = line.indexOf('"previous_paths"');
    expect(summariesIdx).toBeGreaterThan(0);
    expect(previousPathsIdx).toBeGreaterThan(summariesIdx);
  });

  test('parsePsActor round-trips previous_paths chain', () => {
    const entry: PsActorEntry = {
      ...baseEntry,
      previous_paths: [
        { from: 'articles/auth', to: 'docs/auth' },
        { from: 'docs/auth', to: 'essays/auth' },
      ],
    };
    const parsed = parsePsActor(formatPsActor(entry));
    expect(parsed).not.toBeNull();
    expect(parsed?.previous_paths).toEqual([
      { from: 'articles/auth', to: 'docs/auth' },
      { from: 'docs/auth', to: 'essays/auth' },
    ]);
  });

  test('legacy ps-actor body (no previous_paths field) parses with previous_paths undefined', () => {
    const line =
      'ps-actor: {"v":1,"writer_id":"agent-a","principal":null,"agent_session":"a","agent_type":null,"client_name":null,"client_version":null,"label":null,"display_name":"Claude","color_seed":"claude","docs":["x.md"]}';
    const parsed = parsePsActor(line);
    expect(parsed).not.toBeNull();
    expect(parsed?.previous_paths).toBeUndefined();
  });

  test('parsePsActor drops previous_paths field when not an array', () => {
    const line =
      'ps-actor: {"v":1,"writer_id":"agent-a","display_name":"Claude","docs":["a.md"],"previous_paths":"not-an-array"}';
    const parsed = parsePsActor(line);
    expect(parsed).not.toBeNull();
    expect(parsed?.writer_id).toBe('agent-a');
    expect(parsed?.previous_paths).toBeUndefined();
  });

  test('parsePsActor drops single malformed previous_paths entry but keeps the rest', () => {
    const line =
      'ps-actor: {"v":1,"writer_id":"agent-a","display_name":"Claude","docs":["a.md"],"previous_paths":[{"from":"a","to":"b"},{"from":42,"to":"c"},{"from":"c","to":"d"}]}';
    const parsed = parsePsActor(line);
    expect(parsed).not.toBeNull();
    expect(parsed?.previous_paths).toEqual([
      { from: 'a', to: 'b' },
      { from: 'c', to: 'd' },
    ]);
  });

  test('parsePsActor drops previous_paths element missing required fields', () => {
    const line =
      'ps-actor: {"v":1,"writer_id":"agent-a","display_name":"Claude","docs":["a.md"],"previous_paths":[{"from":"only-from"},{"to":"only-to"},{"from":"a","to":"b"}]}';
    const parsed = parsePsActor(line);
    expect(parsed).not.toBeNull();
    expect(parsed?.previous_paths).toEqual([{ from: 'a', to: 'b' }]);
  });

  test('parsePsActor drops null entry inside previous_paths array', () => {
    const line =
      'ps-actor: {"v":1,"writer_id":"agent-a","display_name":"Claude","docs":["a.md"],"previous_paths":[null,{"from":"a","to":"b"}]}';
    const parsed = parsePsActor(line);
    expect(parsed?.previous_paths).toEqual([{ from: 'a', to: 'b' }]);
  });

  test('formatPsActor elides previous_paths when every element is malformed', () => {
    const line =
      'ps-actor: {"v":1,"writer_id":"agent-a","display_name":"Claude","docs":["a.md"],"previous_paths":[{"from":42},{"to":99}]}';
    const parsed = parsePsActor(line);
    expect(parsed?.previous_paths).toBeUndefined();
  });

  test('parsePsActors carries previous_paths on each writer', () => {
    const body = [
      'rename: articles/x -> essays/x',
      '',
      'ps-actor: {"v":1,"writer_id":"agent-alice","display_name":"Alice","docs":["essays/x.md"],"previous_paths":[{"from":"articles/x","to":"essays/x"}]}',
      'ps-actor: {"v":1,"writer_id":"agent-bob","display_name":"Bob","docs":["essays/y.md"],"previous_paths":[{"from":"articles/y","to":"essays/y"}]}',
    ].join('\n');
    const actors = parsePsActors(body);
    expect(actors).toHaveLength(2);
    expect(actors[0]?.previous_paths).toEqual([{ from: 'articles/x', to: 'essays/x' }]);
    expect(actors[1]?.previous_paths).toEqual([{ from: 'articles/y', to: 'essays/y' }]);
  });

  test('legacy ok- frontmatter prefixes still parse (upstream vaults stay readable)', () => {
    expect(
      parseContributors('\nok-contributors: {"id":"agent-a","name":"A","docs":["x"]}'),
    ).toEqual([expect.objectContaining({ id: 'agent-a' })]);
    expect(
      parsePsActor(
        '\nok-actor: {"v":1,"writer_id":"openknowledge-service","display_name":"Palimpsest (service)","docs":[]}',
      )?.writer_id,
    ).toBe('openknowledge-service');
    expect(
      parseCheckpoint(
        '\nok-checkpoint-v1: {"kind":"bridge-merge-loss","metadata":{"lostSubstrings":["x"]}}',
      )?.kind,
    ).toBe('bridge-merge-loss');
  });

  test('byte-identity: format(parse(legacyBody)) === legacyBody for a corpus of pre-spec lines', () => {
    const corpus = [
      'ps-actor: {"v":1,"writer_id":"agent-conn-abc123","principal":null,"agent_session":"conn-abc123","agent_type":"claude-3-5-sonnet","client_name":"claude-code","client_version":"1.0.0","label":"My agent","display_name":"Claude (abc1)","color_seed":"conn-abc123","docs":["notes.md","ideas.md"]}',
      'ps-actor: {"v":1,"writer_id":"openknowledge-service","principal":null,"agent_session":null,"agent_type":null,"client_name":null,"client_version":null,"label":null,"display_name":"Palimpsest (service)","color_seed":"openknowledge-service","docs":[]}',
      'ps-actor: {"v":1,"writer_id":"agent-a","principal":null,"agent_session":"a","agent_type":null,"client_name":null,"client_version":null,"label":null,"display_name":"Claude","color_seed":"claude","docs":["a.md"],"summaries":["one","two"]}',
    ];
    for (const legacyLine of corpus) {
      const parsed = parsePsActor(legacyLine);
      expect(parsed).not.toBeNull();
      const reformatted = formatPsActor(parsed as PsActorEntry);
      expect(reformatted).toBe(legacyLine);
    }
  });

  test('byte-identity: round-trip preserves previous_paths exactly', () => {
    const entry: PsActorEntry = {
      ...baseEntry,
      previous_paths: [
        { from: 'a', to: 'b' },
        { from: 'b', to: 'c' },
        { from: 'c', to: 'd' },
      ],
    };
    const line = formatPsActor(entry);
    const parsed = parsePsActor(line);
    expect(parsed).not.toBeNull();
    const relined = formatPsActor(parsed as PsActorEntry);
    expect(relined).toBe(line);
  });
});

describe('parsePsActors (plural — multi-writer L2 drain)', () => {
  test('empty body → []', () => {
    expect(parsePsActors('')).toEqual([]);
  });

  test('returns every ps-actor line, in file order', () => {
    const body = [
      'wip: notes.md (2 edits)',
      '',
      'ps-actor: {"v":1,"writer_id":"agent-alice","display_name":"Alice","docs":["a.md"],"summaries":["Alice note"]}',
      'ps-actor: {"v":1,"writer_id":"agent-bob","display_name":"Bob","docs":["b.md"],"summaries":["Bob note"]}',
    ].join('\n');
    const actors = parsePsActors(body);
    expect(actors).toHaveLength(2);
    expect(actors[0]?.writer_id).toBe('agent-alice');
    expect(actors[1]?.writer_id).toBe('agent-bob');
  });

  test('skips malformed lines silently, keeps valid ones', () => {
    const body = [
      'ps-actor: {not json}',
      'ps-actor: {"v":1,"writer_id":"agent-ok","display_name":"Good","docs":[]}',
      'ps-actor: {"v":0,"display_name":"wrong-version","docs":[]}',
    ].join('\n');
    const actors = parsePsActors(body);
    expect(actors).toHaveLength(1);
    expect(actors[0]?.writer_id).toBe('agent-ok');
  });

  test('no ps-actor lines → []', () => {
    const body = 'wip: foo\n\nok-contributors: {"id":"x","name":"X","docs":[]}';
    expect(parsePsActors(body)).toEqual([]);
  });
});

describe('readContributors (dispatcher: prefers ps-actor, falls back to ps-contributors)', () => {
  test('modern commit with only ps-actor: → projects to ShadowContributor[]', () => {
    const body = [
      'wip: a.md — added design',
      '',
      'ps-actor: {"v":1,"writer_id":"agent-claude","principal":null,"agent_session":"claude","agent_type":"claude","display_name":"Claude","color_seed":"claude","docs":["a.md"],"summaries":["added design"]}',
    ].join('\n');
    const contributors = readContributors(body);
    expect(contributors).toHaveLength(1);
    expect(contributors[0]?.id).toBe('agent-claude');
    expect(contributors[0]?.name).toBe('Claude');
    expect(contributors[0]?.colorSeed).toBe('claude');
    expect(contributors[0]?.docs).toEqual(['a.md']);
    expect(contributors[0]?.summaries).toEqual(['added design']);
  });

  test('legacy commit with only ps-contributors: → falls back to parseContributors', () => {
    const body = [
      'wip: legacy.md',
      '',
      'ps-contributors: {"v":1,"id":"agent-legacy","name":"Legacy","colorSeed":"seed","docs":["legacy.md"],"summaries":["pre-consolidation note"]}',
    ].join('\n');
    const contributors = readContributors(body);
    expect(contributors).toHaveLength(1);
    expect(contributors[0]?.id).toBe('agent-legacy');
    expect(contributors[0]?.summaries).toEqual(['pre-consolidation note']);
  });

  test('transitional commit with BOTH lines → ps-actor wins (no double-counting)', () => {
    const body = [
      'wip: both.md',
      '',
      'ps-contributors: {"v":1,"id":"agent-stale","name":"Stale","colorSeed":"x","docs":["both.md"]}',
      'ps-actor: {"v":1,"writer_id":"agent-fresh","display_name":"Fresh","color_seed":"y","docs":["both.md"]}',
    ].join('\n');
    const contributors = readContributors(body);
    expect(contributors).toHaveLength(1);
    expect(contributors[0]?.id).toBe('agent-fresh');
  });

  test('multi-writer modern commit → one ShadowContributor per ps-actor line', () => {
    const body = [
      'wip: shared.md',
      '',
      'ps-actor: {"v":1,"writer_id":"agent-a","display_name":"A","docs":["x.md"]}',
      'ps-actor: {"v":1,"writer_id":"file-system","display_name":"File System","docs":["y.md"]}',
    ].join('\n');
    const contributors = readContributors(body);
    expect(contributors).toHaveLength(2);
    expect(contributors.map((c) => c.id).sort()).toEqual(['agent-a', 'file-system']);
  });

  test('empty body → []', () => {
    expect(readContributors('')).toEqual([]);
  });

  test('body with neither prefix → []', () => {
    expect(readContributors('wip: test\n\njust a plain body')).toEqual([]);
  });
});

describe('Subject-prefix format helpers (D53, FR-13)', () => {
  test('formatReconcileSubject', () => {
    expect(formatReconcileSubject('notes.md')).toBe('reconcile: notes.md');
    expect(formatReconcileSubject('docs/guide.md')).toBe('reconcile: docs/guide.md');
  });

  test('formatRollbackSubject trims sha to 7 chars', () => {
    expect(formatRollbackSubject('notes.md', 'abcdef1234567890')).toBe(
      'rollback: notes.md to abcdef1',
    );
  });

  test('formatRollbackSubject with short sha (already <= 7)', () => {
    expect(formatRollbackSubject('plan.md', 'abc1234')).toBe('rollback: plan.md to abc1234');
  });

  test('formatParkSubject', () => {
    expect(formatParkSubject('main', 'feat/new-ui')).toBe('park: main -> feat/new-ui');
    expect(formatParkSubject('feat/old', 'main')).toBe('park: feat/old -> main');
  });

  test('formatRenameSubject', () => {
    expect(formatRenameSubject('intro.md', 'getting-started.md')).toBe(
      'rename: intro.md -> getting-started.md',
    );
  });

  test('formatCheckpointSubject', () => {
    expect(formatCheckpointSubject('Save progress')).toBe('checkpoint: Save progress');
    expect(formatCheckpointSubject('pre-rollback')).toBe('checkpoint: pre-rollback');
  });

  test('formatImportSubject with oldHead', () => {
    expect(formatImportSubject('aabbccddeeff0011', '1122334455667788')).toBe(
      'import: from aabbccdd..11223344',
    );
  });

  test('formatImportSubject without oldHead (initial import)', () => {
    expect(formatImportSubject(null, '1122334455667788')).toBe('import: initial at 11223344');
  });

  test('all prefixes are distinct and match their action kind', () => {
    const subjects = [
      formatWipSubject(['doc.md']),
      formatReconcileSubject('doc.md'),
      formatRollbackSubject('doc.md', 'abc1234abcd'),
      formatParkSubject('main', 'feat/x'),
      formatRenameSubject('a.md', 'b.md'),
      formatCheckpointSubject('save'),
      formatImportSubject('aabbccdd', 'eeff0011'),
    ];
    const prefixes = subjects.map((s) => s.split(':')[0]);
    expect(new Set(prefixes).size).toBe(subjects.length);
  });
});

describe('composeCommitSubject (FR14 — change-notes in commit subject)', () => {
  test('zero summaries → base subject unchanged', () => {
    expect(composeCommitSubject('wip: notes.md', [])).toBe('wip: notes.md');
  });

  test('single short summary → appended with em-dash separator', () => {
    expect(composeCommitSubject('wip: notes.md', ['added auth design'])).toBe(
      'wip: notes.md — added auth design',
    );
  });

  test('single summary fits exactly at 72 chars → no truncation', () => {
    const base = 'wip: a.md';
    const summary = 'x'.repeat(COMMIT_SUBJECT_MAX_LEN - base.length - ' — '.length);
    const subject = composeCommitSubject(base, [summary]);
    expect(subject.length).toBe(COMMIT_SUBJECT_MAX_LEN);
    expect(subject.endsWith(summary)).toBe(true);
  });

  test('single oversize summary → trailing ellipsis, base preserved', () => {
    const base = 'wip: notes.md';
    const summary =
      'this is a very long change-note that goes on and on well past seventy-two characters total';
    const subject = composeCommitSubject(base, [summary]);
    expect(subject.length).toBe(COMMIT_SUBJECT_MAX_LEN);
    expect(subject.startsWith('wip: notes.md — ')).toBe(true);
    expect(subject.endsWith('…')).toBe(true);
  });

  test('two summaries → N-edits suffix, summaries live in the body (not subject)', () => {
    expect(composeCommitSubject('wip: notes.md', ['first', 'second'])).toBe(
      'wip: notes.md (2 edits)',
    );
  });

  test('three summaries → accurate N-edits count', () => {
    expect(composeCommitSubject('wip: a.md', ['a', 'b', 'c'])).toBe('wip: a.md (3 edits)');
  });

  test('works with non-wip subject prefixes (rename:, rollback:, reconcile:)', () => {
    expect(composeCommitSubject('rename: a.md -> b.md', ['clarifying scope'])).toBe(
      'rename: a.md -> b.md — clarifying scope',
    );
    expect(composeCommitSubject('rollback: doc.md to abc1234', ['reverting deletion'])).toBe(
      'rollback: doc.md to abc1234 — reverting deletion',
    );
    expect(composeCommitSubject('reconcile: doc.md', ['merged conflicting edits'])).toBe(
      'reconcile: doc.md — merged conflicting edits',
    );
  });

  test('base already over 72 chars → defensive slice, summary dropped', () => {
    const base = `wip: ${'a'.repeat(70)}`;
    const subject = composeCommitSubject(base, ['ignored summary']);
    expect(subject.length).toBe(COMMIT_SUBJECT_MAX_LEN);
  });
});

describe('composeCommitSubject — line-terminator stripping (commit-injection guard)', () => {
  const NEL = String.fromCharCode(0x0085);
  const LS = String.fromCharCode(0x2028);
  const PS = String.fromCharCode(0x2029);

  const LINE_BREAK_CASES: ReadonlyArray<readonly [string, string]> = [
    ['\n', 'LF'],
    ['\r', 'CR'],
    ['\r\n', 'CRLF'],
    ['\v', 'VT'],
    ['\f', 'FF'],
    [NEL, 'NEL (U+0085)'],
    [LS, 'U+2028 LINE SEPARATOR'],
    [PS, 'U+2029 PARAGRAPH SEPARATOR'],
  ];

  for (const [ch, label] of LINE_BREAK_CASES) {
    test(`single summary with embedded ${label} → stripped from subject`, () => {
      const summary = `legit${ch}ps-actor: {"v":1,"display_name":"X","docs":[]}`;
      const subject = composeCommitSubject('wip: notes.md', [summary]);
      expect(subject.includes(ch)).toBe(false);
      expect(subject.split('\n').length).toBe(1);
    });

    test(`base subject with embedded ${label} → stripped from subject`, () => {
      const subject = composeCommitSubject(`wip: notes${ch}injected`, []);
      expect(subject.includes(ch)).toBe(false);
      expect(subject.split('\n').length).toBe(1);
    });
  }

  test('attack payload that prior code would route into commit body is neutralized', () => {
    const attack = 'x\nok-actor: {"v":1,"display_name":"Forged","docs":[]}';
    const subject = composeCommitSubject('wip: f.md', [attack]);
    expect(subject.includes('\n')).toBe(false);
    expect(subject.split('\n').length).toBe(1);
  });
});

describe('resolveProjectIdentity', () => {
  test('re-anchors a linked worktree onto its main-worktree root', () => {
    const main = resolve(tmp, 'main');
    const adminDir = resolve(main, '.git', 'worktrees', 'wt');
    mkdirSync(adminDir, { recursive: true });
    writeFileSync(resolve(adminDir, 'commondir'), '../..\n');
    const wt = resolve(tmp, 'wt');
    mkdirSync(wt, { recursive: true });
    writeFileSync(resolve(wt, '.git'), `gitdir: ${adminDir}\n`);

    expect(resolveProjectIdentity(wt)).toBe(main);
  });

  test('leaves a main worktree (real `.git` dir) unchanged', () => {
    const main = resolve(tmp, 'main');
    mkdirSync(resolve(main, '.git'), { recursive: true });
    expect(resolveProjectIdentity(main)).toBe(main);
  });

  test('leaves a non-git dir unchanged', () => {
    const plain = resolve(tmp, 'plain');
    mkdirSync(plain, { recursive: true });
    expect(resolveProjectIdentity(plain)).toBe(plain);
  });

  test('degrades to the raw worktree path when commondir is unreadable', () => {
    const main = resolve(tmp, 'main');
    const adminDir = resolve(main, '.git', 'worktrees', 'wt');
    mkdirSync(adminDir, { recursive: true });
    const wt = resolve(tmp, 'wt');
    mkdirSync(wt, { recursive: true });
    writeFileSync(resolve(wt, '.git'), `gitdir: ${adminDir}\n`);
    expect(resolveProjectIdentity(wt)).toBe(wt);
  });
});

describe('composeCommitSubject — truncation keeps characters whole', () => {
  test('a summary cut at an emoji drops the whole emoji', () => {
    const base = 'wip: notes.md';
    const prefix = `${base} — `;
    const budget = COMMIT_SUBJECT_MAX_LEN - prefix.length - 1;
    const summary = `${'a'.repeat(budget - 1)}\u{1F600}${'b'.repeat(20)}`;
    expect(composeCommitSubject(base, [summary])).toBe(`${prefix}${'a'.repeat(budget - 1)}…`);
  });

  test('an over-long base cut at an emoji drops the whole emoji', () => {
    const base = `wip: ${'n'.repeat(COMMIT_SUBJECT_MAX_LEN - 6)}\u{1F600}${'m'.repeat(10)}`;
    expect(composeCommitSubject(base, ['why'])).toBe(
      `wip: ${'n'.repeat(COMMIT_SUBJECT_MAX_LEN - 6)}`,
    );
  });
});
