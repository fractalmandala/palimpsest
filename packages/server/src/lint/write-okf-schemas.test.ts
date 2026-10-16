import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  PSF_FRONTMATTER_REGISTRY,
  PSF_SCHEMA_DIR,
  psfSchemaPathFor,
  renderOkfSchemaFiles,
} from '@palimpsest/core';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import {
  ensureOkfSchemaFiles,
  resetOkfSchemaWriteState,
  writeOkfSchemaFiles,
} from './write-psf-schemas.ts';

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'ps-psf-schemas-'));
  mkdirSync(join(root, '.ps'), { recursive: true });
  resetOkfSchemaWriteState();
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

const read = (rel: string) => readFileSync(join(root, rel), 'utf8');

describe('writing the schemas', () => {
  test('every registered schema lands at the path it is advertised as', () => {
    writeOkfSchemaFiles(root);
    for (const entry of PSF_FRONTMATTER_REGISTRY) {
      const advertised = psfSchemaPathFor(entry.id);
      expect(existsSync(join(root, advertised)), advertised).toBe(true);
    }
  });

  test('the written bytes ARE the schema the plugin validates with', () => {
    writeOkfSchemaFiles(root);
    for (const file of renderOkfSchemaFiles()) {
      const onDisk = JSON.parse(read(file.path));
      const { $comment, ...schema } = onDisk;
      const entry = PSF_FRONTMATTER_REGISTRY.find((e) => e.id === file.ruleId);
      expect(schema, file.path).toEqual(entry?.schema);
      expect($comment).toBeTypeOf('string');
    }
  });

  test('each file says it is generated and that editing it does nothing', () => {
    writeOkfSchemaFiles(root);
    const first = JSON.parse(read(psfSchemaPathFor('frontmatter-required')));
    expect(first.$comment).toMatch(/do not edit/i);
    expect(first.$comment).toMatch(/overwritten/i);
  });

  test('an edit is reverted on the next write', () => {
    writeOkfSchemaFiles(root);
    const path = psfSchemaPathFor('frontmatter-required');
    writeFileSync(join(root, path), '{"type":"object"}\n', 'utf8');
    writeOkfSchemaFiles(root);
    expect(JSON.parse(read(path)).title).toContain('OKF v0.2');
  });

  test('an unchanged rewrite produces identical bytes', () => {
    writeOkfSchemaFiles(root);
    const path = psfSchemaPathFor('frontmatter-provenance');
    const before = read(path);
    writeOkfSchemaFiles(root);
    expect(read(path)).toBe(before);
  });
});

describe('git handling', () => {
  test('the generated directory is added to .ps/.gitignore', () => {
    writeFileSync(join(root, '.ps', '.gitignore'), 'local/\n', 'utf8');
    writeOkfSchemaFiles(root);
    expect(read('.ps/.gitignore')).toMatch(/^psf\/$/m);
  });

  test('the rule is not duplicated on a second write', () => {
    writeFileSync(join(root, '.ps', '.gitignore'), 'local/\n', 'utf8');
    writeOkfSchemaFiles(root);
    writeOkfSchemaFiles(root);
    const lines = read('.ps/.gitignore')
      .split('\n')
      .filter((l) => l.trim() === 'psf/');
    expect(lines).toHaveLength(1);
  });

  test('a rule the user already wrote themselves is left alone', () => {
    writeFileSync(join(root, '.ps', '.gitignore'), 'local/\n  psf/  \n', 'utf8');
    writeOkfSchemaFiles(root);
    const lines = read('.ps/.gitignore')
      .split('\n')
      .filter((l) => l.trim() === 'psf/');
    expect(lines).toHaveLength(1);
  });

  test('a project with no .ps/.gitignore still gets its schemas', () => {
    rmSync(join(root, '.ps', '.gitignore'), { force: true });
    expect(writeOkfSchemaFiles(root).length).toBeGreaterThan(0);
    expect(existsSync(join(root, PSF_SCHEMA_DIR))).toBe(true);
  });
});

