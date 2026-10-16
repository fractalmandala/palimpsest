import type { ApplyReport } from './agent-registry/apply.ts';
import type { HandoffHostPlatform } from './agent-registry/schema.ts';
import type { HostSnapshot } from './agent-registry/snapshot.ts';
import type { ConfigValidationError } from './config/errors.ts';
import type { ConfigPatch } from './config/schema.ts';
import type { CreateNewBannerKind } from './constants/create-new-banner.ts';
import type { EditorId } from './constants/editors.ts';
import type { PsFolderState } from './constants/folder-state.ts';
import type {
  WorktreeInventoryOpenRequest,
  WorktreeInventoryOpenResult,
  WorktreeInventoryRequest,
  WorktreeInventoryResult,
} from './git/worktree-inventory-model.ts';
import type {
  WorktreeCreateRequest,
  WorktreeCreateResult,
  WorktreeListResult,
} from './git/worktree-selector-model.ts';
import type {
  TerminalCli,
  TerminalLaunchCommand,
  WindowsShellFamily,
  WindowsShellLaunchFailureReason,
} from './handoff/terminal-launch.ts';
import type { HandoffFailureReason, HandoffScope } from './handoff/types.ts';
import type { LanguagePreference } from './i18n/locales.ts';
import type {
  PsBugReportCrashAckResult,
  PsBugReportCrashDetectedEvent,
  PsBugReportCrashDumpAvailability,
  PsBugReportCreateResult,
  PsBugReportDeleteResult,
  PsBugReportListResult,
  PsBugReportScreenshot,
  PsBugReportSendMetadata,
  PsBugReportSendResult,
  PsImageAttachmentContentType,
  ReportBundleLevel,
} from './logger-types.ts';
import type { LintPluginId } from './markdown/lint/types.ts';
import type { LocalOpOkInitResponse } from './schemas/api/local-op.ts';
import type {
  BranchInfoResponse,
  CheckoutResponse,
  ShareTargetStatusResponse,
} from './schemas/api/share.ts';
import type { RecentProjectEntry } from './sharing/index.ts';
import type { SkillCostTiers } from './skills-catalog/skill-cost.ts';
import type { TerminalPlacement } from './terminal-layout.ts';

export type { PsFolderState } from './constants/folder-state.ts';
export type { BridgeWorktreeEntry } from './git/worktree-list-parser.ts';
export type { RecentProjectEntry } from './sharing/index.ts';
export type { TerminalPlacement } from './terminal-layout.ts';

export interface PsTerminalRestartTab {
  ordinal: number;
  customLabel: string | null;
}

export interface PsTerminalRestartSnapshot {
  tabs: PsTerminalRestartTab[];
  activeOrdinal: number | null;
}

export interface PsTerminalDockState {
  terminalVisible: boolean;
  agentPanelVisible: boolean;
  editorVisible?: boolean;
  terminal?: { order: string[]; activeKey: string | null };
  terminalSnapshot?: PsTerminalRestartSnapshot;
  agents?: { order: string[]; activeKey: string | null };
}

export type PsNoteWindowMainAction =
  | {
      readonly kind: 'active-input';
      readonly text: string;
      readonly newTab: boolean;
      readonly submit: boolean;
      readonly target?: 'agents';
    }
  | {
      readonly kind: 'agent-thread';
      readonly agentSource: 'registry' | 'custom';
      readonly agentId: string;
      readonly prompt: string | null;
      readonly docName: string | null;
      readonly titleHint: string | null;
    }
  | {
      readonly kind: 'terminal-launch';
      readonly prompt: string;
      readonly cli: TerminalCli;
      readonly stage: boolean;
    }
  | {
      readonly kind: 'reveal-comments';
      readonly docName: string;
      readonly scope: 'doc' | 'queue';
    };

export type PsNoteWindowMainActionResult =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly reason: 'invalid-action' | 'not-note-window' | 'project-not-open';
    };

export type PsTerminalDockStateUpdate =
  | {
      surface: 'terminal';
      order: string[];
      activeKey: string | null;
      terminalSnapshot: PsTerminalRestartSnapshot;
    }
  | {
      surface: 'agents';
      order: string[];
      activeKey: string | null;
    };

export type PsTerminalDockStateWriteResult =
  | { ok: true }
  | {
      ok: false;
      reason: 'invalid-request' | 'no-window-context' | 'persist-failed' | 'ipc-unavailable';
    };

export type PsDesktopMode = 'editor' | 'navigator' | 'terminal' | 'note';

export interface PsDesktopConfig {
  readonly collabUrl: string;
  readonly apiOrigin: string;
  readonly projectPath: string;
  readonly projectName: string;
  readonly mode: PsDesktopMode;
  readonly e2eSmoke: boolean;
  readonly singleFile: boolean;
  readonly initialDoc: string | null;
  readonly freshlyCreated: boolean;
  readonly startupTraceparent?: string;
  readonly ptyAvailable: boolean;
  readonly languagePreference?: LanguagePreference;
  readonly themePreference?: PsThemeSource;
}

export type PsMenuAction =
  | 'new-doc'
  | 'new-folder'
  | 'new-project'
  | 'rename'
  | 'delete'
  | 'close-active-tab-or-window'
  | 'toggle-sidebar'
  | 'toggle-source'
  | 'save-version'
  | 'version-history'
  | 'focus-search'
  | 'focus-command-palette'
  | 'navigate-back'
  | 'navigate-forward'
  | 'new-from-template'
  | 'duplicate'
  | 'move-to-trash'
  | 'reveal-in-finder'
  | 'send-to-ai'
  | 'copy-full-path'
  | 'copy-relative-path'
  | 'toggle-show-hidden-files'
  | 'toggle-show-ps-folders'
  | 'toggle-show-only-markdown-files'
  | 'toggle-show-skills-section'
  | 'expand-all-tree'
  | 'collapse-all-tree'
  | 'toggle-doc-panel'
  | 'toggle-terminal'
  | 'move-terminal'
  | 'toggle-agent-panel'
  | 'toggle-editor'
  | 'new-terminal'
  | 'kill-terminal'
  | 'new-worktree'
  | 'switch-worktree'
  | 'report-bug'
  | 'send-feedback';

export interface PsMenuActionOrigin {
  readonly launcherBorne: boolean;
}

export interface PsMenuActionDispatch {
  readonly action: PsMenuAction;
  readonly origin: PsMenuActionOrigin;
}

