import type { PsBugReportCrashDetectedEvent } from '@palimpsest/core';
import type {
  PsDeepLinkPayload,
  PsNoteWindowMainAction,
  PsOnboardingToastPayload,
  PsUserConfigSnapshot,
} from '@palimpsest/core/desktop-bridge';
import type {
  PsDesktopConfig,
  PsLocalOpAuthEvent,
  PsLocalOpCloneEvent,
  PsMenuActionDispatch,
  PsPtyData,
  PsPtyExit,
  PsPtyNotice,
  PsRecentRemovedMissingInfo,
  PsServerRestartedInfo,
  PsServerVersionDriftInfo,
  PsShareReceivedPayload,
  PsUpdateRelaunchFailedInfo,
} from './bridge-contract.ts';
import type {
  McpWiringEditorDetection,
  McpWiringGlobalSkillDescriptor,
  McpWiringPathInstallDescriptor,
  OnboardingShowPayload,
} from './ipc-channels.ts';

export interface EventChannels {
  'ok:project:switching': { payload: { projectPath: string } };
  'ok:project:switched': { payload: PsDesktopConfig };
  'ok:project:recent-removed-missing': { payload: PsRecentRemovedMissingInfo };
  'ok:menu-action': { payload: PsMenuActionDispatch };
  'ok:note-window:main-action': { payload: PsNoteWindowMainAction };
  'ok:update:downloaded': { payload: { version: string | null } };
  'ok:update:relaunching': { payload: { version: string } };
  'ok:update:fetching-latest': { payload: { version: string } };
  'ok:update:relaunch-failed': { payload: PsUpdateRelaunchFailedInfo };
  'ok:update:whats-new': { payload: { version: string; releaseUrl: string } };
  'ok:update:whats-new-dismissed': { payload: { version: string } };
  'ok:update:stuck-hint': { payload: { downloadUrl: string } };
  'ok:update:manual-check': { payload: { phase: 'started' | 'settled' } };
  'ok:deep-link': { payload: PsDeepLinkPayload };
  'ok:share:received': { payload: PsShareReceivedPayload };
  'ok:mcp-wiring:show': {
    payload: {
      origin: 'first-run' | 'reconfigure';
      detectedEditors: readonly McpWiringEditorDetection[];
      pathInstall: McpWiringPathInstallDescriptor;
      globalSkills: readonly McpWiringGlobalSkillDescriptor[];
    };
  };
  'ok:onboarding:show': {
    payload: OnboardingShowPayload;
  };
  'ok:onboarding:toast': {
    payload: PsOnboardingToastPayload;
  };

  'ok:local-op:auth:event': {
    payload: { streamId: string; event: PsLocalOpAuthEvent };
  };
  'ok:local-op:clone:event': {
    payload: { streamId: string; event: PsLocalOpCloneEvent };
  };

  'ok:sidebar:expand-all': { payload: undefined };
  'ok:sidebar:collapse-all': { payload: undefined };

  'ok:server-version-drift': { payload: PsServerVersionDriftInfo };
  'ok:server-restarted': { payload: PsServerRestartedInfo };

  'ok:pty:data': { payload: PsPtyData };
  'ok:pty:exit': { payload: PsPtyExit };
  'ok:pty:notice': { payload: PsPtyNotice };
  'ok:accessibility:changed': { payload: { screenReaderActive: boolean } };
  'ok:bug-report:crash-detected': { payload: PsBugReportCrashDetectedEvent };
  'ok:user-config:changed': { payload: PsUserConfigSnapshot };
}
