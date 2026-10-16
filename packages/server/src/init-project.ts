import { existsSync, lstatSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  CONFIG_SCHEMA_MAJOR_PATH,
  LOCAL_DIR,
  PS_DIR,
  PS_LEGACY_MACHINE_LOCAL_ROOT_DIRS,
  PS_MACHINE_LOCAL_ROOT_FILES,
  WORKTREES_DIRNAME,
} from '@palimpsest/core';
import { atomicTempPath } from '@palimpsest/core/server';
import {
  tracedMkdirSync,
  tracedRenameSync,
  tracedRmSync,
  tracedWriteFileSync,
} from './fs-traced.ts';
import { assertSafeProjectRoot } from './home-project-root.ts';

export const CONFIG_FILENAME = 'config.yml';

export class SymlinkRefusedError extends Error {
  constructor(filePath: string, label: string) {
    super(
      `Refusing to follow symlink at ${label} (${filePath}). ` +
        `An untrusted upstream may have committed this symlink to redirect writes outside the project. ` +
        `Remove the symlink and re-run.`,
    );
    this.name = 'SymlinkRefusedError';
  }
}

export function assertNotSymlink(filePath: string, label: string): void {
  let lst: ReturnType<typeof lstatSync>;
  try {
    lst = lstatSync(filePath);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return;
    throw err;
  }
  if (lst.isSymbolicLink()) {
    throw new SymlinkRefusedError(filePath, label);
  }
}

export function packageVersionMajorMinor(version: string): string {
  const [rawMajor = '0', rawMinor = '0'] = version.split('.');
  const major = rawMajor.length > 0 ? rawMajor : '0';
  const minor = rawMinor.length > 0 ? rawMinor : '0';
  return `${major}.${minor}`;
}

function quoteYamlScalar(value: string): string {
  return /^[A-Za-z0-9._\-/]+$/.test(value) ? value : JSON.stringify(value);
}

export interface BuildConfigYmlOptions {
  contentDir?: string;
}

export function buildConfigYmlContent(_version: string, options?: BuildConfigYmlOptions): string {
  const template = `# yaml-language-server: $schema=https://unpkg.com/@palimpsest/cli@latest/dist/schemas/${CONFIG_SCHEMA_MAJOR_PATH}/config.project.schema.json
# Palimpsest — project configuration
#
# This file overrides built-in defaults for this project. Every key below
# is commented out and shows its current default value. Uncomment any key
# to override it.
#
# Precedence (lowest -> highest):
#   Built-in defaults
#     -> ~/${PS_DIR}/global.yml         (user defaults)
#     -> ./${PS_DIR}/config.yml         (this file)
#
# Schema reference: packages/core/src/config/schema.ts


# --- Content ---------------------------------------------------------------
# dir: where the CRDT editor reads/writes documents. Relative to the project
# root (the directory containing ${PS_DIR}/), NOT to this file.
#
# Path exclusions live in .psignore (gitignore syntax) at the project root,
# with nested .psignore files honored at any folder depth.
#
# content:
#   dir: .


# --- Suggested lifecycle (optional pattern) --------------------------------
# Projects that want an explicit knowledge-maturation flow can organize as
# three tiers *relative to the content directory* — create the subfolders
# only when you need them:
#
#   1. external-sources/  — raw content fetched from URLs, PDFs. No analysis,
#                           just preservation. Use the \`ingest\` MCP tool.
#   2. research/          — analysis and synthesis. Provisional findings,
#                           trade-offs, open questions. Use the \`research\`
#                           MCP tool.
#   3. articles/          — canonical knowledge. Use the \`consolidate\` MCP
#                           tool to promote research -> articles once
#                           decisions are made.
#
# This is a pattern, not a requirement. Projects with existing layouts
# (\`specs/\`, \`reports/\`, \`docs/\`, etc.) should use those; the lifecycle
# exists as mental scaffolding, not as enforced filesystem structure.


# --- Server ----------------------------------------------------------------
# Bind host: \`--bind\` flag, \`HOST\` env var, or the \`server.bind\` config key
# (default: 127.0.0.1; \`0.0.0.0\` binds LAN-visible and also needs
# \`server.allowExternal\`). Port: \`--port\` flag, \`PORT\` env var, or
# \`server.port\` (auto-allocated if unset). See the Configuration reference.


# --- Appearance ------------------------------------------------------------
# Theme for the chrome. Defaults UNSET so the existing localStorage cache
# (\`ps-theme-v1\`) keeps powering FOUC-free first paint until you
# explicitly write here.
#
# appearance:
#   theme: system            # 'light' | 'dark' | 'system'
`;
  const contentDir = options?.contentDir;
  if (contentDir === undefined || contentDir === '.') return template;
  return template.replace(
    '# content:\n#   dir: .',
    `content:\n  dir: ${quoteYamlScalar(contentDir)}`,
  );
}

