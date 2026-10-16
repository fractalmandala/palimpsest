import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  PSF_FRONTMATTER_REGISTRY,
  PSF_SCHEMA_DIR,
  psfSchemaPathFor,
  renderPsfSchemaFiles,
} from '@palimpsest/core';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import {
  ensurePsfSchemaFiles,
  resetPsfSchemaWriteState,
  writePsfSchemaFiles,
} from './write-psf-schemas.ts';

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'ps-psf-schemas-'));
  mkdirSync(join(root, '.ps'), { recursive: true });
  resetPsfSchemaWriteState();
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

const read = (rel: string) => readFileSync(join(root, rel), 'utf8');

describe('writing the schemas', () => {
  test('every registered schema lands at the path it is advertised as', () => {
    writePsfSchemaFiles(root);
    for (const entry of PSF_FRONTMATTER_REGISTRY) {
      const advertised = psfSchemaPathFor(entry.id);
      expect(existsSync(join(root, advertised)), advertised).toBe(true);
    }
  });

  test('the written bytes ARE the schema the plugin validates with', () => {
    writePsfSchemaFiles(root);
    for (const file of renderPsfSchemaFiles()) {
      const onDisk = JSON.parse(read(file.path));
      const { $comment, ...schema } = onDisk;
      const entry = PSF_FRONTMATTER_REGISTRY.find((e) => e.id === file.ruleId);
      expect(schema, file.path).toEqual(entry?.schema);
      expect($comment).toBeTypeOf('string');
    }
  });

  test('each file says it is generated and that editing it does nothing', () => {
    writePsfSchemaFiles(root);
    const first = JSON.parse(read(psfSchemaPathFor('frontmatter-required')));
    expect(first.$comment).toMatch(/do not edit/i);
    expect(first.$comment).toMatch(/overwritten/i);
  });

  test('an edit is reverted on the next write', () => {
    writePsfSchemaFiles(root);
    const path = psfSchemaPathFor('frontmatter-required');
    writeFileSync(join(root, path), '{"type":"object"}\n', 'utf8');
    writePsfSchemaFiles(root);
    expect(JSON.parse(read(path)).title).toContain('OKF v0.2');
  });

  test('an unchanged rewrite produces identical bytes', () => {
    writePsfSchemaFiles(root);
    const path = psfSchemaPathFor('frontmatter-provenance');
    const before = read(path);
    writePsfSchemaFiles(root);
    expect(read(path)).toBe(before);
  });
});

describe('git handling', () => {
  test('the generated directory is added to .ps/.gitignore', () => {
    writeFileSync(join(root, '.ps', '.gitignore'), 'local/\n', 'utf8');
    writePsfSchemaFiles(root);
    expect(read('.ps/.gitignore')).toMatch(/^psf\/$/m);
  });

  test('the rule is not duplicated on a second write', () => {
    writeFileSync(join(root, '.ps', '.gitignore'), 'local/\n', 'utf8');
    writePsfSchemaFiles(root);
    writePsfSchemaFiles(root);
    const lines = read('.ps/.gitignore')
      .split('\n')
      .filter((l) => l.trim() === 'psf/');
    expect(lines).toHaveLength(1);
  });

  test('a rule the user already wrote themselves is left alone', () => {
    writeFileSync(join(root, '.ps', '.gitignore'), 'local/\n  psf/  \n', 'utf8');
    writePsfSchemaFiles(root);
    const lines = read('.ps/.gitignore')
      .split('\n')
      .filter((l) => l.trim() === 'psf/');
    expect(lines).toHaveLength(1);
  });

  test('a project with no .ps/.gitignore still gets its schemas', () => {
    rmSync(join(root, '.ps', '.gitignore'), { force: true });
    expect(writePsfSchemaFiles(root).length).toBeGreaterThan(0);
    expect(existsSync(join(root, PSF_SCHEMA_DIR))).toBe(true);
  });
});