export type PsUnsubscribe = () => void;

export interface PersistedEditorPane {
  id: string;
  openTabs: string[];
  pinnedTabIds: string[];
  activeTabId: string | null;
  size: number;
}

export interface ProjectSessionState {
  updatedAt: string | null;
  panes: PersistedEditorPane[];
  focusedPaneId: string;
}

export type PsProjectEntryPoint =
  | 'create-new'
  | 'create-new-nested-redirect'
  | 'pick-existing'
  | 'recents'
  | 'deep-link'
  | 'drag-drop'
  | 'share-receive'
  | 'worktree';

export interface PsProjectOpenRequest {
  path: string;
  target: 'new-window';
  entryPoint: PsProjectEntryPoint;
  requireExactManagedProject?: boolean;
  pendingDeepLinkTarget?: {
    kind: 'doc' | 'folder';
    path: string;
    repositoryPath?: string;
    contentRootDepth?: number;
  };
  pendingBranch?: string | null;
  pendingShareBranchSwitch?: {
    share: PsSharePayloadFields;
    projectPath: string;
    currentBranch: string | null;
  };
}

export type PsCheckTargetExistsResult = 'exists' | 'missing' | 'unreadable';

export interface PsHeadBranchInfo {
  readonly currentBranch: string | null;
  readonly headSha: string | null;
  readonly detached: boolean;
}

export interface PsUpdateDownloadedInfo {
  readonly version: string | null;
}

export interface PsUpdateRelaunchingInfo {
  readonly version: string;
}

export interface PsUpdateFetchingLatestInfo {
  readonly version: string;
}

export interface PsUpdateRelaunchFailedInfo {
  readonly version: string;
  readonly message?: string;
  readonly downloadUrl?: string;
  readonly dismissPending?: boolean;
  readonly reason?: 'no-longer-pending';
}

export interface PsWhatsNewInfo {
  readonly version: string;
  readonly releaseUrl: string;
}

export interface PsUpdateStuckHintInfo {
  readonly downloadUrl: string;
}

export interface PsUpdateManualCheckInfo {
  readonly phase: 'started' | 'settled';
}

export interface PsAboutInfo {
  readonly productName: string;
  readonly version: string;
  readonly releasesUrl: string;
  readonly releaseNotesUrl: string;
  readonly updateChecks: 'available' | 'unavailable';
}

export type ShareTarget =
  | { readonly kind: 'doc'; readonly docPath: string }
  | { readonly kind: 'folder'; readonly folderPath: string };

export interface PsSharePayloadFields {
  readonly host: string;
  readonly owner: string;
  readonly repo: string;
  readonly branch: string;
  readonly sharedUrl: string;
  readonly repositoryTarget: ShareTarget;
  readonly contentRootDepth: number | null;
  readonly target: ShareTarget;
}

export type PsShareReceivedPayload =
  | { readonly kind: 'unsupported-version' }
  | { readonly kind: 'invalid' }
  | {
      readonly kind: 'project-branch-switch';
      readonly share: PsSharePayloadFields;
      readonly projectPath: string;
      readonly currentBranch: string | null;
    }
  | {
      readonly kind: 'launcher-consent';
      readonly share: PsSharePayloadFields;
      readonly candidatePath: string;
      readonly parentProjectName: string | null;
    }
  | {
      readonly kind: 'launcher-miss';
      readonly share: PsSharePayloadFields;
    };

export type ShareFolderValidationResult =
  | { readonly kind: 'ok'; readonly gitRemoteUrl: string }
  | { readonly kind: 'not-git' }
  | { readonly kind: 'no-origin' }
  | { readonly kind: 'wrong-repo'; readonly actualOwner: string; readonly actualRepo: string }
  | { readonly kind: 'wrong-host'; readonly actualHost: string }
  | { readonly kind: 'non-github' }
  | { readonly kind: 'symlink-escape' };

export type PsUpdateChannel = 'latest' | 'beta';

export type PsUpdateMode = 'auto' | 'off';

export type PsThemeSource = 'system' | 'light' | 'dark';

export interface PsUserConfigSnapshot {
  readonly text: string;
}

export type PsUserConfigPatchResult =
  | { readonly ok: true; readonly text: string }
  | { readonly ok: false; readonly error: ConfigValidationError };

export interface PsUserConfigBridge {
  read(): Promise<PsUserConfigSnapshot>;
  patch(patch: ConfigPatch): Promise<PsUserConfigPatchResult>;
  onChanged(cb: (snapshot: PsUserConfigSnapshot) => void): PsUnsubscribe;
}

export interface PsChromeColors {
  bg: string;
  symbol: string;
}

export interface PsStateSnapshot {
  readonly channel: PsUpdateChannel;
  readonly schemaIncompatibility: {
    readonly currentBuild: string;
    readonly persistedSchemaVersion: number;
    readonly maxSupported: number;
  } | null;
  readonly about?: PsAboutInfo;
  readonly updateMode?: PsUpdateMode;
}

export type PsMcpWiringEditorId = EditorId;

export interface PsMcpWiringShowPayload {
  readonly origin: 'first-run' | 'reconfigure';
  readonly detectedEditors: readonly {
    readonly id: PsMcpWiringEditorId;
    readonly label: string;
    readonly detected: boolean;
    readonly willReplace: boolean;
    readonly configPath: string | null;
    readonly entryLocator: string;
  }[];
  readonly pathInstall: {
    readonly shellDetected: boolean;
    readonly rcFilesToTouch: readonly string[];
    readonly alreadyInstalled: boolean;
  };
  readonly globalSkills: readonly {
    readonly id: string;
    readonly name: string;
    readonly paths: readonly string[];
  }[];
}

export interface PsMcpWiringConfirmRequest {
  readonly editorIds: readonly PsMcpWiringEditorId[];
  readonly pathInstall?: boolean;
  readonly skills?: readonly string[];
}

export type PsMcpWiringResult = { ok: true } | { ok: false; error: string };

export type PsIntegrationsEditorState = 'installed' | 'not-installed' | 'foreign' | 'unmanageable';

