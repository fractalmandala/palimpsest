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
  'ps:project:switching': { payload: { projectPath: string } };
  'ps:project:switched': { payload: PsDesktopConfig };
  'ps:project:recent-removed-missing': { payload: PsRecentRemovedMissingInfo };
  'ps:menu-action': { payload: PsMenuActionDispatch };
  'ps:note-window:main-action': { payload: PsNoteWindowMainAction };
  'ps:update:downloaded': { payload: { version: string | null } };
  'ps:update:relaunching': { payload: { version: string } };
  'ps:update:fetching-latest': { payload: { version: string } };
  'ps:update:relaunch-failed': { payload: PsUpdateRelaunchFailedInfo };
  'ps:update:whats-new': { payload: { version: string; releaseUrl: string } };
  'ps:update:whats-new-dismissed': { payload: { version: string } };
  'ps:update:stuck-hint': { payload: { downloadUrl: string } };
  'ps:update:manual-check': { payload: { phase: 'started' | 'settled' } };
  'ps:deep-link': { payload: PsDeepLinkPayload };
  'ps:share:received': { payload: PsShareReceivedPayload };
  'ps:mcp-wiring:show': {
    payload: {
      origin: 'first-run' | 'reconfigure';
      detectedEditors: readonly McpWiringEditorDetection[];
      pathInstall: McpWiringPathInstallDescriptor;
      globalSkills: readonly McpWiringGlobalSkillDescriptor[];
    };
  };
  'ps:onboarding:show': {
    payload: OnboardingShowPayload;
  };
  'ps:onboarding:toast': {
    payload: PsOnboardingToastPayload;
  };

  'ps:local-op:auth:event': {
    payload: { streamId: string; event: PsLocalOpAuthEvent };
  };
  'ps:local-op:clone:event': {
    payload: { streamId: string; event: PsLocalOpCloneEvent };
  };

  'ps:sidebar:expand-all': { payload: undefined };
  'ps:sidebar:collapse-all': { payload: undefined };

  'ps:server-version-drift': { payload: PsServerVersionDriftInfo };
  'ps:server-restarted': { payload: PsServerRestartedInfo };

  'ps:pty:data': { payload: PsPtyData };
  'ps:pty:exit': { payload: PsPtyExit };
  'ps:pty:notice': { payload: PsPtyNotice };
  'ps:accessibility:changed': { payload: { screenReaderActive: boolean } };
  'ps:bug-report:crash-detected': { payload: PsBugReportCrashDetectedEvent };
  'ps:user-config:changed': { payload: PsUserConfigSnapshot };
}
