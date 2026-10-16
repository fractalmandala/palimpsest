import { discoverSkillDirs } from '@palimpsest/core/skills-catalog';
import { describe, expect, test } from 'vitest';
import { parseForkSource, resolveForkSkillsRoot } from './fork-skills-source.ts';

describe('fork-skills-source', () => {
  test('resolves the fork skills root to an existing directory', () => {
    const root = resolveForkSkillsRoot();
    expect(root.endsWith('skills')).toBe(true);
  });

  test('maps the fork repo identifier to the local skills dir', () => {
    const spec = parseForkSource('fractalmandala/palimpsest-skills');
    expect(spec?.kind).toBe('local');
    if (spec?.kind === 'local') {
      const dirs = discoverSkillDirs(spec.path);
      const names = dirs.map((d) => d.name);
      expect(names).toContain('discovery');
      expect(names).toContain('project');
      expect(names).toContain('write-skill');
    }
  });

  test('leaves foreign sources to the standard parser', () => {
    expect(parseForkSource('acme/repo')?.kind).toBe('git');
    expect(parseForkSource('not a source!!!')).toBeNull();
  });
});