export interface PsIntegrationsStatus {
  readonly available: boolean;
  readonly editors: readonly {
    readonly id: PsMcpWiringEditorId;
    readonly label: string;
    readonly detected: boolean;
    readonly state: PsIntegrationsEditorState;
    readonly configPath: string | null;
    readonly entryLocator: string;
  }[];
  readonly path: {
    readonly shellDetected: boolean;
    readonly rcFilesToTouch: readonly string[];
    readonly installed: boolean;
  };
  readonly skills: readonly {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly installed: boolean;
    readonly onboarding: boolean;
    readonly paths: readonly string[];
    readonly size?: SkillCostTiers;
    readonly sourceDir: string;
    readonly resolvedHosts: readonly {
      readonly editor: string;
      readonly skillsRoot: string;
      readonly custom: boolean;
    }[];
  }[];
  readonly detectedEditorIds: readonly PsMcpWiringEditorId[];
}

export interface PsIntegrationsSetRequest {
  readonly component:
    | { readonly kind: 'editor'; readonly id: PsMcpWiringEditorId }
    | { readonly kind: 'path' }
    | { readonly kind: 'skill'; readonly id: string };
  readonly enabled: boolean;
}

export type PsIntegrationsSetResult =
  | { readonly ok: true; readonly status: PsIntegrationsStatus }
  | { readonly ok: false; readonly error: string; readonly status: PsIntegrationsStatus };

export interface PsProjectIntegrationsStatus {
  readonly available: boolean;
  readonly hasProject: boolean;
  readonly projectDir: string | null;
  readonly editors: readonly {
    readonly id: PsMcpWiringEditorId;
    readonly label: string;
    readonly detected: boolean;
    readonly state: PsIntegrationsEditorState;
    readonly configPath: string;
    readonly entryLocator: string;
  }[];
  readonly skill: {
    readonly installed: boolean;
    readonly paths: readonly string[];
    readonly description: string;
    readonly hosts: readonly string[];
    readonly size?: SkillCostTiers;
    readonly sourceDir?: string;
  } | null;
}

export interface PsProjectIntegrationsSetRequest {
  readonly component:
    | { readonly kind: 'editor'; readonly id: PsMcpWiringEditorId }
    | { readonly kind: 'skill' };
  readonly enabled: boolean;
}

export type PsProjectIntegrationsSetResult =
  | { readonly ok: true; readonly status: PsProjectIntegrationsStatus }
  | { readonly ok: false; readonly error: string; readonly status: PsProjectIntegrationsStatus };

export interface PsAgentIntegrationsIntent {
  readonly satisfierId: string;
  readonly desired: 'present' | 'absent';
}

export interface PsAgentIntegrationsApplyRequest {
  readonly intents: readonly PsAgentIntegrationsIntent[];
}

export type PsAgentIntegrationsApplyResult =
  | {
      readonly ok: true;
      readonly report: ApplyReport;
      readonly snapshot: HostSnapshot;
    }
  | {
      readonly ok: false;
      readonly error: string;
      readonly unavailable?: boolean;
      readonly devBuild?: boolean;
      readonly report: ApplyReport;
      readonly snapshot: HostSnapshot;
    };

export type PsOnboardingWarningKind =
  | 'home-documents'
  | 'home-desktop'
  | 'home-downloads'
  | 'volumes-mount';

export type PsOnboardingGitState = 'present' | 'absent' | 'shell-only';

export interface PsOnboardingShowPayload {
  readonly pickedPath: string;
  readonly projectDir: string;
  readonly defaultContentDir: string;
  readonly gitState: PsOnboardingGitState;
  readonly gitRootPromoted: boolean;
  readonly warnings: readonly { readonly kind: PsOnboardingWarningKind }[];
}

export interface PsDeepLinkPayload {
  doc: string;
  kind: 'doc' | 'folder';
  branch?: string | null;
  multiCandidate?: boolean;
  targetMissing?: boolean;
  repositoryPath?: string;
  contentRootDepth?: number;
}

export type PsOnboardingToastPayload =
  | { readonly kind: 'ancestor-promote'; readonly ancestorPath: string }
  | { readonly kind: 'git-root-promote'; readonly gitRoot: string; readonly pickedPath: string }
  | {
      readonly kind: 'startup-reclaim';
      readonly mcp:
        | { readonly status: 'none' }
        | { readonly status: 'repaired'; readonly editors: readonly string[] }
        | {
            readonly status: 'failed';
            readonly failures: readonly { readonly editor: string; readonly reason?: string }[];
            readonly repaired?: readonly string[];
          };
      readonly path:
        | { readonly status: 'none' }
        | { readonly status: 'installed'; readonly summary: string }
        | { readonly status: 'failed'; readonly summary: string };
    }
  | {
      readonly kind: 'sharing-refused-tracked';
      readonly tracked: readonly string[];
      readonly remediation: string;
    }
  | { readonly kind: 'sharing-no-git'; readonly requestedMode: 'local-only' };

export interface PsOnboardingConfirmRequest {
  readonly initGit: boolean;
  readonly contentDir: string;
  readonly additionalIgnores: string;
  readonly editorIds: readonly PsMcpWiringEditorId[];
  readonly connectEditors: boolean;
  readonly sharing: 'shared' | 'local-only';
}

export type PsOnboardingResult = { ok: true } | { ok: false; error: string };

export interface PsOnboardingProbeContentRequest {
  readonly contentDir: string;
}

export type PsOnboardingProbeContentResult =
  | {
      readonly ok: true;
      readonly count: number;
      readonly sample: readonly string[];
      readonly truncated: boolean;
    }
  | { readonly ok: false; readonly error: string };

export interface PsKeyringSmokeResult {
  ok: boolean;
  backend?: 'keyring' | 'file';
  error?: string;
  durationMs?: number;
  timestamp: string;
}

export interface PsScaffoldFileEntry {
  path: string;
  kind: 'folder' | 'file';
  contentPreview?: string;
}
export interface PsScaffoldSkipEntry {
  path: string;
  reason: 'already-exists' | 'user-content' | 'glob-collision';
}
export interface PsScaffoldPlan {
  created: PsScaffoldFileEntry[];
  skipped: PsScaffoldSkipEntry[];
  warnings: string[];
  packSkills?: { name: string; pending: boolean; conflict?: boolean }[];
  requiredPlugins?: { id: LintPluginId; pending: boolean }[];
}
export interface PsScaffoldApplyError {
  path: string;
  error: string;
}
export interface PsScaffoldApplyResult {
  applied: number;
  errors: PsScaffoldApplyError[];
  durationMs: number;
  packSkillsInstalled: string[];
  pluginsEnabled: LintPluginId[];
  packSkillConflicts: { name: string; hosts?: string[] }[];
}

