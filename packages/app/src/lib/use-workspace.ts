import { WorkspaceSuccessSchema } from '@palimpsest/core/schemas/api';
import { useEffect, useState } from 'react';
import type { Workspace } from './workspace-paths';

export function useWorkspace(): Workspace | null {
  const [workspace, setWorkspace] = useState<Workspace | null>(() => resolveSyncWorkspace());

  useEffect(() => {
    if (workspace !== null) return;
    if (window.psDesktop) return;

    let active = true;
    fetch('/api/workspace')
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!active) return;
        if (!res.ok) return;
        const parsed = WorkspaceSuccessSchema.safeParse(data);
        if (!parsed.success) return;
        setWorkspace({
          contentDir: parsed.data.contentDir,
          pathSeparator: parsed.data.pathSeparator,
        });
      })
      .catch((err) => {
        console.warn('[useWorkspace] /api/workspace fetch failed:', err);
      });
    return () => {
      active = false;
    };
  }, [workspace]);

  return workspace;
}

export function resolveSyncWorkspace(
  windowLike: Window | undefined = typeof window === 'undefined' ? undefined : window,
): Workspace | null {
  if (!windowLike) return null;
  const psDesktop = windowLike.psDesktop;
  if (!psDesktop) return null;
  return {
    contentDir: psDesktop.config.projectPath,
    pathSeparator: psDesktop.platform === 'win32' ? '\\' : '/',
  };
}
