import type {
  ApplyReport,
  BranchInfoResponse,
  CheckoutResponse,
  ConfigPatch,
  CreateNewBannerKind,
  EditorId,
  HandoffFailureReason,
  HandoffScope,
  HostSnapshot,
  LanguagePreference,
  LocalOpPsInitResponse,
  PsBugReportCrashAckResult,
  PsBugReportCrashDumpAvailability,
  PsBugReportCreateResult,
  PsBugReportDeleteResult,
  PsBugReportListResult,
  PsBugReportScreenshot,
  PsBugReportSendResult,
  PsFolderState,
  ShareTargetStatusResponse,
  SkillCostTiers,
  TerminalCli,
  TerminalLaunchCommand,
  UninstallDispatchRequest,
  UninstallDispatchResult,
  WorktreeCreateRequest,
  WorktreeCreateResult,
  WorktreeInventoryOpenRequest,
  WorktreeInventoryOpenResult,
  WorktreeInventoryRequest,
  WorktreeInventoryResult,
  WorktreeListResult,
} from '@palimpsest/core';
import type {
  PsCheckTargetExistsResult as CheckTargetExistsResult,
  ClaudeReadiness,
  CliReadiness,
  CopyImageRequest,
  CopyImageResult,
  PsHeadBranchInfo as HeadBranchInfo,
  PsAssetOpenResult,
  PsAssetUploadResult,
  PsChromeColors,
  PsDesktopConfig,
  PsEditorActiveTargetSnapshot,
  PsEditorViewMenuStateChange,
  PsEditorViewMenuStateSnapshot,
  PsLocalOpAuthReposResponse,
  PsLocalOpAuthStatusResponse,
  PsMenuDispatchCommand,
  PsMenuDispatchRequest,
  PsMenuDispatchResult,
  PsMenuDispatchRole,
  PsMenuRendererSnapshot,
  PsNoteWindowMainAction,
  PsNoteWindowMainActionResult,
  PsPtyAdoptResult,
  PsPtyCreateResult,
  PsPtyListEntry,
  PsServerRestartOutcome,
  PsSharePayloadFields,
  PsSharingSetModeResult,
  PsSharingStatusResult,
  PsSlidesOpenResult,
  PsSlidesStatusResult,
  PsStateSnapshot,
  PsTerminalDockState,
  PsTerminalDockStateUpdate,
  PsTerminalDockStateWriteResult,
  PsThemeSource,
  PsUpdateMode,
  PsUserConfigPatchResult,
  PsUserConfigSnapshot,
  PsSeedApplyOptions as SeedApplyOptions,
  PsSeedPlanOptions as SeedPlanOptions,
  SlidevOpenFailureReason,
  SlidevSource,
} from '@palimpsest/core/desktop-bridge';
import type {
  FindEnclosingGitRootResult,
  FindEnclosingProjectRootResult,
  PackId,
  ScaffoldPlan,
} from '@palimpsest/server';
import type { PsBugReportRequest } from '../main/ipc/bug-report.ts';
import type { BuildAndOpenResult } from '../main/ipc/install-skill.ts';
import type { SeedApplyResult, SeedListPacksResult, SeedPlanResult } from '../main/ipc/seed.ts';
import type { KeyringSmokeResult } from '../utility/keyring-smoke.ts';
import type { EntryPoint } from './entry-point.ts';

export type EditorActiveTargetSnapshot = PsEditorActiveTargetSnapshot;
export type EditorViewMenuStateSnapshot = PsEditorViewMenuStateSnapshot;
export type EditorViewMenuStateChange = PsEditorViewMenuStateChange;
export type { SkillCostTiers };
export type MenuDispatchRole = PsMenuDispatchRole;
export type MenuDispatchCommand = PsMenuDispatchCommand;
export type MenuDispatchRequest = PsMenuDispatchRequest;
export type MenuDispatchResult = PsMenuDispatchResult;
export type MenuRendererSnapshot = PsMenuRendererSnapshot;

export type { PsSharingSetModeResult, PsSharingStatusResult };

export type PsSharingResult = PsSharingStatusResult | PsSharingSetModeResult;

export type { PsSlidesOpenResult, PsSlidesStatusResult, SlidevOpenFailureReason, SlidevSource };

export interface RecentProject {
  path: string;
  name: string;
  lastOpenedAt: string;
  missing?: boolean;
  gitRemoteUrl?: string;
  gitCommonDir?: string;
  mainRoot?: string;
  checkoutRoot?: string;
  projectSubPath?: string;
  isLinkedWorktree?: boolean;
  branch?: string | null;
}

