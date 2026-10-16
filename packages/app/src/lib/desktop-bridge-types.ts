import type {
  PsCheckTargetExistsResult,
  PsDesktopBridge,
  PsHeadBranchInfo,
  ShareTarget,
} from '@palimpsest/core/desktop-bridge';

export type * from '@palimpsest/core/desktop-bridge';

export type CheckTargetExistsResult = PsCheckTargetExistsResult;
export type HeadBranchInfo = PsHeadBranchInfo;

export function shareTargetPath(target: ShareTarget): string {
  return target.kind === 'doc' ? target.docPath : target.folderPath;
}

declare global {
  interface Window {
    psDesktop?: PsDesktopBridge;
  }
}
