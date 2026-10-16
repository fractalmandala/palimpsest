import type { PsMenuActionOrigin, PsMenuDispatchRequest } from '../shared/bridge-contract.ts';

interface MenuActionTargetDeps<TSender, TWindow> {
  fromWebContents: (sender: TSender) => TWindow | null;
  getFocusedWindow: () => TWindow | null;
  getAllWindows: () => readonly TWindow[];
}

export function resolveMenuActionTarget<TSender, TWindow>(
  sender: TSender | null,
  deps: MenuActionTargetDeps<TSender, TWindow>,
): TWindow | null {
  if (sender != null) {
    const senderWindow = deps.fromWebContents(sender);
    if (senderWindow != null) return senderWindow;
  }
  return deps.getFocusedWindow() ?? deps.getAllWindows()[0] ?? null;
}

export const LAUNCHER_FREE_ORIGIN: PsMenuActionOrigin = Object.freeze({ launcherBorne: false });

export const LAUNCHER_BORNE_ORIGIN: PsMenuActionOrigin = Object.freeze({ launcherBorne: true });

const ORIGIN_BY_DISPATCH_KIND = {
  query: LAUNCHER_FREE_ORIGIN,
  'menu-action': LAUNCHER_BORNE_ORIGIN,
  command: LAUNCHER_FREE_ORIGIN,
  'open-recent-project': LAUNCHER_FREE_ORIGIN,
  role: LAUNCHER_FREE_ORIGIN,
  'spelling-languages-query': LAUNCHER_FREE_ORIGIN,
  'spelling-languages-set': LAUNCHER_FREE_ORIGIN,
  'spellcheck-enabled-set': LAUNCHER_FREE_ORIGIN,
} satisfies Record<PsMenuDispatchRequest['kind'], PsMenuActionOrigin>;

export const MENU_DISPATCH_KINDS = Object.keys(
  ORIGIN_BY_DISPATCH_KIND,
) as PsMenuDispatchRequest['kind'][];

export function originForMenuDispatch(kind: PsMenuDispatchRequest['kind']): PsMenuActionOrigin {
  return ORIGIN_BY_DISPATCH_KIND[kind];
}