interface ProjectOpenRequest {
  path: string;
  target: 'new-window';
  entryPoint: EntryPoint;
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
  pendingMultiCandidate?: boolean;
}

interface ShareValidateFolderRequest {
  readonly folderPath: string;
  readonly host: string;
  readonly owner: string;
  readonly repo: string;
}

type ShareValidateFolderResult =
  | { readonly kind: 'ok'; readonly gitRemoteUrl: string }
  | { readonly kind: 'not-git' }
  | { readonly kind: 'no-origin' }
  | { readonly kind: 'wrong-repo'; readonly actualOwner: string; readonly actualRepo: string }
  | { readonly kind: 'wrong-host'; readonly actualHost: string }
  | { readonly kind: 'non-github' }
  | { readonly kind: 'symlink-escape' };

interface PersistedEditorPane {
  id: string;
  openTabs: string[];
  pinnedTabIds: string[];
  activeTabId: string | null;
  size: number;
}

interface ProjectSessionState {
  updatedAt: string | null;
  panes: PersistedEditorPane[];
  focusedPaneId: string;
}

export type SpawnOutcome =
  | { ok: true }
  | { ok: false; reason: 'invalid-path' | 'not-installed' | 'timeout' | 'spawn-error' };

export interface HandoffStatsLine {
  readonly target: 'claude-cowork' | 'claude-code' | 'codex' | 'cursor';
  readonly host: 'electron' | 'web';
  readonly outcome: 'ok' | 'error';
  readonly ts: string;
  readonly reason?: HandoffFailureReason;
  readonly scope?: HandoffScope;
}

export type McpWiringEditorId = EditorId;

type OnboardingWarningKind = 'home-documents' | 'home-desktop' | 'home-downloads' | 'volumes-mount';

type OnboardingGitState = 'present' | 'absent' | 'shell-only';

export interface OnboardingShowPayload {
  readonly pickedPath: string;
  readonly projectDir: string;
  readonly defaultContentDir: string;
  readonly gitState: OnboardingGitState;
  readonly gitRootPromoted: boolean;
  readonly warnings: readonly { readonly kind: OnboardingWarningKind }[];
}

export interface OnboardingConfirmRequest {
  readonly initGit: boolean;
  readonly contentDir: string;
  readonly additionalIgnores: string;
  readonly editorIds: readonly McpWiringEditorId[];
  readonly connectEditors: boolean;
  readonly sharing: 'shared' | 'local-only';
}

export type OnboardingConfirmResult = { ok: true } | { ok: false; error: string };

export type OnboardingCancelResult = { ok: true } | { ok: false; error: string };

export interface OnboardingProbeContentRequest {
  readonly contentDir: string;
}

export type OnboardingProbeContentResult =
  | {
      readonly ok: true;
      readonly count: number;
      readonly sample: readonly string[];
      readonly truncated: boolean;
    }
  | { readonly ok: false; readonly error: string };

export interface McpWiringEditorDetection {
  readonly id: McpWiringEditorId;
  readonly label: string;
  readonly detected: boolean;
  readonly willReplace: boolean;
  readonly configPath: string | null;
  readonly entryLocator: string;
}

export interface McpWiringPathInstallDescriptor {
  readonly shellDetected: boolean;
  readonly rcFilesToTouch: readonly string[];
  readonly alreadyInstalled: boolean;
}

export interface McpWiringConfirmRequest {
  readonly editorIds: readonly McpWiringEditorId[];
  readonly pathInstall?: boolean;
  readonly skills?: readonly string[];
}

export interface McpWiringGlobalSkillDescriptor {
  readonly id: string;
  readonly name: string;
  readonly paths: readonly string[];
}

export type McpWiringConfirmResult = { ok: true } | { ok: false; error: string };
export type McpWiringSkipResult = { ok: true } | { ok: false; error: string };

export type IntegrationsEditorState = 'installed' | 'not-installed' | 'foreign' | 'unmanageable';

export interface IntegrationsEditorStatus {
  readonly id: McpWiringEditorId;
  readonly label: string;
  readonly detected: boolean;
  readonly state: IntegrationsEditorState;
  readonly configPath: string | null;
  readonly entryLocator: string;
}

export interface IntegrationsPathStatus {
  readonly shellDetected: boolean;
  readonly rcFilesToTouch: readonly string[];
  readonly installed: boolean;
}