function writeIfMissing(filePath: string, content: string, label: string): boolean {
  assertNotSymlink(filePath, label);
  if (existsSync(filePath)) return false;
  tracedWriteFileSync(filePath, content, 'utf-8');
  return true;
}

export function ensureGitignoreEntries(
  filePath: string,
  scaffoldContent: string,
  label = '.ps/.gitignore',
): 'created' | 'updated' | 'unchanged' {
  assertNotSymlink(filePath, label);
  if (!existsSync(filePath)) {
    tracedWriteFileSync(filePath, scaffoldContent, 'utf-8');
    return 'created';
  }
  const required = scaffoldContent
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'));
  const existing = readFileSync(filePath, 'utf-8');
  const present = new Set(existing.split('\n').map((l) => l.trim()));
  const missing = required.filter((l) => !present.has(l));
  if (missing.length === 0) return 'unchanged';
  const sep = existing.length === 0 || existing.endsWith('\n') ? '' : '\n';
  tracedWriteFileSync(filePath, `${existing}${sep}${missing.join('\n')}\n`, 'utf-8');
  return 'updated';
}

const RETIRED_PROJECT_SKILL_GITIGNORE_PATHS = [
  '.claude/skills/palimpsest/',
  '.cursor/skills/palimpsest/',
  '.codex/skills/palimpsest/',
  '.github/skills/palimpsest/',
  '.opencode/skills/palimpsest/',
  '.pi/skills/palimpsest/',
];

const RETIRED_PROJECT_SKILL_GITIGNORE_HEADER = [
  '# Palimpsest regenerates its built-in project skill on every open, and',
  '# different app builds version-stamp it differently. It is a per-machine',
  "# artifact — keep it out of git so teammates don't collide under auto-sync.",
];

export function removeProjectSkillGitignoreBlock(projectDir: string): 'removed' | 'unchanged' {
  const filePath = join(projectDir, '.gitignore');
  assertNotSymlink(filePath, '.gitignore');
  if (!existsSync(filePath)) return 'unchanged';
  const original = readFileSync(filePath, 'utf-8');
  const paths = new Set(RETIRED_PROJECT_SKILL_GITIGNORE_PATHS.map((p) => p.trim()));
  const lines = original.split('\n');
  if (!lines.some((l) => paths.has(l.trim()))) return 'unchanged';
  const header = new Set(RETIRED_PROJECT_SKILL_GITIGNORE_HEADER);
  const isBlank = (l: string): boolean => l.trim() === '';
  const kept: string[] = [];
  let atSeam = false;
  for (const line of lines) {
    if (paths.has(line.trim()) || header.has(line.trim())) {
      atSeam = true;
      continue;
    }
    if (atSeam && isBlank(line)) {
      const previous = kept[kept.length - 1];
      if (previous === undefined || isBlank(previous)) {
        atSeam = false;
        continue;
      }
    }
    atSeam = false;
    kept.push(line);
  }
  const next = kept.join('\n');
  const tmpPath = atomicTempPath(filePath);
  try {
    tracedWriteFileSync(tmpPath, next, 'utf-8');
    tracedRenameSync(tmpPath, filePath);
  } catch (err) {
    try {
      tracedRmSync(tmpPath, { force: true });
    } catch {}
    throw err;
  }
  return 'removed';
}

