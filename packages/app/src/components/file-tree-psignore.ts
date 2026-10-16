interface PsignoreFileTreeTarget {
  kind: 'file' | 'folder';
  path: string;
  docExt?: string;
}

function escapeGitignoreLiteral(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\[/g, '\\[').replace(/\]/g, '\\]').replace(/\*/g, '\\*');
}

export function buildPsignorePatternFromTarget(target: PsignoreFileTreeTarget): string {
  const path = escapeGitignoreLiteral(target.path);
  if (target.kind === 'folder') {
    return `/${path}/`;
  }
  const ext = target.docExt ?? '.md';
  return `/${path}${ext}`;
}