export interface IntegrationsResolvedSkillHost {
  readonly editor: string;
  readonly skillsRoot: string;
  readonly custom: boolean;
}

export interface IntegrationsSkillStatus {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly installed: boolean;
  readonly onboarding: boolean;
  readonly paths: readonly string[];
  readonly size?: SkillCostTiers;
  readonly sourceDir: string;
  readonly resolvedHosts: readonly IntegrationsResolvedSkillHost[];
}

export interface IntegrationsStatus {
  readonly available: boolean;
  readonly editors: readonly IntegrationsEditorStatus[];
  readonly path: IntegrationsPathStatus;
  readonly skills: readonly IntegrationsSkillStatus[];
  readonly detectedEditorIds: readonly McpWiringEditorId[];
}

export type IntegrationsComponentRef =
  | { readonly kind: 'editor'; readonly id: McpWiringEditorId }
  | { readonly kind: 'path' }
  | { readonly kind: 'skill'; readonly id: string };

export interface IntegrationsSetRequest {
  readonly component: IntegrationsComponentRef;
  readonly enabled: boolean;
}

export type IntegrationsSetResult =
  | { readonly ok: true; readonly status: IntegrationsStatus }
  | { readonly ok: false; readonly error: string; readonly status: IntegrationsStatus };

export interface ProjectIntegrationsEditorStatus {
  readonly id: McpWiringEditorId;
  readonly label: string;
  readonly detected: boolean;
  readonly state: IntegrationsEditorState;
  readonly configPath: string;
  readonly entryLocator: string;
}

export interface ProjectIntegrationsSkillStatus {
  readonly installed: boolean;
  readonly paths: readonly string[];
  readonly description: string;
  readonly hosts: readonly string[];
  readonly size?: SkillCostTiers;
  readonly sourceDir?: string;
}

export interface ProjectIntegrationsStatus {
  readonly available: boolean;
  readonly hasProject: boolean;
  readonly projectDir: string | null;
  readonly editors: readonly ProjectIntegrationsEditorStatus[];
  readonly skill: ProjectIntegrationsSkillStatus | null;
}

export type ProjectIntegrationsComponentRef =
  | { readonly kind: 'editor'; readonly id: McpWiringEditorId }
  | { readonly kind: 'skill' };

export interface ProjectIntegrationsSetRequest {
  readonly component: ProjectIntegrationsComponentRef;
  readonly enabled: boolean;
}

export type ProjectIntegrationsSetResult =
  | { readonly ok: true; readonly status: ProjectIntegrationsStatus }
  | { readonly ok: false; readonly error: string; readonly status: ProjectIntegrationsStatus };

export interface AgentIntegrationsIntent {
  readonly satisfierId: string;
  readonly desired: 'present' | 'absent';
}

export interface AgentIntegrationsApplyRequest {
  readonly intents: readonly AgentIntegrationsIntent[];
}

export type AgentIntegrationsApplyResult =
  | { readonly ok: true; readonly report: ApplyReport; readonly snapshot: HostSnapshot }
  | {
      readonly ok: false;
      readonly error: string;
      readonly unavailable?: boolean;
      readonly devBuild?: boolean;
      readonly report: ApplyReport;
      readonly snapshot: HostSnapshot;
    };

interface DialogOpenFolderOpts {
  readonly defaultPath?: string;
}

export type PsUpdateDispatchRequest =
  | { readonly kind: 'relaunch-now' }
  | { readonly kind: 'check-now' }
  | { readonly kind: 'whats-new-dismiss'; readonly version: string }
  | { readonly kind: 'downloaded-dismiss'; readonly version: string }
  | { readonly kind: 'set-mode'; readonly mode: PsUpdateMode };

export type PsUpdateSetModeFailure = 'unrecognized-mode' | 'persist-failed';

export type PsUpdateDispatchResult =
  | { readonly kind: 'relaunch-now' }
  | { readonly kind: 'check-now' }
  | { readonly kind: 'whats-new-dismiss' }
  | { readonly kind: 'downloaded-dismiss' }
  | { readonly kind: 'set-mode'; readonly ok: true; readonly mode: PsUpdateMode }
  | { readonly kind: 'set-mode'; readonly ok: false; readonly reason: PsUpdateSetModeFailure }
  | { readonly kind: 'unknown'; readonly ok: false; readonly reason: 'unrecognized-kind' };

