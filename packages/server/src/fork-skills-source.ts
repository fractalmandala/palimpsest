import { dirname } from 'node:path';
import { isPalimpsestSkillsSource } from '@palimpsest/core';
import type { SourceSpec } from '@palimpsest/core/skills-catalog';
import { parseSource } from '@palimpsest/core/skills-catalog';
import { resolveBundledSkillDir } from './build-skill-zip.ts';

export function resolveForkSkillsRoot(): string {
  return dirname(resolveBundledSkillDir('project'));
}

export function parseForkSource(raw: string): SourceSpec | null {
  if (isPalimpsestSkillsSource(raw.trim())) {
    try {
      return { kind: 'local', path: resolveForkSkillsRoot() };
    } catch {
      return parseSource(raw);
    }
  }
  return parseSource(raw);
}
