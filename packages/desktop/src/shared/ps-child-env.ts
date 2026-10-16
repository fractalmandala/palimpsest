import { homedir } from 'node:os';
import {
  envWithoutDevChannel,
  PS_DESKTOP_TERMINAL_ENV,
  PS_HOSTED_AGENT_ENV,
  posixPsManagedBinDir,
} from '@palimpsest/core';
import { windowsPathKey } from './windows-env.ts';

const STRIPPED_ENV_MARKERS = [
  'PS_ELECTRON_PROTOCOL_HOST',
  'PS_LOCK_KIND',
  'ELECTRON_RUN_AS_NODE',
  PS_DESKTOP_TERMINAL_ENV,
  PS_HOSTED_AGENT_ENV,
] as const;

export interface PsManagedBinDirsOptions {
  readonly platform: NodeJS.Platform;
  readonly home?: string | undefined;
  readonly cliBinDir?: string | undefined;
}

export function psPackagedCliBinDir(
  platform: NodeJS.Platform,
  resourcesPath: string | undefined,
): string | undefined {
  if (platform !== 'win32' || !resourcesPath) return undefined;
  return `${resourcesPath}\\cli\\bin`;
}

export function psChildHome(parentEnv: Record<string, string | undefined>): string | undefined {
  if (parentEnv.HOME) return parentEnv.HOME;
  try {
    return homedir() || undefined;
  } catch {
    return undefined;
  }
}

export function psChildEnvOptions(
  parentEnv: Record<string, string | undefined>,
  overrides: { platform?: NodeJS.Platform; cliBinDir?: string } = {},
): PsManagedBinDirsOptions {
  return {
    platform: overrides.platform ?? process.platform,
    home: psChildHome(parentEnv),
    cliBinDir: overrides.cliBinDir,
  };
}

export function psChildEnvOptionsFromProcess(): PsManagedBinDirsOptions {
  return psChildEnvOptions(process.env, {
    cliBinDir: psPackagedCliBinDir(process.platform, process.resourcesPath),
  });
}

export function psManagedBinDirs(options: PsManagedBinDirsOptions): readonly string[] {
  if (options.platform === 'win32') return options.cliBinDir ? [options.cliBinDir] : [];
  return options.home ? [posixPsManagedBinDir(options.home)] : [];
}

export function hasNoResolvablePsHome(options: PsManagedBinDirsOptions): boolean {
  return options.platform !== 'win32' && !options.home;
}

export function psPathDelimiter(platform: NodeJS.Platform): string {
  return platform === 'win32' ? ';' : ':';
}

function entryMatchesDir(entry: string, dir: string, platform: NodeJS.Platform): boolean {
  return platform === 'win32' ? entry.toLowerCase() === dir.toLowerCase() : entry === dir;
}

export function psChildPathEntries(
  env: Record<string, string | undefined>,
  options: PsManagedBinDirsOptions,
): readonly string[] {
  return (env[windowsPathKey(env)] ?? '').split(psPathDelimiter(options.platform)).filter(Boolean);
}

export function hasPsManagedBinDirsOnPath(
  env: Record<string, string | undefined>,
  options: PsManagedBinDirsOptions,
): boolean {
  const dirs = psManagedBinDirs(options);
  if (dirs.length === 0) return false;
  const entries = psChildPathEntries(env, options);
  return dirs.every((dir) =>
    entries.some((entry) => entryMatchesDir(entry, dir, options.platform)),
  );
}

function prependPsManagedBinDirs(
  env: Record<string, string>,
  options: PsManagedBinDirsOptions,
): Record<string, string> {
  const entries = psChildPathEntries(env, options);
  const additions = psManagedBinDirs(options).filter(
    (dir) => !entries.some((entry) => entryMatchesDir(entry, dir, options.platform)),
  );
  if (additions.length === 0) return { ...env };
  const joined = [...additions, ...entries].join(psPathDelimiter(options.platform));
  return { ...env, [windowsPathKey(env)]: joined };
}

export function composePsChildEnv(
  parentEnv: Record<string, string | undefined>,
  options: PsManagedBinDirsOptions,
): Record<string, string> {
  const stripped = new Set<string>(STRIPPED_ENV_MARKERS);
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(envWithoutDevChannel(parentEnv))) {
    if (stripped.has(key) || key.startsWith('GDK_PIXBUF_')) continue;
    out[key] = value;
  }
  return prependPsManagedBinDirs(out, options);
}