export type UserConfigDispatchRequest =
  | { kind: 'set-language-preference'; preference: LanguagePreference }
  | { kind: 'read' }
  | { kind: 'subscribe' }
  | { kind: 'unsubscribe' }
  | { kind: 'patch'; patch: ConfigPatch };

export const TYPED_IPC_MIGRATION_CHANNEL_CAP = 95;

export interface RequestChannels {
  'ps:dialog:open-folder': {
    args: [opts?: DialogOpenFolderOpts];
    result: string | null;
  };
  'ps:shell:open-external': { args: [url: string]; result: undefined };
  'ps:shell:detect-protocol': {
    args: [scheme: string];
    result: { installed: boolean; displayName?: string };
  };
  'ps:shell:spawn-cursor': { args: [path: string]; result: SpawnOutcome };
  'ps:shell:show-item-in-folder': { args: [path: string]; result: undefined };
  'ps:shell:record-handoff': { args: [line: HandoffStatsLine]; result: undefined };
  'ps:shell:open-asset': {
    args: [relPath: string];
    result: PsAssetOpenResult;
  };
  'ps:shell:reveal-asset': {
    args: [relPath: string];
    result: { ok: true } | { ok: false; reason: 'path-escape' | 'not-found' | 'resolve-error' };
  };
  'ps:shell:reveal-external': {
    args: [absPath: string];
    result:
      | { ok: true; outcome: 'revealed' | 'dismissed' }
      | { ok: false; reason: 'not-found' | 'invalid-path' | 'error' };
  };
  'ps:shell:show-asset-menu': {
    args: [
      params: {
        readonly relPath: string;
        readonly title: string;
        readonly kind: 'asset' | 'wiki-link' | 'image';
      },
    ];
    result: undefined;
  };
  'ps:shell:trash-item': {
    args: [absPath: string];
    result:
      | { ok: true }
      | {
          ok: false;
          reason: 'not-found' | 'permission-denied' | 'system-error' | 'path-escape';
          detail?: string;
        };
  };
  'ps:clipboard:write-text': { args: [text: string]; result: undefined };
  'ps:clipboard:copy-image': { args: [request: CopyImageRequest]; result: CopyImageResult };
  'ps:project:get-info': { args: []; result: PsDesktopConfig };

