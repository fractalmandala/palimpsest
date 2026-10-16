import {
  addPsPathsToGitExclude,
  getExcludedPsPaths,
  getPsArtifactPaths,
  probeTrackedPsPaths,
  readSharingMode,
  removePsPathsFromGitExclude,
  type SharingMode,
} from '@palimpsest/cli';

export interface SharingStatusResult {
  kind: 'status';
  mode: SharingMode;
  excluded: string[];
  trackedUpstream: string[];
}

export type SharingSetModeResult =
  | { kind: 'applied'; mode: SharingMode }
  | { kind: 'refused-tracked'; tracked: string[]; remediation: string }
  | {
      kind: 'no-exclude';
      reason: 'no-git' | 'no-info-dir' | 'malformed-pointer' | 'inaccessible';
    };

export function handleSharingStatus(projectPath: string): SharingStatusResult {
  try {
    const mode = readSharingMode(projectPath);
    const excluded = [...getExcludedPsPaths(projectPath)];
    const trackedUpstream = probeTrackedPsPaths(
      projectPath,
      getPsArtifactPaths(projectPath),
    ).tracked;
    return { kind: 'status', mode, excluded, trackedUpstream };
  } catch {
    return {
      kind: 'status',
      mode: 'no-git',
      excluded: [],
      trackedUpstream: [],
    };
  }
}

export function handleSharingSetMode(
  projectPath: string,
  mode: 'shared' | 'local-only',
): SharingSetModeResult {
  const paths = getPsArtifactPaths(projectPath);
  if (mode === 'local-only') {
    const result = addPsPathsToGitExclude(projectPath, paths);
    if (result.kind === 'refused-tracked') {
      return {
        kind: 'refused-tracked',
        tracked: [...result.tracked],
        remediation: result.remediation,
      };
    }
    if (result.kind === 'no-exclude') {
      return { kind: 'no-exclude', reason: result.reason };
    }
    return { kind: 'applied', mode: readSharingMode(projectPath) };
  }
  const result = removePsPathsFromGitExclude(projectPath, paths);
  if (result.kind === 'no-exclude') {
    return { kind: 'no-exclude', reason: result.reason };
  }
  return { kind: 'applied', mode: readSharingMode(projectPath) };
}
