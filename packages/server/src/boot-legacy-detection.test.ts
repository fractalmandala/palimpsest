import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { findLegacyRuntimeFiles } from './boot.ts';

describe('findLegacyRuntimeFiles', () => {
  let psDir: string;

  beforeEach(() => {
    psDir = `${mkdtempSync(resolve(tmpdir(), 'ps-legacy-test-'))}/.ps`;
    mkdirSync(psDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(resolve(psDir, '..'), { recursive: true, force: true });
  });

  test('fresh project: no legacy files, no .ps/local/ → empty result', () => {
    expect(findLegacyRuntimeFiles(psDir)).toEqual([]);
  });

  test('legacy files at .ps/ root, no .ps/local/ → enumerates them', () => {
    writeFileSync(resolve(psDir, 'server.lock'), '{}');
    writeFileSync(resolve(psDir, 'principal.json'), '{}');
    writeFileSync(resolve(psDir, 'sync-state.json'), '{}');

    const found = findLegacyRuntimeFiles(psDir);
    expect(found).toContain('server.lock');
    expect(found).toContain('principal.json');
    expect(found).toContain('sync-state.json');
    expect(found).toHaveLength(3);
  });

  test('legacy cache/ + tmp/ subdirs are reported with trailing slash', () => {
    mkdirSync(resolve(psDir, 'cache'));
    mkdirSync(resolve(psDir, 'tmp'));

    const found = findLegacyRuntimeFiles(psDir);
    expect(found).toEqual(['cache/', 'tmp/']);
  });

  test('mixed legacy files + dirs reported together', () => {
    writeFileSync(resolve(psDir, 'state.json'), '{}');
    writeFileSync(resolve(psDir, 'last-spawn-error.log'), '');
    mkdirSync(resolve(psDir, 'cache'));

    const found = findLegacyRuntimeFiles(psDir);
    expect(found).toContain('state.json');
    expect(found).toContain('last-spawn-error.log');
    expect(found).toContain('cache/');
  });

  test('populated .ps/local/ suppresses the warning even with legacy files present', () => {
    writeFileSync(resolve(psDir, 'server.lock'), '{}');
    mkdirSync(resolve(psDir, 'local'));
    writeFileSync(resolve(psDir, 'local', 'server.lock'), '{}');

    expect(findLegacyRuntimeFiles(psDir)).toEqual([]);
  });

  test('empty .ps/local/ does NOT suppress (warning still drives developer cleanup)', () => {
    writeFileSync(resolve(psDir, 'server.lock'), '{}');
    mkdirSync(resolve(psDir, 'local'));

    expect(findLegacyRuntimeFiles(psDir)).toEqual(['server.lock']);
  });

  test('config.yml at .ps/ root is NOT a legacy runtime file (committed config)', () => {
    writeFileSync(resolve(psDir, 'config.yml'), '');
    writeFileSync(resolve(psDir, 'frontmatter.yml'), '');
    mkdirSync(resolve(psDir, 'templates'));

    expect(findLegacyRuntimeFiles(psDir)).toEqual([]);
  });

  test('all 7 runtime filenames are detected', () => {
    const expected = [
      'server.lock',
      'ui.lock',
      'state.json',
      'principal.json',
      'sync-state.json',
      'conflicts.json',
      'last-spawn-error.log',
    ];
    for (const name of expected) {
      writeFileSync(resolve(psDir, name), '{}');
    }
    const found = findLegacyRuntimeFiles(psDir);
    expect(found.sort()).toEqual(expected.sort());
  });
});
