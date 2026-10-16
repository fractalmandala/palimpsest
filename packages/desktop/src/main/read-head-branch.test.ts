import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

import { readHeadBranch } from './read-head-branch.ts';

describe('readHeadBranch (filesystem)', () => {
  function makeProject(): string {
    return mkdtempSync(join(tmpdir(), 'ps-read-head-branch-'));
  }

  function cleanup(path: string): void {
    rmSync(path, { recursive: true, force: true });
  }

  test('reads a branch from a primary checkout (.git directory)', () => {
    const project = makeProject();
    try {
      mkdirSync(join(project, '.git'), { recursive: true });
      writeFileSync(join(project, '.git', 'HEAD'), 'ref: refs/heads/main');
      expect(readHeadBranch(project)).toEqual({
        currentBranch: 'main',
        headSha: null,
        detached: false,
      });
    } finally {
      cleanup(project);
    }
  });

  test('reads a slashed branch from a primary checkout', () => {
    const project = makeProject();
    try {
      mkdirSync(join(project, '.git'), { recursive: true });
      writeFileSync(join(project, '.git', 'HEAD'), 'ref: refs/heads/feat/foo\n');
      expect(readHeadBranch(project)).toEqual({
        currentBranch: 'feat/foo',
        headSha: null,
        detached: false,
      });
    } finally {
      cleanup(project);
    }
  });

  test('reads a symbolic ref without whitespace after the ref marker', () => {
    const project = makeProject();
    try {
      mkdirSync(join(project, '.git'), { recursive: true });
      writeFileSync(join(project, '.git', 'HEAD'), 'ref:refs/heads/main\n');
      expect(readHeadBranch(project)).toEqual({
        currentBranch: 'main',
        headSha: null,
        detached: false,
      });
    } finally {
      cleanup(project);
    }
  });

  test('detects a detached HEAD', () => {
    const project = makeProject();
    try {
      mkdirSync(join(project, '.git'), { recursive: true });
      writeFileSync(join(project, '.git', 'HEAD'), 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef\n');
      expect(readHeadBranch(project)).toEqual({
        currentBranch: null,
        headSha: 'deadbee',
        detached: true,
      });
    } finally {
      cleanup(project);
    }
  });

  test('collapses malformed HEAD forms to the failure sentinel', () => {
    const project = makeProject();
    try {
      mkdirSync(join(project, '.git'), { recursive: true });
      for (const contents of [
        '',
        'ref: not-a-ref\n',
        'abc123\n',
        '1234567890ABCDEF1234567890ABCDEF12345678\n',
        'ref: refs/heads/\n',
      ]) {
        writeFileSync(join(project, '.git', 'HEAD'), contents);
        expect(readHeadBranch(project)).toEqual({
          currentBranch: null,
          headSha: null,
          detached: false,
        });
      }
    } finally {
      cleanup(project);
    }
  });

  test('follows the worktree gitdir pointer when .git is a file', () => {
    const project = makeProject();
    try {
      const realGitDir = mkdtempSync(join(tmpdir(), 'ps-read-head-branch-gitdir-'));
      try {
        writeFileSync(join(realGitDir, 'HEAD'), 'ref: refs/heads/wt-branch\n');
        writeFileSync(join(project, '.git'), `gitdir: ${realGitDir}\n`);
        expect(readHeadBranch(project)).toEqual({
          currentBranch: 'wt-branch',
          headSha: null,
          detached: false,
        });
      } finally {
        cleanup(realGitDir);
      }
    } finally {
      cleanup(project);
    }
  });

  test('follows a relative worktree gitdir pointer', () => {
    const project = makeProject();
    try {
      const siblingGitDir = join(project, 'gitdir-target');
      mkdirSync(siblingGitDir, { recursive: true });
      writeFileSync(join(siblingGitDir, 'HEAD'), 'ref: refs/heads/rel-branch\n');
      writeFileSync(join(project, '.git'), 'gitdir: ./gitdir-target\n');
      expect(readHeadBranch(project)).toEqual({
        currentBranch: 'rel-branch',
        headSha: null,
        detached: false,
      });
    } finally {
      cleanup(project);
    }
  });

  test('returns failure sentinel when .git is missing', () => {
    const project = makeProject();
    try {
      expect(readHeadBranch(project)).toEqual({
        currentBranch: null,
        headSha: null,
        detached: false,
      });
    } finally {
      cleanup(project);
    }
  });

  test('returns failure sentinel when .git/HEAD is missing', () => {
    const project = makeProject();
    try {
      mkdirSync(join(project, '.git'), { recursive: true });
      expect(readHeadBranch(project)).toEqual({
        currentBranch: null,
        headSha: null,
        detached: false,
      });
    } finally {
      cleanup(project);
    }
  });

  test('returns failure sentinel when worktree pointer targets a missing dir', () => {
    const project = makeProject();
    try {
      writeFileSync(join(project, '.git'), 'gitdir: /var/empty/does-not-exist\n');
      expect(readHeadBranch(project)).toEqual({
        currentBranch: null,
        headSha: null,
        detached: false,
      });
    } finally {
      cleanup(project);
    }
  });

  test('refuses non-absolute paths', () => {
    expect(readHeadBranch('relative/path')).toEqual({
      currentBranch: null,
      headSha: null,
      detached: false,
    });
  });

  test('refuses paths containing NUL bytes', () => {
    expect(readHeadBranch('/tmp/\0evil')).toEqual({
      currentBranch: null,
      headSha: null,
      detached: false,
    });
  });

  test('refuses paths whose resolved form traverses upward', () => {
    expect(readHeadBranch('/tmp/../etc')).toEqual({
      currentBranch: null,
      headSha: null,
      detached: false,
    });
  });
});
