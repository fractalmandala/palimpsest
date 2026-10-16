import type {
  PsCheckTargetExistsResult,
  PsDesktopBridge,
  PsHeadBranchInfo,
  PsSeedApplyOptions,
  PsSeedPlanOptions,
} from '@palimpsest/core/desktop-bridge';

export type * from '@palimpsest/core/desktop-bridge';

export type CheckTargetExistsResult = PsCheckTargetExistsResult;
export type HeadBranchInfo = PsHeadBranchInfo;
export type SeedPlanOptions = PsSeedPlanOptions;
export type SeedApplyOptions = PsSeedApplyOptions;

declare global {
  interface Window {
    psDesktop?: PsDesktopBridge;
  }
}
