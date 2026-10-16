import type { CreateNewBannerKind } from '@palimpsest/core';
import { withSpanSync } from '@palimpsest/server';
import type { EntryPoint } from '../shared/entry-point.ts';
import type { HandoffOutcome } from './share-handoff.ts';

export type OnboardingFlowKind =
  | 'managed-promote'
  | 'managed-promote-cancelled'
  | 'managed-direct'
  | 'fresh-default'
  | 'fresh-customized'
  | 'create-new-default'
  | 'create-new-customized'
  | 'cancel';

interface OnboardingTelemetryAttributes {
  flowKind: OnboardingFlowKind;
  entryPoint: EntryPoint;
  gitInitRequested: boolean;
  contentDirChanged: boolean;
  warningsCount: number;
  failedCount?: number;
}

const WARNINGS_COUNT_CAP = 8;
const FAILED_COUNT_CAP = 10;

export function recordCreateNewBannerShown(banner: CreateNewBannerKind): void {
  withSpanSync(
    'ps.desktop.createNewBannerShown',
    {
      attributes: {
        'ps.desktop.banner': banner,
      },
    },
    () => undefined,
  );
}

export type FirstRunHandoffOutcome = HandoffOutcome;

export function recordFirstRunShareHandoff(outcome: FirstRunHandoffOutcome): void {
  withSpanSync(
    'ps.desktop.firstRunShareHandoff',
    {
      attributes: {
        'ps.desktop.handoff_outcome': outcome,
      },
    },
    () => undefined,
  );
}

export function recordOnboardingFlow(attrs: OnboardingTelemetryAttributes): void {
  withSpanSync(
    'ps.desktop.onboardingConsent',
    {
      attributes: {
        'ps.desktop.flow_kind': attrs.flowKind,
        'ps.desktop.entry_point': attrs.entryPoint,
        'ps.desktop.git_init_requested': attrs.gitInitRequested,
        'ps.desktop.content_dir_changed': attrs.contentDirChanged,
        'ps.desktop.warnings_count': Math.min(
          Math.max(0, Math.trunc(attrs.warningsCount)),
          WARNINGS_COUNT_CAP,
        ),
        'ps.desktop.ai_integrations_failed_count': Math.min(
          Math.max(0, Math.trunc(attrs.failedCount ?? 0)),
          FAILED_COUNT_CAP,
        ),
      },
    },
    () => undefined,
  );
}
