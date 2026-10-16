import { describe, expect, test } from 'vitest';
import { extractSkillRefs, isPalimpsestSkillsSource, rewriteSkillRefs } from './skills.ts';

describe('rewriteSkillRefs', () => {
  test('rewrites both forms the extractor reads', () => {
    const body = 'Load /grill-me first.\nInline: `/grill-me`.\n(/grill-me) and [/grill-me]\n';
    expect(rewriteSkillRefs(body, 'grill-me', 'grilling')).toBe(
      'Load /grilling first.\nInline: `/grilling`.\n(/grilling) and [/grilling]\n',
    );
  });

  test('leaves alone every occurrence that draws no edge', () => {
    const inert = [
      'A path /grill-me/steps.md keeps going.',
      'No boundary before x/grill-me.',
      'Hyphen run /grill-me-2 is a different slug.',
    ];
    for (const body of inert) {
      expect(extractSkillRefs(body)).not.toContain('grill-me');
      expect(rewriteSkillRefs(body, 'grill-me', 'grilling')).toBe(body);
    }
  });

  test('rewrites only the named skill, not its neighbours', () => {
    const body = 'Use /alpha then /beta then /alphabet.\n';
    expect(rewriteSkillRefs(body, 'alpha', 'omega')).toBe(
      'Use /omega then /beta then /alphabet.\n',
    );
  });

  test('handles adjacent refs and repeats', () => {
    expect(rewriteSkillRefs('/ab /ab (/ab) `/ab`', 'ab', 'cd')).toBe('/cd /cd (/cd) `/cd`');
    expect(rewriteSkillRefs('/a /a', 'a', 'b')).toBe('/a /a');
  });

  test('no-ops when the name is unchanged, stop-listed, or absent', () => {
    expect(rewriteSkillRefs('Load /grill-me.', 'grill-me', 'grill-me')).toBe('Load /grill-me.');
    expect(rewriteSkillRefs('Files under /tmp.', 'tmp', 'temp')).toBe('Files under /tmp.');
    expect(rewriteSkillRefs('Nothing here.', 'grill-me', 'grilling')).toBe('Nothing here.');
  });

  test('a rewritten body extracts the new name and no longer the old', () => {
    const out = rewriteSkillRefs('See /grill-me and `/grill-me`.', 'grill-me', 'grilling');
    expect(extractSkillRefs(out)).toEqual(['grilling']);
  });
});

describe('isPalimpsestSkillsSource', () => {
  test('matches the bare repo, a skills.sh listing URL, and a git URL', () => {
    for (const source of [
      'fractalmandala/palimpsest-skills',
      'https://skills.sh/fractalmandala/palimpsest-skills/note-taking',
      'https://github.com/fractalmandala/palimpsest-skills.git',
      'git@github.com:fractalmandala/palimpsest-skills.git',
    ]) {
      expect(isPalimpsestSkillsSource(source)).toBe(true);
    }
  });

  test('a lookalike owner is not us', () => {
    expect(isPalimpsestSkillsSource('notfractalmandala/palimpsest-skills')).toBe(false);
    expect(isPalimpsestSkillsSource('fractalmandala/palimpsest-skills-fork')).toBe(false);
  });

  test("our repo path on somebody else's host is not us", () => {
    for (const source of [
      'https://evil.example/fractalmandala/palimpsest-skills',
      'evil.example.com/fractalmandala/palimpsest-skills',
      'https://evil.example/redirect?to=fractalmandala/palimpsest-skills',
      'git@evil.example:fractalmandala/palimpsest-skills.git',
    ]) {
      expect(isPalimpsestSkillsSource(source)).toBe(false);
    }
  });

  test('does not match somebody else', () => {
    for (const source of [
      'someone-else/skills',
      'inkeep/agents',
      'https://skills.sh/anthropics/skills/code-review',
      'adopt:claude',
      '',
    ]) {
      expect(isPalimpsestSkillsSource(source)).toBe(false);
    }
  });
});
