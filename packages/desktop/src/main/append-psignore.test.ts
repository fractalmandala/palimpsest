import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { appendPsIgnoreSync } from './append-psignore.ts';

describe('appendPsIgnoreSync', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'ps-append-psignore-'));
  });

  afterEach(() => {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {}
  });

  test('empty-string patterns is a no-op (file is not created)', () => {
    appendPsIgnoreSync(dir, '');
    expect(existsSync(join(dir, '.psignore'))).toBe(false);
  });

  test('whitespace-only patterns is a no-op (file is not created)', () => {
    appendPsIgnoreSync(dir, '   \n\t  ');
    expect(existsSync(join(dir, '.psignore'))).toBe(false);
  });

  test('file-doesn-t-exist path: writes the patterns followed by exactly one trailing newline (no leading blank line)', () => {
    appendPsIgnoreSync(dir, 'tmp/\n*.draft.md');
    const out = readFileSync(join(dir, '.psignore'), 'utf8');
    expect(out).toBe('tmp/\n*.draft.md\n');
    expect(out.startsWith('\n')).toBe(false);
  });

  test('existing file with trailing newline: a one-line gap separates the prior content from the new patterns', () => {
    writeFileSync(join(dir, '.psignore'), 'node_modules/\n', 'utf8');
    appendPsIgnoreSync(dir, 'tmp/');
    const out = readFileSync(join(dir, '.psignore'), 'utf8');
    expect(out).toBe('node_modules/\n\ntmp/\n');
  });

  test('existing file without trailing newline: prior line is closed before the one-line gap', () => {
    writeFileSync(join(dir, '.psignore'), 'node_modules/', 'utf8');
    appendPsIgnoreSync(dir, 'tmp/');
    const out = readFileSync(join(dir, '.psignore'), 'utf8');
    expect(out).toBe('node_modules/\n\ntmp/\n');
  });

  test('whitespace at the edges of patterns is trimmed before append', () => {
    appendPsIgnoreSync(dir, '   tmp/\n*.draft.md   ');
    const out = readFileSync(join(dir, '.psignore'), 'utf8');
    expect(out).toBe('tmp/\n*.draft.md\n');
  });

  test('input lines that already appear in the existing file are filtered out', () => {
    writeFileSync(join(dir, '.psignore'), 'tmp/\n', 'utf8');
    appendPsIgnoreSync(dir, 'tmp/\nfoo/');
    const out = readFileSync(join(dir, '.psignore'), 'utf8');
    expect(out).toBe('tmp/\n\nfoo/\n');
  });

  test('input fully present in existing file is a complete no-op (file unchanged)', () => {
    const before = '# header comment\n#\ntmp/\n*.draft.md\n';
    writeFileSync(join(dir, '.psignore'), before, 'utf8');
    appendPsIgnoreSync(dir, '# header comment\n#\ntmp/\n*.draft.md');
    expect(readFileSync(join(dir, '.psignore'), 'utf8')).toBe(before);
  });

  test('seed-comment block re-supplied on top of a seeded file does not duplicate (exact-overlap → early return)', () => {
    const seed = [
      '# .psignore — paths to exclude from the Palimpsest document index.',
      '# Uses gitignore syntax (parsed by the `ignore` npm library), evaluated',
      '# alongside .gitignore in a single ignore-lib instance.',
      '#',
      '# Patterns combine with .gitignore: an entry here adds to exclusions, and',
      '# a leading `!` re-includes a file that .gitignore excluded.',
      '# Nested .psignore files at any folder depth are honored (mirrors .gitignore).',
      '#',
      '# Examples:',
      '#   drafts/        # exclude a directory',
      '#   *.draft.md     # exclude files matching a pattern',
      '#   !keep.md       # re-include a file .gitignore excluded',
      '',
    ].join('\n');
    writeFileSync(join(dir, '.psignore'), seed, 'utf8');
    appendPsIgnoreSync(dir, seed);
    expect(readFileSync(join(dir, '.psignore'), 'utf8')).toBe(seed);
  });

  test('seed-comment block plus one genuinely new pattern: seed lines drop, separator+new pattern land (paste-then-type shape)', () => {
    const seed = [
      '# .psignore — paths to exclude from the Palimpsest document index.',
      '# Uses gitignore syntax (parsed by the `ignore` npm library), evaluated',
      '# alongside .gitignore in a single ignore-lib instance.',
      '#',
      '# Patterns combine with .gitignore: an entry here adds to exclusions, and',
      '# a leading `!` re-includes a file that .gitignore excluded.',
      '# Nested .psignore files at any folder depth are honored (mirrors .gitignore).',
      '#',
      '# Examples:',
      '#   drafts/        # exclude a directory',
      '#   *.draft.md     # exclude files matching a pattern',
      '#   !keep.md       # re-include a file .gitignore excluded',
      '',
    ].join('\n');
    writeFileSync(join(dir, '.psignore'), seed, 'utf8');
    appendPsIgnoreSync(dir, `${seed}*.scratch.md`);
    expect(readFileSync(join(dir, '.psignore'), 'utf8')).toBe(`${seed}\n*.scratch.md\n`);
  });

  test('repeat call with the same patterns leaves the file unchanged on the second run', () => {
    appendPsIgnoreSync(dir, 'tmp/\n*.draft.md');
    const first = readFileSync(join(dir, '.psignore'), 'utf8');
    appendPsIgnoreSync(dir, 'tmp/\n*.draft.md');
    const second = readFileSync(join(dir, '.psignore'), 'utf8');
    expect(second).toBe(first);
  });

  test('mixed input keeps only the genuinely new lines', () => {
    writeFileSync(join(dir, '.psignore'), 'tmp/\nfoo/\n', 'utf8');
    appendPsIgnoreSync(dir, 'foo/\nbar/\ntmp/\nbaz/');
    const out = readFileSync(join(dir, '.psignore'), 'utf8');
    expect(out).toBe('tmp/\nfoo/\n\nbar/\nbaz/\n');
  });

  test('trim-equality matches lines with trailing whitespace as duplicates', () => {
    writeFileSync(join(dir, '.psignore'), 'tmp/\n', 'utf8');
    appendPsIgnoreSync(dir, 'tmp/   \nfoo/');
    const out = readFileSync(join(dir, '.psignore'), 'utf8');
    expect(out).toBe('tmp/\n\nfoo/\n');
  });

  test('within-input repeats are NOT deduped (existing-line set is built once at entry, not refreshed per input line)', () => {
    writeFileSync(join(dir, '.psignore'), 'foo/\n', 'utf8');
    appendPsIgnoreSync(dir, 'tmp/\ntmp/');
    const out = readFileSync(join(dir, '.psignore'), 'utf8');
    expect(out).toBe('foo/\n\ntmp/\ntmp/\n');
  });
});