describe('rule toggles', () => {
  test('a disabled rule loses its schema file and keeps the others', () => {
    writePsfSchemaFiles(root);
    writePsfSchemaFiles(root, { 'frontmatter-provenance': false });
    expect(existsSync(join(root, psfSchemaPathFor('frontmatter-provenance')))).toBe(false);
    expect(existsSync(join(root, psfSchemaPathFor('frontmatter-required')))).toBe(true);
  });

  test('re-enabling a rule restores its schema file', () => {
    writePsfSchemaFiles(root, { 'frontmatter-provenance': false });
    writePsfSchemaFiles(root);
    expect(existsSync(join(root, psfSchemaPathFor('frontmatter-provenance')))).toBe(true);
  });

  test('a body rule with no schema changes nothing', () => {
    writePsfSchemaFiles(root);
    const before = PSF_FRONTMATTER_REGISTRY.map((e) => read(psfSchemaPathFor(e.id)));
    writePsfSchemaFiles(root, { 'no-wiki-links': false });
    expect(PSF_FRONTMATTER_REGISTRY.map((e) => read(psfSchemaPathFor(e.id)))).toEqual(before);
  });
});

describe('the enablement gate', () => {
  test('nothing is written while the plugin is off', () => {
    ensurePsfSchemaFiles(root, { enabled: false });
    expect(existsSync(join(root, PSF_SCHEMA_DIR))).toBe(false);
  });

  test('turning it on writes, and repeat calls are a no-op', () => {
    ensurePsfSchemaFiles(root, { enabled: true });
    const path = psfSchemaPathFor('frontmatter-required');
    expect(existsSync(join(root, path))).toBe(true);

    writeFileSync(join(root, path), 'edited\n', 'utf8');
    ensurePsfSchemaFiles(root, { enabled: true });
    expect(read(path)).toBe('edited\n');

    ensurePsfSchemaFiles(root, { enabled: false });
    ensurePsfSchemaFiles(root, { enabled: true });
    expect(JSON.parse(read(path)).title).toContain('OKF v0.2');
  });

  test('toggling a rule off deletes its file without a restart', () => {
    ensurePsfSchemaFiles(root, { enabled: true });
    ensurePsfSchemaFiles(root, { enabled: true, rules: { 'frontmatter-provenance': false } });
    expect(existsSync(join(root, psfSchemaPathFor('frontmatter-provenance')))).toBe(false);
    expect(existsSync(join(root, psfSchemaPathFor('frontmatter-required')))).toBe(true);
  });

  test('disabling the plugin removes the generated files and the directory', () => {
    ensurePsfSchemaFiles(root, { enabled: true });
    ensurePsfSchemaFiles(root, { enabled: false });
    expect(existsSync(join(root, PSF_SCHEMA_DIR))).toBe(false);
  });

  test('disabling the plugin leaves a file it did not write', () => {
    ensurePsfSchemaFiles(root, { enabled: true });
    const stray = join(root, PSF_SCHEMA_DIR, 'notes.txt');
    writeFileSync(stray, 'mine\n', 'utf8');
    ensurePsfSchemaFiles(root, { enabled: false });
    expect(readFileSync(stray, 'utf8')).toBe('mine\n');
    expect(existsSync(join(root, psfSchemaPathFor('frontmatter-required')))).toBe(false);
  });

  test('a second project is not skipped by the first', () => {
    const rootB = mkdtempSync(join(tmpdir(), 'ps-psf-schemas-b-'));
    mkdirSync(join(rootB, '.ps'), { recursive: true });
    try {
      ensurePsfSchemaFiles(root, { enabled: true });
      ensurePsfSchemaFiles(rootB, { enabled: true });
      expect(existsSync(join(rootB, psfSchemaPathFor('frontmatter-required')))).toBe(true);
    } finally {
      rmSync(rootB, { recursive: true, force: true });
    }
  });

  test('an unwritable project degrades quietly rather than throwing', () => {
    expect(() => writePsfSchemaFiles(join(root, 'nope', '\0bad'))).not.toThrow();
  });
});