const PS_GITIGNORE_CONTENT = `# .ps/local/ holds per-machine runtime state. Anything inside is
# machine-local and never committed. New runtime files (caches, locks,
# manifests, telemetry, error logs) are auto-ignored — no edit needed here.
${LOCAL_DIR}/

# .ps/worktrees/ holds git worktrees created from the desktop worktree
# selector — per-machine checkouts, never committed (WORKTREES_PARENT_DIR in
# @palimpsest/core). Worktree creation also appends this path to
# .git/info/exclude so projects whose committed rule predates it stay clean.
${WORKTREES_DIRNAME}/

# Machine-local directories left behind by projects that predate .ps/local/.
# Nothing writes them anymore, but a project that has them keeps them until
# someone deletes them, so they stay ignored.
${PS_LEGACY_MACHINE_LOCAL_ROOT_DIRS.map((name) => `${name}/`).join('\n')}

# Per-machine runtime state at the .ps/ root. Contains PII (principal email,
# UUID), hostnames, and absolute filesystem paths — never commit. The only
# file at .ps/ root that SHOULD be committed is \`config.yml\` (project
# configuration), which is explicitly NOT in this ignore list.
${PS_MACHINE_LOCAL_ROOT_FILES.join('\n')}
`;

export const PS_OKIGNORE_TEMPLATE = `# .psignore — paths to exclude from the Palimpsest document index.
# Uses gitignore syntax (parsed by the \`ignore\` npm library), evaluated
# alongside .gitignore in a single ignore-lib instance.
#
# Patterns combine with .gitignore: an entry here adds to exclusions, and
# a leading \`!\` re-includes a file that .gitignore excluded.
# Nested .psignore files at any folder depth are honored (mirrors .gitignore).
#
# Examples:
#   drafts/        # exclude a directory
#   *.draft.md     # exclude files matching a pattern
#   !keep.md       # re-include a file .gitignore excluded
`;

export const ROOT_GITIGNORE_TEMPLATE = `# Seeded by Palimpsest when this project was created. Edit freely.
.DS_Store
.localized
Thumbs.db
thumbs.db
desktop.ini
Desktop.ini
.directory
`;

export interface InitContentOptions {
  contentDir?: string;
  packageVersion?: string;
}

export interface InitContentResult {
  created: string[];
  updated: string[];
  skipped: string[];
}

export function initContent(projectDir: string, options?: InitContentOptions): InitContentResult {
  assertSafeProjectRoot(projectDir);
  const psDir = resolve(projectDir, PS_DIR);
  const created: string[] = [];
  const updated: string[] = [];
  const skipped: string[] = [];

  assertNotSymlink(psDir, '.ps/');
  tracedMkdirSync(psDir, { recursive: true });

  const gitignoreAction = ensureGitignoreEntries(join(psDir, '.gitignore'), PS_GITIGNORE_CONTENT);
  if (gitignoreAction === 'created') {
    created.push('.gitignore');
  } else if (gitignoreAction === 'updated') {
    updated.push('.gitignore');
  } else {
    skipped.push('.gitignore');
  }

  if (
    writeIfMissing(
      join(psDir, CONFIG_FILENAME),
      buildConfigYmlContent(options?.packageVersion ?? '0.0.0', {
        contentDir: options?.contentDir,
      }),
      `.ps/${CONFIG_FILENAME}`,
    )
  ) {
    created.push(CONFIG_FILENAME);
  } else {
    skipped.push(CONFIG_FILENAME);
  }

  if (writeIfMissing(join(projectDir, '.psignore'), PS_OKIGNORE_TEMPLATE, '.psignore')) {
    created.push('.psignore');
  } else {
    skipped.push('.psignore');
  }

  return { created, updated, skipped };
}

export function writeRootGitignoreForNewRepo(projectDir: string): 'created' | 'skipped' {
  return writeIfMissing(join(projectDir, '.gitignore'), ROOT_GITIGNORE_TEMPLATE, '.gitignore')
    ? 'created'
    : 'skipped';
}