export interface PsSeedError {
  kind: 'no-project' | 'prerequisite-missing' | 'invalid-root' | 'internal';
  message: string;
}

export type PsPackId =
  | 'knowledge-base'
  | 'software-lifecycle'
  | 'codebase-wiki'
  | 'plain-notes'
  | 'worldbuilding'
  | 'writing-pipeline'
  | 'entity-vault'
  | 'psf';

export interface PsSeedPlanOptions {
  rootDir?: string;
  packId?: PsPackId;
  preview?: { skillsInstallable: boolean };
}

export interface PsSeedApplyOptions {
  packId?: PsPackId;
}

export interface PsSeedPackFolderInfo {
  path: string;
  summary: string;
}

export interface PsSeedPackEntryCounts {
  files: number;
  folders: number;
}

export interface PsSeedPackInfo {
  id: PsPackId;
  name: string;
  description: string;
  defaultSubfolder?: string;
  folders: PsSeedPackFolderInfo[];
  entryCounts: PsSeedPackEntryCounts;
}

export interface PsFindEnclosingProjectRootResult {
  readonly rootPath: string;
  readonly distance: number;
}
export interface PsFindEnclosingGitRootResult {
  readonly gitRoot: string;
  readonly distance: number;
}
export type PsSeedPlanResult =
  | { ok: true; plan: PsScaffoldPlan }
  | { ok: false; error: PsSeedError };
export type PsSeedApplyResult =
  | { ok: true; result: PsScaffoldApplyResult }
  | { ok: false; error: PsSeedError };
export type PsSeedListPacksResult =
  | { ok: true; packs: PsSeedPackInfo[] }
  | { ok: false; error: { kind: 'internal'; message: string } };

export type PsLocalOpAuthSignoutResponse = { ok: true } | { ok: false; error?: string };

export type PsLocalOpAuthEvent =
  | {
      type: 'verification';
      user_code: string;
      verification_uri: string;
      expires_in: number;
    }
  | {
      type: 'complete';
      host: string;
      login: string;
      name?: string;
      email?: string;
      avatarUrl?: string;
    }
  | { type: 'error'; message: string };

export type PsLocalOpCloneEvent =
  | { type: 'progress'; phase: string; pct: number }
  | { type: 'complete'; dir: string }
  | { type: 'branch-fallback'; branch: string }
  | {
      type: 'error';
      message: string;
      code?: 'unsafe-symlinks';
      refusedSymlinkPaths?: string[];
    };

export interface PsLocalOpStream<E> {
  readonly events: AsyncIterable<E>;
  cancel(): void;
}

export type PsLocalOpAuthStatusResponse =
  | {
      authenticated: true;
      host: string;
      login: string;
      tier?: 'A' | 'B' | 'C';
      name?: string;
      email?: string;
      ghAvailable?: boolean;
    }
  | { authenticated: false; host: string; error?: string; ghAvailable?: boolean };

export interface PsLocalOpRepoEntry {
  full_name: string;
  clone_url: string;
  private: boolean;
}

export type PsLocalOpAuthReposResponse =
  | { ok: true; host: string; repos: PsLocalOpRepoEntry[] }
  | { ok: false; error: string; authenticated?: false };

export type PsEditorActiveTargetSnapshot =
  | { readonly kind: 'doc'; readonly identifier: string }
  | { readonly kind: 'folder'; readonly identifier: string }
  | { readonly kind: 'asset'; readonly identifier: string }
  | { readonly kind: null };

export interface PsEditorViewMenuStateSnapshot {
  readonly showHiddenFiles: boolean;
  readonly showOkFolders: boolean;
  readonly showOnlyMarkdownFiles: boolean;
  readonly showSkillsSection: boolean;
  readonly canExpandAll: boolean;
  readonly canCollapseAll: boolean;
  readonly sidebarVisible: boolean;
  readonly docPanelVisible?: boolean;
  readonly terminalVisible?: boolean;
  readonly terminalPlacement?: TerminalPlacement;
  readonly terminalLive?: boolean;
  readonly agentPanelVisible?: boolean;
  readonly editorVisible?: boolean;
  readonly canViewInSource?: boolean;
  readonly hasEditorSelection?: boolean;
}

export interface PsEditorWideVisibility {
  readonly editorVisible?: boolean;
  readonly terminalVisible?: boolean;
  readonly agentPanelVisible?: boolean;
}

type PsEditorDockVisibilityKey = keyof PsEditorWideVisibility;

type PsEditorOnlyPane<K extends PsEditorDockVisibilityKey> = { readonly [P in K]: boolean } & {
  readonly [P in Exclude<PsEditorDockVisibilityKey, K>]?: never;
};

type PsEditorDockVisibilityChange = {
  [K in PsEditorDockVisibilityKey]: PsEditorOnlyPane<K> & {
    readonly wideIntent: PsEditorOnlyPane<K>;
  };
}[PsEditorDockVisibilityKey];

export type PsEditorViewMenuStateChange = Partial<
  Omit<PsEditorViewMenuStateSnapshot, PsEditorDockVisibilityKey>
> &
  (
    | PsEditorDockVisibilityChange
    | ({ readonly [K in PsEditorDockVisibilityKey]?: never } & { readonly wideIntent?: never })
  );

export type PsMenuDispatchRole =
  | 'undo'
  | 'redo'
  | 'cut'
  | 'copy'
  | 'paste'
  | 'selectAll'
  | 'reload'
  | 'forceReload'
  | 'toggleDevTools'
  | 'resetZoom'
  | 'zoomIn'
  | 'zoomOut'
  | 'toggleFullScreen'
  | 'minimize'
  | 'close'
  | 'quit'
  | 'about';

export type PsMenuDispatchCommand =
  | 'open-navigator'
  | 'open-folder-dialog'
  | 'clear-recent-projects'
  | 'open-settings'
  | 'check-for-updates'
  | 'reconfigure-mcp-wiring'
  | 'open-github'
  | 'open-docs'
  | 'open-discord'
  | 'toggle-spell-check';

export type PsMenuDispatchRequest =
  | { readonly kind: 'query' }
  | { readonly kind: 'menu-action'; readonly action: PsMenuAction }
  | { readonly kind: 'command'; readonly command: PsMenuDispatchCommand }
  | { readonly kind: 'open-recent-project'; readonly path: string }
  | { readonly kind: 'role'; readonly role: PsMenuDispatchRole }
  | { readonly kind: 'spelling-languages-query' }
  | { readonly kind: 'spelling-languages-set'; readonly languages: readonly string[] }
  | { readonly kind: 'spellcheck-enabled-set'; readonly enabled: boolean };

