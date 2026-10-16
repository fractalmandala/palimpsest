import { useLingui } from '@lingui/react/macro';

export function useBuiltinSkillBlurb(): (idOrName: string) => string | null {
  const { t } = useLingui();
  return (idOrName: string): string | null => {
    switch (idOrName) {
      case 'discovery':
      case 'palimpsest-discovery':
        return t`How to set up new projects with Palimpsest.`;
      case 'write-skill':
      case 'palimpsest-write-skill':
        return t`How to write a new skill and install it.`;
      case 'project':
      case 'palimpsest':
        return t`How to use Palimpsest and its MCP tools.`;
      default:
        return null;
    }
  };
}

export function builtinBundleDir(absolutePath: string | undefined): string | null {
  if (!absolutePath) return null;
  const cut = Math.max(absolutePath.lastIndexOf('/'), absolutePath.lastIndexOf('\\'));
  return cut > 0 ? absolutePath.slice(0, cut) : null;
}