  'ps:sharing:dispatch': {
    args: [request: { kind: 'status' } | { kind: 'set-mode'; mode: 'shared' | 'local-only' }];
    result: PsSharingResult;
  };
  'ps:slides:dispatch': {
    args: [request: { kind: 'status' } | { kind: 'open'; docPath: string }];
    result: PsSlidesStatusResult | PsSlidesOpenResult;
  };
  'ps:bug-report:dispatch': {
    args: [request: PsBugReportRequest];
    result:
      | PsBugReportCreateResult
      | PsBugReportSendResult
      | PsBugReportCrashAckResult
      | PsBugReportCrashDumpAvailability
      | PsBugReportScreenshot
      | PsBugReportListResult
      | PsBugReportDeleteResult
      | PsAssetUploadResult
      | null;
  };
  'ps:project:list-recent': { args: []; result: RecentProject[] };
  'ps:project:remove-recent': { args: [projectPath: string]; result: undefined };
  'ps:project:get-session-state': { args: []; result: ProjectSessionState };
  'ps:project:set-session-state': { args: [state: ProjectSessionState]; result: undefined };
  'ps:project:open': { args: [request: ProjectOpenRequest]; result: undefined };
  'ps:project:open-file-picker': { args: []; result: undefined };
  'ps:project:check-target-exists': {
    args: [request: { projectPath: string; kind: 'doc' | 'folder'; path: string }];
    result: CheckTargetExistsResult;
  };
  'ps:project:read-head-branch': {
    args: [projectPath: string];
    result: HeadBranchInfo;
  };
  'ps:project:fetch-branch-info': {
    args: [request: { projectPath: string; branch: string; kind: 'doc' | 'folder'; path: string }];
    result: BranchInfoResponse | null;
  };
  'ps:project:run-checkout': {
    args: [request: { projectPath: string; branch: string; fastForward?: boolean }];
    result: CheckoutResponse | null;
  };
  'ps:project:fetch-target-status': {
    args: [request: { projectPath: string; branch: string; path: string; kind: 'doc' | 'folder' }];
    result: ShareTargetStatusResponse | null;
  };
  'ps:project:await-branch-switched': {
    args: [request: { projectPath: string; branch: string; timeoutMs: number }];
    result: { ok: true } | { ok: false; reason: 'timeout' | 'project-not-open' };
  };
  'ps:project:ps-init': {
    args: [request: { projectPath: string }];
    result: LocalOpPsInitResponse;
  };
  'ps:worktree:dispatch': {
    args: [
      request:
        | { kind: 'list' }
        | ({ kind: 'inventory' } & WorktreeInventoryRequest)
        | ({ kind: 'open-inventory' } & WorktreeInventoryOpenRequest)
        | ({ kind: 'create' } & WorktreeCreateRequest)
        | { kind: 'checkout'; branch: string },
    ];
    result:
      | WorktreeListResult
      | WorktreeInventoryResult
      | WorktreeInventoryOpenResult
      | WorktreeCreateResult;
  };
  'ps:project:close': { args: []; result: undefined };
  'ps:project:restart-server': { args: [projectPath: string]; result: PsServerRestartOutcome };
  'ps:share:validate-folder': {
    args: [request: ShareValidateFolderRequest];
    result: ShareValidateFolderResult;
  };
  'ps:project:create-new': {
    args: [
      args: {
        parent: string;
        name: string;
        editors: readonly McpWiringEditorId[];
        sharing?: 'shared' | 'local-only';
        packId?: PackId;
        rootDir?: string;
      },
    ];
    result: undefined;
  };
  'ps:fs:default-projects-root': { args: []; result: string };
  'ps:fs:folder-state': {
    args: [path: string];
    result: PsFolderState;
  };
  'ps:fs:find-enclosing-project-root': {
    args: [path: string];
    result: FindEnclosingProjectRootResult | null;
  };
  'ps:fs:find-enclosing-git-root': {
    args: [path: string];
    result: FindEnclosingGitRootResult | null;
  };
  'ps:fs:remove-git-folder': {
    args: [gitRoot: string];
    result: undefined;
  };
  'ps:project:record-create-new-banner-shown': {
    args: [banner: CreateNewBannerKind];
    result: undefined;
  };
  'ps:navigator:open': { args: []; result: undefined };
  'ps:window:open-note': {
    args: [
      request:
        | { kind: 'open'; docName: string; entryPoint: 'tab-menu' | 'palette' }
        | { kind: 'dispatch-to-main'; action: PsNoteWindowMainAction },
    ];
    result:
      | { ok: true; outcome: 'created' | 'focused' }
      | { ok: false; reason: 'no-project' | 'invalid-request' }
      | PsNoteWindowMainActionResult;
  };
  'ps:update:dispatch': {
    args: [request: PsUpdateDispatchRequest];
    result: PsUpdateDispatchResult;
  };
  'ps:state:query': { args: []; result: Required<PsStateSnapshot> };
  'ps:state:reset-incompatible': { args: []; result: undefined };
  'ps:theme:set-source': { args: [params: { source: PsThemeSource }]; result: { ok: true } };
  'ps:user-config:dispatch': {
    args: [request: UserConfigDispatchRequest];
    result: { ok: true } | PsUserConfigSnapshot | PsUserConfigPatchResult;
  };
  'ps:theme:applied': {
    args: [opts?: { reducedTransparency?: boolean; chrome?: PsChromeColors }];
    result: undefined;
  };
  'ps:startup:renderer-marks': {
    args: [marks: { pageListReadyMs: number; firstContentMs: number }];
    result: undefined;
  };
  'ps:debug:keyring-smoke': { args: []; result: KeyringSmokeResult };
  'ps:seed:plan': { args: [options?: SeedPlanOptions]; result: SeedPlanResult };
  'ps:seed:apply': {
    args: [plan: ScaffoldPlan, options?: SeedApplyOptions];
    result: SeedApplyResult;
  };
  'ps:seed:list-packs': { args: []; result: SeedListPacksResult };
  'ps:mcp-wiring:confirm': {
    args: [request: McpWiringConfirmRequest];
    result: McpWiringConfirmResult;
  };
  'ps:mcp-wiring:skip': { args: []; result: McpWiringSkipResult };
  'ps:mcp-wiring:renderer-ready': { args: []; result: undefined };

  'ps:mcp-wiring:reconfigure': { args: []; result: boolean };
  'ps:spellcheck:toggle': { args: []; result: boolean };

  'ps:integrations:dispatch': {
    args: [
      request:
        | { kind: 'status' }
        | ({ kind: 'set' } & IntegrationsSetRequest)
        | ({ kind: 'apply-batch' } & AgentIntegrationsApplyRequest),
    ];
    result: IntegrationsStatus | IntegrationsSetResult | AgentIntegrationsApplyResult;
  };