export type PsSpellingLanguagesSetReason =
  | 'invalid-request'
  | 'empty-selection'
  | 'unsupported-language'
  | 'engine-error';

export interface PsSpellingLanguagesState {
  readonly available: readonly string[];
  readonly selected: readonly string[];
  readonly defaults: readonly string[];
}

export type PsSpellingLanguagesQueryResult =
  | {
      readonly kind: 'spelling-languages-query';
      readonly ok: true;
      readonly state: PsSpellingLanguagesState;
    }
  | {
      readonly kind: 'spelling-languages-query';
      readonly ok: false;
      readonly reason: 'engine-error';
    };

export type PsSpellingLanguagesSetResult =
  | {
      readonly kind: 'spelling-languages-set';
      readonly ok: true;
      readonly state: PsSpellingLanguagesState;
    }
  | {
      readonly kind: 'spelling-languages-set';
      readonly ok: false;
      readonly reason: PsSpellingLanguagesSetReason;
    };

export type PsSpellcheckEnabledSetResult =
  | {
      readonly kind: 'spellcheck-enabled-set';
      readonly ok: true;
      readonly enabled: boolean;
      readonly saved: boolean;
    }
  | {
      readonly kind: 'spellcheck-enabled-set';
      readonly ok: false;
      readonly reason: 'engine-error' | 'invalid-request';
    };

export type PsSpellingDispatchResult =
  | PsSpellingLanguagesQueryResult
  | PsSpellingLanguagesSetResult
  | PsSpellcheckEnabledSetResult;

export type PsMenuUiDispatchRequest = Exclude<
  PsMenuDispatchRequest,
  { readonly kind: PsSpellingDispatchResult['kind'] }
>;

export interface PsMenuRendererSnapshot {
  readonly recentProjects: ReadonlyArray<{ readonly path: string; readonly name: string }>;
  readonly spellCheckEnabled: boolean;
  readonly showDevToolsMenu: boolean;
  readonly canCheckForUpdates: boolean;
  readonly canReconfigureMcpWiring: boolean;
  readonly activeTarget: PsEditorActiveTargetSnapshot;
  readonly viewMenuState: PsEditorViewMenuStateSnapshot;
}

export type PsMenuDispatchResult = PsMenuRendererSnapshot | PsSpellingDispatchResult | undefined;

export interface PsBugReportSendInput {
  zipPath: string;
  metadata: PsBugReportSendMetadata;
  includeScreenshot?: boolean;
  includeAttachments?: boolean;
  traceparent?: string;
}

export interface PsBugReportAttachmentInput {
  contentType: PsImageAttachmentContentType;
  bytes: Uint8Array;
}

export interface PsAssetUploadRequest {
  contentType: PsImageAttachmentContentType;
  bytes: Uint8Array;
  filename: string;
}

export type PsAssetUploadResult =
  | { assetUrl: string }
  | { error: 'invalid-request' | 'unconfigured' | 'mint' | 'upload' };

export interface PsSharingStatusResult {
  readonly kind: 'status';
  readonly mode: 'shared' | 'local-only' | 'no-git';
  readonly excluded: readonly string[];
  readonly trackedUpstream: readonly string[];
}

export type PsSharingSetModeResult =
  | { readonly kind: 'applied'; readonly mode: 'shared' | 'local-only' | 'no-git' }
  | {
      readonly kind: 'refused-tracked';
      readonly tracked: readonly string[];
      readonly remediation: string;
    }
  | {
      readonly kind: 'no-exclude';
      readonly reason: 'no-git' | 'no-info-dir' | 'malformed-pointer' | 'inaccessible';
    };

export type SlidevSource = 'project-local' | 'global';

export type PsSlidesStatusResult =
  | { readonly kind: 'status'; readonly available: true; readonly source: SlidevSource }
  | { readonly kind: 'status'; readonly available: false };

export type SlidevOpenFailureReason =
  | 'not-available'
  | 'invalid-path'
  | 'spawn-error'
  | 'port-error'
  | 'exited-early'
  | 'cancelled'
  | 'load-failed'
  | 'renderer-failed'
  | 'timeout'
  | 'unsupported-server';

export type PsSlidesOpenResult =
  | { readonly kind: 'open'; readonly ok: true }
  | { readonly kind: 'open'; readonly ok: false; readonly reason: SlidevOpenFailureReason };

export interface PsServerVersionDriftInfo {
  readonly relation: 'older' | 'newer';
  readonly dimension: 'protocol' | 'runtime';
  readonly serverRuntime: string;
  readonly appRuntime: string;
}

export interface PsServerRestartedInfo {
  readonly appRuntime: string;
}

export interface PsRecentRemovedMissingInfo {
  readonly path: string;
  readonly projectName: string;
}

export type PsServerRestartFailure =
  | { readonly ok: false; readonly reason: 'eperm' | 'other' }
  | { readonly ok: false; readonly reason: 'other-channel'; readonly holderChannel: string };

export type PsServerRestartOutcome = { readonly ok: true } | PsServerRestartFailure;

export type PsPtyCreateReason = 'no-project' | 'not-consented';

export type PsAssetOpenRefusalReason =
  | 'extension-blocked'
  | 'not-a-file'
  | 'path-escape'
  | 'not-found'
  | 'resolve-error';

export type PsAssetOpenResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: PsAssetOpenRefusalReason };

export function assetOpenRefusalRevealsInstead(reason: PsAssetOpenRefusalReason): boolean {
  switch (reason) {
    case 'extension-blocked':
    case 'not-a-file':
      return true;
    case 'path-escape':
    case 'not-found':
    case 'resolve-error':
      return false;
    default: {
      const _unknownFromNewerDesktop: never = reason;
      return false;
    }
  }
}

export function assertNeverPtyCreateReason(value: never): never {
  throw new Error(`unhandled pty create reason: ${String(value)}`);
}

export type PsPtyCreateResult =
  | { readonly ok: true; readonly ptyId: string }
  | { readonly ok: false; readonly reason: PsPtyCreateReason };

export interface PsPtyListEntry {
  readonly ptyId: string;
  readonly customLabel: string | null;
  readonly ordinal: number | null;
}