describe('rule toggles', () => {
  test('a disabled rule loses its schema file and keeps the others', () => {
    writeOkfSchemaFiles(root);
    writeOkfSchemaFiles(root, { 'frontmatter-provenance': false });
    expect(existsSync(join(root, psfSchemaPathFor('frontmatter-provenance')))).toBe(false);
    expect(existsSync(join(root, psfSchemaPathFor('frontmatter-required')))).toBe(true);
  });

  test('re-enabling a rule restores its schema file', () => {
    writeOkfSchemaFiles(root, { 'frontmatter-provenance': false });
    writeOkfSchemaFiles(root);
    expect(existsSync(join(root, psfSchemaPathFor('frontmatter-provenance')))).toBe(true);
  });

  test('a body rule with no schema changes nothing', () => {
    writeOkfSchemaFiles(root);
    const before = PSF_FRONTMATTER_REGISTRY.map((e) => read(psfSchemaPathFor(e.id)));
    writeOkfSchemaFiles(root, { 'no-wiki-links': false });
    expect(PSF_FRONTMATTER_REGISTRY.map((e) => read(psfSchemaPathFor(e.id)))).toEqual(before);
  });
});

describe('the enablement gate', () => {
  test('nothing is written while the plugin is off', () => {
    ensureOkfSchemaFiles(root, { enabled: false });
    expect(existsSync(join(root, PSF_SCHEMA_DIR))).toBe(false);
  });

  test('turning it on writes, and repeat calls are a no-op', () => {
    ensureOkfSchemaFiles(root, { enabled: true });
    const path = psfSchemaPathFor('frontmatter-required');
    expect(existsSync(join(root, path))).toBe(true);

    writeFileSync(join(root, path), 'edited\n', 'utf8');
    ensureOkfSchemaFiles(root, { enabled: true });
    expect(read(path)).toBe('edited\n');

    ensureOkfSchemaFiles(root, { enabled: false });
    ensureOkfSchemaFiles(root, { enabled: true });
    expect(JSON.parse(read(path)).title).toContain('OKF v0.2');
  });

  test('toggling a rule off deletes its file without a restart', () => {
    ensureOkfSchemaFiles(root, { enabled: true });
    ensureOkfSchemaFiles(root, { enabled: true, rules: { 'frontmatter-provenance': false } });
    expect(existsSync(join(root, psfSchemaPathFor('frontmatter-provenance')))).toBe(false);
    expect(existsSync(join(root, psfSchemaPathFor('frontmatter-required')))).toBe(true);
  });

  test('disabling the plugin removes the generated files and the directory', () => {
    ensureOkfSchemaFiles(root, { enabled: true });
    ensureOkfSchemaFiles(root, { enabled: false });
    expect(existsSync(join(root, PSF_SCHEMA_DIR))).toBe(false);
  });

  test('disabling the plugin leaves a file it did not write', () => {
    ensureOkfSchemaFiles(root, { enabled: true });
    const stray = join(root, PSF_SCHEMA_DIR, 'notes.txt');
    writeFileSync(stray, 'mine\n', 'utf8');
    ensureOkfSchemaFiles(root, { enabled: false });
    expect(readFileSync(stray, 'utf8')).toBe('mine\n');
    expect(existsSync(join(root, psfSchemaPathFor('frontmatter-required')))).toBe(false);
  });

  test('a second project is not skipped by the first', () => {
    const rootB = mkdtempSync(join(tmpdir(), 'ps-psf-schemas-b-'));
    mkdirSync(join(rootB, '.ps'), { recursive: true });
    try {
      ensureOkfSchemaFiles(root, { enabled: true });
      ensureOkfSchemaFiles(rootB, { enabled: true });
      expect(existsSync(join(rootB, psfSchemaPathFor('frontmatter-required')))).toBe(true);
    } finally {
      rmSync(rootB, { recursive: true, force: true });
    }
  });

  test('an unwritable project degrades quietly rather than throwing', () => {
    expect(() => writeOkfSchemaFiles(join(root, 'nope', '\0bad'))).not.toThrow();
  });
});
