import { currentDesktopProduct, userHomeDisplayPath } from './product.ts';

export const PS_DIR = '.ps';

export const PS_PROJECT_MARKER = '.ps/config.yml';

export const LOCAL_DIR = 'local';

export const WORKTREES_DIRNAME = 'worktrees';

export const SAVED_THEMES_DIRNAME = 'themes';

export const PS_BIN_DIRNAME = 'bin';

export const PS_MACHINE_LOCAL_ROOT_FILES = [
  'principal.json',
  'state.json',
  'server.lock',
  'ui.lock',
  'sync-state.json',
  'conflicts.json',
  'last-spawn-error.log',
] as const;

export const PS_USER_HOME_AUTH_FILE = 'auth.yml';

export const PS_USER_HOME_SECRETS_FILE = 'secrets.yml';

export const PS_USER_HOME_CREDENTIAL_FILES = [
  PS_USER_HOME_AUTH_FILE,
  PS_USER_HOME_SECRETS_FILE,
] as const;

export const PS_ACTIVE_MACHINE_LOCAL_ROOT_DIRS = [LOCAL_DIR, WORKTREES_DIRNAME] as const;

export const PS_MACHINE_LOCAL_ROOT_DIRS = [
  ...PS_ACTIVE_MACHINE_LOCAL_ROOT_DIRS,
  'cache',
  'tmp',
] as const;

export type PsMachineLocalRootDir = (typeof PS_MACHINE_LOCAL_ROOT_DIRS)[number];

export type PsMachineLocalRootFile = (typeof PS_MACHINE_LOCAL_ROOT_FILES)[number];

const activeMachineLocalRootDirs: ReadonlySet<string> = new Set(PS_ACTIVE_MACHINE_LOCAL_ROOT_DIRS);

export const PS_LEGACY_MACHINE_LOCAL_ROOT_DIRS: readonly PsMachineLocalRootDir[] =
  PS_MACHINE_LOCAL_ROOT_DIRS.filter((name) => !activeMachineLocalRootDirs.has(name));

export function posixPsManagedBinDir(
  homeDir: string,
  userHomeDirName: string = currentDesktopProduct().userHomeDirName,
): string {
  const base = homeDir.replace(/\/+/g, '/').replace(/\/+$/, '');
  return `${base}/${userHomeDirName}/${PS_BIN_DIRNAME}`;
}

export function psUserHomeDisplayPath(...segments: string[]): string {
  return userHomeDisplayPath(currentDesktopProduct(), ...segments);
}