export type PsPtyAdoptReason =
  | 'unknown-session'
  | 'not-started'
  | 'not-consented'
  | 'host-unavailable';

export function assertNeverPtyAdoptReason(value: never): never {
  throw new Error(`unhandled pty adopt reason: ${String(value)}`);
}

export type PsPtyAdoptResult =
  | {
      readonly ok: true;
      readonly replay: string;
      readonly shellFamily?: WindowsShellFamily;
      readonly shellNoticeReason?: Extract<TerminalShellNoticeReason, 'unsupported-family'>;
    }
  | {
      readonly ok: false;
      readonly reason: PsPtyAdoptReason;
    };

export interface PsPtyData {
  readonly ptyId: string;
  readonly data: string;
}

export type PsPtyExit =
  | {
      readonly ptyId: string;
      readonly neverStarted: true;
      readonly error?: string;
      readonly hostExited?: true;
      readonly launchFailure?: WindowsShellLaunchFailureReason;
    }
  | {
      readonly ptyId: string;
      readonly neverStarted?: false;
      readonly exitCode: number;
      readonly signal: number | null;
      readonly error?: string;
      readonly hostExited?: true;
    };

const TERMINAL_SHELL_NOTICE_REASON_VOCABULARY = [
  'config-unreadable',
  'invalid-value',
  'not-absolute',
  'not-found',
  'unsupported-family',
] as const;

export type TerminalShellNoticeReason = (typeof TERMINAL_SHELL_NOTICE_REASON_VOCABULARY)[number];

export const TERMINAL_SHELL_NOTICE_REASONS: ReadonlySet<TerminalShellNoticeReason> = new Set(
  TERMINAL_SHELL_NOTICE_REASON_VOCABULARY,
);

export function isTerminalShellNoticeReason(value: unknown): value is TerminalShellNoticeReason {
  return (
    typeof value === 'string' &&
    TERMINAL_SHELL_NOTICE_REASONS.has(value as TerminalShellNoticeReason)
  );
}

const TERMINAL_SUPPORT_FILE_NOTICE_REASON_VOCABULARY = [
  'containment-refused',
  'write-failed',
] as const;

export type TerminalSupportFileNoticeReason =
  (typeof TERMINAL_SUPPORT_FILE_NOTICE_REASON_VOCABULARY)[number];

export const TERMINAL_SUPPORT_FILE_NOTICE_REASONS: ReadonlySet<TerminalSupportFileNoticeReason> =
  new Set(TERMINAL_SUPPORT_FILE_NOTICE_REASON_VOCABULARY);

export function isTerminalSupportFileNoticeReason(
  value: unknown,
): value is TerminalSupportFileNoticeReason {
  return (
    typeof value === 'string' &&
    TERMINAL_SUPPORT_FILE_NOTICE_REASONS.has(value as TerminalSupportFileNoticeReason)
  );
}

export type PsPtyNotice =
  | {
      readonly ptyId: string;
      readonly notice: 'invalid-shell-override';
      readonly reason: TerminalShellNoticeReason;
    }
  | {
      readonly ptyId: string;
      readonly notice: 'shell-resolved';
      readonly shellFamily: WindowsShellFamily;
    }
  | {
      readonly ptyId: string;
      readonly notice: 'support-file-degraded';
      readonly reason: TerminalSupportFileNoticeReason;
    };

export interface ClaudeReadiness {
  readonly claude: 'present' | 'not-found' | 'unknown';
  readonly mcpPreApprovable?: boolean;
  readonly psToolsAutoApprovable?: boolean;
  readonly mcpServerName?: string;
}

export interface CliReadiness {
  readonly onPath: 'present' | 'not-found' | 'unknown';
  readonly psServerConfigured?: boolean;
  readonly mcpServerName?: string;
}

export interface CopyImageRequest {
  readonly src: string;
}

export type CopyImageFailureReason =
  | 'fetch-failed'
  | 'path-escape'
  | 'empty-image'
  | 'read-error'
  | 'write-error';

export type CopyImageResult =
  | { ok: true }
  | { ok: false; reason: CopyImageFailureReason; detail?: string };

export interface PsDesktopBridge {
  readonly config: PsDesktopConfig;

  onProjectSwitched(cb: (next: PsDesktopConfig) => void): PsUnsubscribe;
  onMenuAction(cb: (action: PsMenuAction, origin: PsMenuActionOrigin) => void): PsUnsubscribe;
  onUpdateDownloaded(cb: (info: PsUpdateDownloadedInfo) => void): PsUnsubscribe;
  onUpdateRelaunching(cb: (info: PsUpdateRelaunchingInfo) => void): PsUnsubscribe;
  onUpdateFetchingLatest(cb: (info: PsUpdateFetchingLatestInfo) => void): PsUnsubscribe;
  onUpdateRelaunchFailed(cb: (info: PsUpdateRelaunchFailedInfo) => void): PsUnsubscribe;
  onWhatsNew(cb: (info: PsWhatsNewInfo) => void): PsUnsubscribe;
  onWhatsNewDismissed(cb: (info: { readonly version: string }) => void): PsUnsubscribe;
  onUpdateStuckHint(cb: (info: PsUpdateStuckHintInfo) => void): PsUnsubscribe;
  onUpdateManualCheck(cb: (info: PsUpdateManualCheckInfo) => void): PsUnsubscribe;
  onDeepLink(cb: (evt: PsDeepLinkPayload) => void): PsUnsubscribe;
  onShareReceived(cb: (payload: PsShareReceivedPayload) => void): PsUnsubscribe;

  onServerVersionDrift(cb: (info: PsServerVersionDriftInfo) => void): PsUnsubscribe;
  onServerRestarted(cb: (info: PsServerRestartedInfo) => void): PsUnsubscribe;
  onRecentRemovedMissing(cb: (info: PsRecentRemovedMissingInfo) => void): PsUnsubscribe;
  restartServer(projectPath: string): Promise<PsServerRestartOutcome>;

  setThemeSource(source: PsThemeSource): Promise<{ ok: true }>;

  setLanguagePreference(preference: LanguagePreference): Promise<{ ok: true }>;

  userConfig?: PsUserConfigBridge;

  signalThemeApplied(opts?: { reducedTransparency?: boolean; chrome?: PsChromeColors }): void;

  dialog: {
    openFolder(opts?: { defaultPath?: string }): Promise<string | null>;
  };