  'ps:project-integrations:dispatch': {
    args: [request: { kind: 'status' } | ({ kind: 'set' } & ProjectIntegrationsSetRequest)];
    result: ProjectIntegrationsStatus | ProjectIntegrationsSetResult;
  };

  'ps:remote-access:dispatch': {
    args: [request: { kind: 'probe-port'; port: number }];
    result: boolean;
  };

  'ps:onboarding:confirm': {
    args: [request: OnboardingConfirmRequest];
    result: OnboardingConfirmResult;
  };
  'ps:onboarding:cancel': { args: []; result: OnboardingCancelResult };
  'ps:onboarding:renderer-ready': { args: []; result: undefined };
  'ps:onboarding:probe-content': {
    args: [request: OnboardingProbeContentRequest];
    result: OnboardingProbeContentResult;
  };

  'ps:skill:detect-claude-desktop': { args: []; result: boolean };

  'ps:skill:build-and-open': { args: [opts?: { force?: boolean }]; result: BuildAndOpenResult };

  'ps:local-op:auth:start': {
    args: [];
    result: { ok: true; streamId: string } | { ok: false; error: string };
  };
  'ps:local-op:auth:cancel': { args: [streamId: string]; result: undefined };
  'ps:local-op:clone:start': {
    args: [request: { url: string; dir: string; branch?: string | null }];
    result: { ok: true; streamId: string } | { ok: false; error: string };
  };
  'ps:local-op:clone:cancel': { args: [streamId: string]; result: undefined };

  'ps:local-op:auth:status': {
    args: [request?: { host?: string }];
    result: PsLocalOpAuthStatusResponse;
  };
  'ps:local-op:auth:repos': {
    args: [request?: { host?: string }];
    result: PsLocalOpAuthReposResponse;
  };

  'ps:editor:active-target-changed': {
    args: [target: EditorActiveTargetSnapshot];
    result: undefined;
  };
  'ps:editor:view-menu-state-changed': {
    args: [state: EditorViewMenuStateChange];
    result: undefined;
  };
  'ps:editor:background-throttle': {
    args: [signal: { hasPendingWork: boolean; enabled: boolean }];
    result: undefined;
  };
  'ps:menu:dispatch': {
    args: [request: MenuDispatchRequest];
    result: MenuDispatchResult;
  };

  'ps:uninstall:dispatch': {
    args: [request: UninstallDispatchRequest];
    result: UninstallDispatchResult;
  };

  'ps:pty:create': {
    args: [
      opts: {
        cols: number;
        rows: number;
        launchCommand?: string | TerminalLaunchCommand;
        launchCli?: TerminalCli;
      },
    ];
    result: PsPtyCreateResult;
  };
  'ps:pty:input': {
    args: [req: { ptyId: string; data: string }];
    result: undefined;
  };
  'ps:pty:resize': {
    args: [req: { ptyId: string; cols: number; rows: number }];
    result: undefined;
  };
  'ps:pty:kill': {
    args: [req: { ptyId: string }];
    result: undefined;
  };
  'ps:pty:drain': {
    args: [req: { ptyId: string; bytes: number }];
    result: undefined;
  };
  'ps:pty:list': {
    args: [];
    result: PsPtyListEntry[];
  };
  'ps:pty:adopt': {
    args: [req: { ptyId: string; start?: boolean }];
    result: PsPtyAdoptResult;
  };
  'ps:pty:set-meta': {
    args: [req: { ptyId: string; customLabel?: string | null; ordinal?: number }];
    result: undefined;
  };
  'ps:pty:set-order': {
    args: [req: { orderedPtyIds: string[] }];
    result: undefined;
  };
  'ps:terminal:claude-assist': {
    args: [req: { action: 'preflight' }];
    result: ClaudeReadiness;
  };
  'ps:terminal:cli-preflight': {
    args: [req: { cli: TerminalCli }];
    result: CliReadiness;
  };
  'ps:terminal:cli-installed-map': {
    args: [];
    result: Partial<Record<TerminalCli, boolean>>;
  };
  'ps:terminal:dock-state': {
    args: [];
    result: PsTerminalDockState;
  };
  'ps:terminal:set-dock-state': {
    args: [req: PsTerminalDockStateUpdate];
    result: PsTerminalDockStateWriteResult;
  };
}
