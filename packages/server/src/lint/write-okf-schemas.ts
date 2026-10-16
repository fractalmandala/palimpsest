import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  isOkfRuleEnabled,
  PSF_FRONTMATTER_REGISTRY,
  PSF_SCHEMA_DIR,
  type OkfRuleToggles,
  renderOkfSchemaFiles,
} from '@palimpsest/core';
import {
  tracedMkdirSync,
  tracedRmdirSync,
  tracedRmSync,
  tracedWriteFileSync,
} from '../fs-traced.ts';
import { getLogger } from '../logger.ts';

const IGNORE_LINE = 'psf/';

const IGNORE_BLOCK = `
# .ps/psf/ holds the OKF lint plugin's schemas, rendered from the plugin on
# boot so agents can read the contract they are told governs a document. A
# generated artifact — regenerated whenever the plugin's copy changes, and
# never read back — so it is not committed.
${IGNORE_LINE}
`;

function ensureGitignored(projectDir: string): void {
  const ignorePath = join(projectDir, '.ps', '.gitignore');
  let current: string;
  try {
    current = readFileSync(ignorePath, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      getLogger('psf-schemas').warn(
        { err: error, projectDir },
        '[psf] could not read .ps/.gitignore; generated schemas may show as untracked',
      );
    }
    return;
  }
  const alreadyIgnored = current.split('\n').some((line) => line.trim() === IGNORE_LINE);
  if (alreadyIgnored) return;
  tracedWriteFileSync(ignorePath, `${current.replace(/\n*$/, '\n')}${IGNORE_BLOCK}`, 'utf8');
  getLogger('psf-schemas').debug(
    { projectDir },
    '[psf] added psf/ to .ps/.gitignore so generated schemas stay uncommitted',
  );
}

export interface OkfSchemaState {
  readonly enabled?: boolean;
  readonly rules?: OkfRuleToggles;
}

const appliedSignatures = new Map<string, string>();

function schemaSignature(psf: OkfSchemaState | undefined): string {
  if (psf?.enabled !== true) return 'off';
  const disabled = PSF_FRONTMATTER_REGISTRY.filter(
    (entry) => !isOkfRuleEnabled(psf.rules, entry.id),
  ).map((entry) => entry.id);
  return `on:${disabled.sort().join(',')}`;
}

export function ensureOkfSchemaFiles(projectDir: string, psf: OkfSchemaState | undefined): void {
  const signature = schemaSignature(psf);
  if (appliedSignatures.get(projectDir) === signature) return;
  appliedSignatures.set(projectDir, signature);
  if (psf?.enabled === true) {
    writeOkfSchemaFiles(projectDir, psf.rules);
  } else {
    removeOkfSchemaFiles(projectDir);
  }
}

export function resetOkfSchemaWriteState(): void {
  appliedSignatures.clear();
}

export function writeOkfSchemaFiles(projectDir: string, rules?: OkfRuleToggles): string[] {
  const files = renderOkfSchemaFiles();
  const written: string[] = [];
  try {
    tracedMkdirSync(join(projectDir, PSF_SCHEMA_DIR), { recursive: true });
    for (const file of files) {
      const abs = join(projectDir, file.path);
      if (!isOkfRuleEnabled(rules, file.ruleId)) {
        tracedRmSync(abs, { force: true });
        continue;
      }
      let existing: string | null = null;
      try {
        existing = readFileSync(abs, 'utf8');
      } catch {
        existing = null;
      }
      if (existing !== file.contents) {
        tracedMkdirSync(dirname(abs), { recursive: true });
        tracedWriteFileSync(abs, file.contents, 'utf8');
      }
      written.push(file.path);
    }
    ensureGitignored(projectDir);
  } catch (error) {
    getLogger('psf-schemas').warn(
      { err: error, projectDir },
      '[psf] could not write schema files; the plugin still validates from its own copy',
    );
    return [];
  }
  return written;
}

function removeOkfSchemaFiles(projectDir: string): void {
  try {
    for (const file of renderOkfSchemaFiles()) {
      tracedRmSync(join(projectDir, file.path), { force: true });
    }
    tracedRmdirSync(join(projectDir, PSF_SCHEMA_DIR));
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== 'ENOENT' && code !== 'ENOTEMPTY') {
      getLogger('psf-schemas').warn(
        { err: error, projectDir },
        '[psf] could not remove generated schema files',
      );
    }
  }
}