  shell: {
    openExternal(url: string): Promise<void>;
    detectProtocol(scheme: string): Promise<{ installed: boolean; displayName?: string }>;
    spawnCursor(
      path: string,
    ): Promise<
      | { ok: true }
      | { ok: false; reason: 'invalid-path' | 'not-installed' | 'timeout' | 'spawn-error' }
    >;
    recordHandoff(line: {
      readonly target: 'claude-cowork' | 'claude-code' | 'codex' | 'cursor';
      readonly host: 'electron' | 'web';
      readonly outcome: 'ok' | 'error';
      readonly ts: string;
      readonly reason?: HandoffFailureReason;
      readonly scope?: HandoffScope;
    }): Promise<void>;

    openAsset(relPath: string): Promise<PsAssetOpenResult>;

    revealAsset(
      relPath: string,
    ): Promise<{ ok: true } | { ok: false; reason: 'path-escape' | 'not-found' | 'resolve-error' }>;

    revealExternal(
      absPath: string,
    ): Promise<
      | { ok: true; outcome: 'revealed' | 'dismissed' }
      | { ok: false; reason: 'not-found' | 'invalid-path' | 'error' }
    >;

    showAssetMenu(params: {
      readonly relPath: string;
      readonly title: string;
      readonly kind: 'asset' | 'wiki-link' | 'image';
    }): Promise<void>;
    showItemInFolder(path: string): Promise<void>;
    trashItem(absPath: string): Promise<
      | { ok: true }
      | {
          ok: false;
          reason: 'not-found' | 'permission-denied' | 'system-error' | 'path-escape';
          detail?: string;
        }
    >;
  };

  clipboard: {
    writeText(text: string): Promise<void>;
    copyImage(request: CopyImageRequest): Promise<CopyImageResult>;
  };

  project: {
    listRecent(): Promise<RecentProjectEntry[]>;
    removeRecent(path: string): Promise<void>;
    getSessionState(): Promise<ProjectSessionState>;
    setSessionState(state: ProjectSessionState): Promise<void>;
    open(request: PsProjectOpenRequest): Promise<void>;
    openFile(): Promise<void>;
    createNew(args: {
      parent: string;
      name: string;
      editors: PsMcpWiringEditorId[];
      sharing?: 'shared' | 'local-only';
      packId?: PsPackId;
      rootDir?: string;
    }): Promise<void>;
    recordCreateNewBannerShown(banner: CreateNewBannerKind): Promise<void>;
    checkTargetExists(request: {
      projectPath: string;
      kind: 'doc' | 'folder';
      path: string;
    }): Promise<PsCheckTargetExistsResult>;
    readHeadBranch(projectPath: string): Promise<PsHeadBranchInfo>;
    fetchBranchInfo(request: {
      projectPath: string;
      branch: string;
      kind: 'doc' | 'folder';
      path: string;
    }): Promise<BranchInfoResponse | null>;
    runCheckout(request: {
      projectPath: string;
      branch: string;
      fastForward?: boolean;
    }): Promise<CheckoutResponse | null>;
    fetchTargetStatus(request: {
      projectPath: string;
      branch: string;
      path: string;
      kind: 'doc' | 'folder';
      contentRootDepth?: number;
    }): Promise<ShareTargetStatusResponse | null>;
    awaitBranchSwitched(request: {
      projectPath: string;
      branch: string;
      timeoutMs: number;
    }): Promise<{ ok: true } | { ok: false; reason: 'timeout' | 'project-not-open' }>;
    psInit(request: { projectPath: string }): Promise<LocalOpOkInitResponse>;
    close(): Promise<void>;
  };

  worktree: {
    list(): Promise<WorktreeListResult>;
    inventory(request: WorktreeInventoryRequest): Promise<WorktreeInventoryResult>;
    openInventory(request: WorktreeInventoryOpenRequest): Promise<WorktreeInventoryOpenResult>;
    create(request: WorktreeCreateRequest): Promise<WorktreeCreateResult>;
    checkout(request: { branch: string }): Promise<WorktreeCreateResult>;
  };

  sharing: {
    status(): Promise<PsSharingStatusResult>;
    setMode(mode: 'shared' | 'local-only'): Promise<PsSharingSetModeResult>;
  };

  slides: {
    status(): Promise<PsSlidesStatusResult>;
    open(docPath: string): Promise<PsSlidesOpenResult>;
  };

  bugReport: {
    create(request: {
      level: ReportBundleLevel;
      note?: string;
      includeCrashDump?: boolean;
      includeScreenshot?: boolean;
      attachments?: PsBugReportAttachmentInput[];
      agentChatThreadId?: string;
      crashEventId?: string;
    }): Promise<PsBugReportCreateResult>;
    captureScreenshot(): Promise<PsBugReportScreenshot | null>;
    crashDumpAvailability(): Promise<PsBugReportCrashDumpAvailability>;
    send(request: PsBugReportSendInput): Promise<PsBugReportSendResult>;
    crashAck(request: { eventId: string }): Promise<PsBugReportCrashAckResult>;
    list(): Promise<PsBugReportListResult>;
    delete(id: string): Promise<PsBugReportDeleteResult>;
    onCrashDetected(cb: (event: PsBugReportCrashDetectedEvent) => void): PsUnsubscribe;
  };

  assetUpload: {
    uploadImage(request: PsAssetUploadRequest): Promise<PsAssetUploadResult>;
  };

  fs: {
    defaultProjectsRoot(): Promise<string>;
    folderState(path: string): Promise<PsFolderState>;
    findEnclosingProjectRoot(path: string): Promise<PsFindEnclosingProjectRootResult | null>;
    findEnclosingGitRoot(path: string): Promise<PsFindEnclosingGitRootResult | null>;
    removeGitFolder(gitRoot: string): Promise<void>;
  };

  navigator: {
    open(): Promise<void>;
  };

  noteWindow: {
    open(
      docName: string,
      entryPoint: 'tab-menu' | 'palette',
    ): Promise<
      | { ok: true; outcome: 'created' | 'focused' }
      | { ok: false; reason: 'no-project' | 'invalid-request' }
    >;
    dispatchToMain(action: PsNoteWindowMainAction): Promise<PsNoteWindowMainActionResult>;
    onMainAction(cb: (action: PsNoteWindowMainAction) => void): PsUnsubscribe;
  };

  seed: {
    plan(options?: PsSeedPlanOptions): Promise<PsSeedPlanResult>;
    apply(plan: PsScaffoldPlan, options?: PsSeedApplyOptions): Promise<PsSeedApplyResult>;
    listPacks(): Promise<PsSeedListPacksResult>;
  };

  skill: {
    detectClaudeDesktop(): Promise<boolean>;
    buildAndOpen(opts?: { force?: boolean }): Promise<
      | { ok: true; path: string; skipped?: false; version?: string }
      | {
          ok: true;
          path?: undefined;
          skipped: true;
          version: string;
          recordedAt?: string;
        }
      | {
          ok: false;
          reason: 'build-failed' | 'open-failed' | 'no-downloads-dir';
          message?: string;
        }
    >;
  };

  update: {
    relaunchNow(): Promise<void>;
    checkNow(): Promise<void>;
    dismissWhatsNew(version: string): Promise<void>;
    dismissDownloaded(version: string): Promise<void>;
    setMode(mode: PsUpdateMode): Promise<void>;
  };

  state: {
    query(): Promise<PsStateSnapshot>;
    resetIncompatible(): Promise<void>;
  };

  mcpWiring: {
    onShow(cb: (payload: PsMcpWiringShowPayload) => void): PsUnsubscribe;
    signalReady(): void;
    confirm(request: PsMcpWiringConfirmRequest): Promise<PsMcpWiringResult>;
    skip(): Promise<PsMcpWiringResult>;
    reconfigure(): Promise<boolean>;
  };

  spellcheck: {
    toggle(): Promise<boolean>;
    languages(): Promise<PsSpellingLanguagesQueryResult>;
    setLanguages(languages: readonly string[]): Promise<PsSpellingLanguagesSetResult>;
    setEnabled(enabled: boolean): Promise<PsSpellcheckEnabledSetResult>;
  };

  integrations: {
    status(): Promise<PsIntegrationsStatus>;
    setComponent(request: PsIntegrationsSetRequest): Promise<PsIntegrationsSetResult>;
  };

  projectIntegrations: {
    status(): Promise<PsProjectIntegrationsStatus>;
    setComponent(request: PsProjectIntegrationsSetRequest): Promise<PsProjectIntegrationsSetResult>;
  };

  agentIntegrations: {
    apply(request: PsAgentIntegrationsApplyRequest): Promise<PsAgentIntegrationsApplyResult>;
  };

  remoteAccess: {
    probePort(port: number): Promise<boolean>;
  };

  onboarding: {
    onShow(cb: (payload: PsOnboardingShowPayload) => void): PsUnsubscribe;
    signalReady(): void;
    confirm(request: PsOnboardingConfirmRequest): Promise<PsOnboardingResult>;
    cancel(): Promise<PsOnboardingResult>;
    probeContent(request: PsOnboardingProbeContentRequest): Promise<PsOnboardingProbeContentResult>;
    onToast(cb: (payload: PsOnboardingToastPayload) => void): PsUnsubscribe;
  };

  localOp: {
    auth: {
      start(): PsLocalOpStream<PsLocalOpAuthEvent>;
    };
    clone: {
      start(request: {
        url: string;
        dir: string;
        branch?: string | null;
      }): PsLocalOpStream<PsLocalOpCloneEvent>;
    };
    authStatus(request?: { host?: string }): Promise<PsLocalOpAuthStatusResponse>;
    authRepos(request?: { host?: string }): Promise<PsLocalOpAuthReposResponse>;
  };

  share: {
    validateLocalFolder(args: {
      folderPath: string;
      host: string;
      owner: string;
      repo: string;
    }): Promise<ShareFolderValidationResult>;
  };

  editor: {
    notifyActiveTargetChanged(target: PsEditorActiveTargetSnapshot): void;
    notifyViewMenuStateChanged(state: PsEditorViewMenuStateChange): void;
    notifyBackgroundThrottle(signal: { hasPendingWork: boolean; enabled: boolean }): void;
  };

  menu: {
    dispatch(request: PsMenuUiDispatchRequest): Promise<PsMenuRendererSnapshot | undefined>;
  };

  startup: {
    reportMarks(marks: { pageListReadyMs: number; firstContentMs: number }): void;
  };

  sidebar: {
    expandAll(cb: () => void): PsUnsubscribe;
    collapseAll(cb: () => void): PsUnsubscribe;
  };

  terminal: {
    // STOP: create only reserves a session; install onData/onExit before start(ptyId) posts the deferred spawn in terminal-manager.ts.
    create(opts: {
      cols: number;
      rows: number;
      launchCommand?: string | TerminalLaunchCommand;
      launchCli?: TerminalCli;
    }): Promise<PsPtyCreateResult>;
    input(ptyId: string, data: string): void;
    resize(ptyId: string, cols: number, rows: number): void;
    kill(ptyId: string): Promise<void>;
    drain(ptyId: string, bytes: number): void;
    list(): Promise<PsPtyListEntry[]>;
    adopt(ptyId: string, opts?: { start?: boolean }): Promise<PsPtyAdoptResult>;
    start(ptyId: string): Promise<PsPtyAdoptResult>;
    setMeta(ptyId: string, meta: { customLabel?: string | null; ordinal?: number }): void;
    setOrder(orderedPtyIds: readonly string[]): void;
    getDockState(): Promise<PsTerminalDockState>;
    setDockState(state: PsTerminalDockStateUpdate): Promise<PsTerminalDockStateWriteResult>;
    onData(cb: (msg: PsPtyData) => void): PsUnsubscribe;
    onExit(cb: (msg: PsPtyExit) => void): PsUnsubscribe;
    onNotice(cb: (msg: PsPtyNotice) => void): PsUnsubscribe;
    claudePreflight(): Promise<ClaudeReadiness>;
    cliPreflight(cli: TerminalCli): Promise<CliReadiness>;
    cliInstalledMap(): Promise<Partial<Record<TerminalCli, boolean>>>;
  };

  accessibility?: {
    isScreenReaderActive(): boolean;
    onScreenReaderChanged(cb: (active: boolean) => void): PsUnsubscribe;
  };

  readonly platform: HandoffHostPlatform;
  readonly appVersion: string;
  readonly instanceLabel: string | null;
  readonly mcpServerName: string | null;
  readonly cliCommandName: string | null;

  getPathForFile(file: File): string | null;

  setDisplayLockCrashKey(state: string): void;

  debug?: {
    keyringSmoke(): Promise<PsKeyringSmokeResult>;
  };
}

declare global {
  interface Window {
    psDesktop?: PsDesktopBridge;
  }
}
