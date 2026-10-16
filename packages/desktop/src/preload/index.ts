import type {
  ConfigPatch,
  HandoffHostPlatform,
  LanguagePreference,
  PsBugReportCrashAckResult,
  PsBugReportCrashDetectedEvent,
  PsBugReportCrashDumpAvailability,
  PsBugReportCreateResult,
  PsBugReportDeleteResult,
  PsBugReportListResult,
  PsBugReportScreenshot,
  PsBugReportSendResult,
  WorktreeCreateRequest,
  WorktreeCreateResult,
  WorktreeListResult,
} from '@palimpsest/core';
import {
  contextBridge,
  crashReporter,
  type IpcRendererEvent,
  ipcRenderer,
  webUtils,
} from 'electron';
import type {
  PsAssetUploadRequest,
  PsAssetUploadResult,
  PsChromeColors,
  PsDeepLinkPayload,
  PsDesktopBridge,
  PsDesktopConfig,
  PsEditorActiveTargetSnapshot,
  PsEditorViewMenuStateChange,
  PsLocalOpAuthEvent,
  PsLocalOpCloneEvent,
  PsLocalOpStream,
  PsMcpWiringShowPayload,
  PsMenuAction,
  PsMenuActionDispatch,
  PsMenuActionOrigin,
  PsMenuUiDispatchRequest,
  PsNoteWindowMainAction,
  PsNoteWindowMainActionResult,
  PsOnboardingShowPayload,
  PsOnboardingToastPayload,
  PsPtyData,
  PsPtyExit,
  PsPtyNotice,
  PsRecentRemovedMissingInfo,
  PsServerRestartedInfo,
  PsServerVersionDriftInfo,
  PsShareReceivedPayload,
  PsThemeSource,
  PsUserConfigPatchResult,
  PsUserConfigSnapshot,
} from '../shared/bridge-contract.ts';
import {
  DISPLAY_LOCK_CRASH_KEY,
  DISPLAY_LOCK_CRASH_KEY_MAX_BYTES,
} from '../shared/display-lock-crash-key.ts';
import type {
  AgentIntegrationsApplyResult,
  IntegrationsSetResult,
  IntegrationsStatus,
  ProjectIntegrationsSetResult,
  ProjectIntegrationsStatus,
} from '../shared/ipc-channels.ts';
import { createInvoker } from '../shared/ipc-invoke.ts';
import {
  asMenuRendererSnapshot,
  asSpellcheckEnabledSetResult,
  asSpellingLanguagesQueryResult,
  asSpellingLanguagesSetResult,
} from '../shared/menu-dispatch-results.ts';
import {
  CLI_COMMAND_NAME_ARG_NAME,
  LANGUAGE_PREFERENCE_ARG_NAME,
  MCP_SERVER_NAME_ARG_NAME,
  resolvePsDesktopMode,
  resolvePsThemePreference,
  THEME_PREFERENCE_ARG_NAME,
} from '../shared/ps-desktop-argv.ts';
import { isUninstallPreload } from '../shared/uninstall-preload-arg.ts';
import { createSlidesBridge } from './slides-bridge.ts';
import { createUninstallBridge } from './uninstall.ts';

const invoke = createInvoker(ipcRenderer);

function isDockStateIpcTeardown(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return /destroyed|disposed|closed|no handler registered/i.test(error.message);
}

function createIpcEventStream<E extends { type: string }>(
  startResultPromise: Promise<{ ok: true; streamId: string } | { ok: false; error: string }>,
  eventChannel: 'ps:local-op:auth:event' | 'ps:local-op:clone:event',
  cancelChannel: 'ps:local-op:auth:cancel' | 'ps:local-op:clone:cancel',
): PsLocalOpStream<E> {
  const buffer: E[] = [];
  const waiters: ((event: E | null) => void)[] = [];
  let terminated = false;
  let myStreamId: string | null = null;
  let listenerAttached = false;

  const push = (event: E): void => {
    if (terminated) return;
    if (waiters.length > 0) {
      const next = waiters.shift();
      next?.(event);
    } else {
      buffer.push(event);
    }
    if (event.type === 'complete' || event.type === 'error') {
      terminated = true;
      detach();
      for (const w of waiters.splice(0)) w(null);
    }
  };

  const listener = (_event: IpcRendererEvent, payload: { streamId: string; event: E }): void => {
    if (myStreamId === null || payload.streamId !== myStreamId) return;
    push(payload.event);
  };

  const detach = (): void => {
    if (listenerAttached) {
      ipcRenderer.removeListener(eventChannel, listener);
      listenerAttached = false;
    }
  };

  // oxlint-disable-next-line ps/no-loosely-typed-webcontents-ipc -- preload-side subscription wrapper (precedent #14)
  ipcRenderer.on(eventChannel, listener);
  listenerAttached = true;

  startResultPromise
    .then((result) => {
      if (!result.ok) {
        push({ type: 'error', message: result.error } as unknown as E);
        return;
      }
      myStreamId = result.streamId;
    })
    .catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      push({ type: 'error', message: `IPC error: ${message}` } as unknown as E);
    });

  const events: AsyncIterable<E> = {
    [Symbol.asyncIterator]() {
      return {
        async next(): Promise<IteratorResult<E>> {
          if (buffer.length > 0) {
            const value = buffer.shift();
            if (value === undefined) return { value: undefined, done: true };
            return { value, done: false };
          }
          if (terminated) return { value: undefined, done: true };
          return new Promise<IteratorResult<E>>((resolve) => {
            waiters.push((event) => {
              if (event === null) resolve({ value: undefined, done: true });
              else resolve({ value: event, done: false });
            });
          });
        },
      };
    },
  };

  return {
    events,
    cancel: () => {
      if (terminated) return;
      terminated = true;
      detach();
      for (const w of waiters.splice(0)) w(null);
      if (myStreamId !== null) {
        invoke(cancelChannel, myStreamId).catch(() => {});
        return;
      }
      void startResultPromise.then((result) => {
        if (result.ok) invoke(cancelChannel, result.streamId).catch(() => {});
      });
    },
  };
}

function createLocalOpAuthStream(): PsLocalOpStream<PsLocalOpAuthEvent> {
  return createIpcEventStream<PsLocalOpAuthEvent>(
    invoke('ps:local-op:auth:start'),
    'ps:local-op:auth:event',
    'ps:local-op:auth:cancel',
  );
}

function createLocalOpCloneStream(request: {
  url: string;
  dir: string;
  branch?: string | null;
}): PsLocalOpStream<PsLocalOpCloneEvent> {
  return createIpcEventStream<PsLocalOpCloneEvent>(
    invoke('ps:local-op:clone:start', request),
    'ps:local-op:clone:event',
    'ps:local-op:clone:cancel',
  );
}

function parseArg(name: string): string | undefined {
  const prefix = `--ok-${name}=`;
  const arg = process.argv.find((a) => a.startsWith(prefix));
  return arg?.slice(prefix.length);
}

function readConfigFromArgv(): PsDesktopConfig {
  const collabUrl = parseArg('collab-url') ?? '';
  const apiOrigin = parseArg('api-origin') ?? '';
  const projectPath = parseArg('project-path') ?? '';
  const projectName = parseArg('project-name') ?? '';
  const mode = resolvePsDesktopMode(parseArg('mode'));
  const singleFile = parseArg('single-file') === '1';
  const languagePreference = parseArg(LANGUAGE_PREFERENCE_ARG_NAME) as
    | LanguagePreference
    | undefined;
  const themePreference = resolvePsThemePreference(parseArg(THEME_PREFERENCE_ARG_NAME));
  const initialDoc = parseArg('initial-doc') ?? null;
  const freshlyCreated = parseArg('fresh-create') === '1';
  const e2eSmoke = parseArg('e2e-smoke') === '1';
  const startupTraceparent = parseArg('startup-traceparent');
  const ptyAvailable = parseArg('pty-available') === '1';
  return Object.freeze({
    collabUrl,
    apiOrigin,
    projectPath,
    projectName,
    mode,
    e2eSmoke,
    singleFile,
    initialDoc,
    freshlyCreated,
    ptyAvailable,
    ...(startupTraceparent !== undefined ? { startupTraceparent } : {}),
    ...(languagePreference !== undefined ? { languagePreference } : {}),
    ...(themePreference === undefined ? {} : { themePreference }),
  });
}

/*
 * UPSTREAM(electron/electron#25516): `contextBridge` captures plain values at
 * exposure time, so this has to reach the renderer as a method whose closure
 * reads the live binding rather than as a field on the frozen config.
 */
let screenReaderActive = parseArg('screen-reader-active') === '1';
// oxlint-disable-next-line ps/no-loosely-typed-webcontents-ipc -- preload-side subscription wrapper (precedent #14)
ipcRenderer.on('ps:accessibility:changed', (_event, info: { screenReaderActive: boolean }) => {
  screenReaderActive = info.screenReaderActive === true;
});

const MAX_BUFFERED_MENU_ACTIONS = 32;

type MenuActionBufferPolicy = 'never-buffer' | 'parity' | 'additive';

const MENU_ACTION_BUFFER_POLICY: Record<PsMenuAction, MenuActionBufferPolicy> = {
  delete: 'never-buffer',
  'move-to-trash': 'never-buffer',
  'close-active-tab-or-window': 'never-buffer',
  'kill-terminal': 'never-buffer',

  'toggle-sidebar': 'parity',
  'toggle-source': 'parity',
  'toggle-doc-panel': 'parity',
  'toggle-terminal': 'parity',
  'toggle-agent-panel': 'parity',
  'toggle-editor': 'parity',
  'toggle-show-hidden-files': 'parity',
  'toggle-show-ps-folders': 'parity',
  'toggle-show-only-markdown-files': 'parity',
  'toggle-show-skills-section': 'parity',
  'move-terminal': 'parity',

  'new-doc': 'additive',
  'new-folder': 'additive',
  'new-project': 'additive',
  rename: 'additive',
  'save-version': 'additive',
  'version-history': 'additive',
  'focus-search': 'additive',
  'focus-command-palette': 'additive',
  'navigate-back': 'additive',
  'navigate-forward': 'additive',
  'new-from-template': 'additive',
  duplicate: 'additive',
  'reveal-in-finder': 'additive',
  'send-to-ai': 'additive',
  'copy-full-path': 'additive',
  'copy-relative-path': 'additive',
  'expand-all-tree': 'additive',
  'collapse-all-tree': 'additive',
  'new-terminal': 'additive',
  'new-worktree': 'additive',
  'switch-worktree': 'additive',
  'report-bug': 'additive',
  'send-feedback': 'additive',
};

const menuActionListeners = new Set<(action: PsMenuAction, origin: PsMenuActionOrigin) => void>();
function deliverMenuAction(dispatch: PsMenuActionDispatch): void {
  for (const listener of menuActionListeners) {
    try {
      listener(dispatch.action, dispatch.origin);
    } catch (err) {
      console.error('[preload:menu-action] listener threw during dispatch:', err);
    }
  }
}

const bufferedMenuActions: PsMenuActionDispatch[] = [];

// oxlint-disable-next-line ps/no-loosely-typed-webcontents-ipc -- preload-side subscription wrapper (precedent #14)
ipcRenderer.on('ps:menu-action', (_event, dispatch: PsMenuActionDispatch) => {
  if (menuActionListeners.size > 0) {
    deliverMenuAction(dispatch);
    return;
  }
  const policy = MENU_ACTION_BUFFER_POLICY[dispatch.action];
  if (policy === 'never-buffer') {
    console.debug(
      '[preload:menu-action] destructive action dropped, nothing listening:',
      dispatch.action,
    );
    return;
  }
  if (policy === 'parity' && bufferedMenuActions.at(-1)?.action === dispatch.action) return;
  if (bufferedMenuActions.length >= MAX_BUFFERED_MENU_ACTIONS) bufferedMenuActions.shift();
  bufferedMenuActions.push(dispatch);
});

const bridge: PsDesktopBridge = {
  config: readConfigFromArgv(),

  onProjectSwitched(cb: (next: PsDesktopConfig) => void) {
    /*
     * UPSTREAM(electron/electron#33328): `removeListener` matches on the exact
     * function registered, so the wrapper — not `cb` — is what both calls use.
     */
    const listener = (_event: IpcRendererEvent, next: PsDesktopConfig) => cb(next);
    // oxlint-disable-next-line ps/no-loosely-typed-webcontents-ipc -- preload-side subscription wrapper (precedent #14)
    ipcRenderer.on('ps:project:switched', listener);
    return () => ipcRenderer.removeListener('ps:project:switched', listener);
  },

  onMenuAction(cb: (action: PsMenuAction, origin: PsMenuActionOrigin) => void) {
    const wasUnlistened = menuActionListeners.size === 0;
    menuActionListeners.add(cb);
    if (wasUnlistened && bufferedMenuActions.length > 0) {
      const replay = bufferedMenuActions.splice(0, bufferedMenuActions.length);
      queueMicrotask(() => {
        if (menuActionListeners.size === 0) {
          bufferedMenuActions.unshift(...replay);
          return;
        }
        for (const dispatch of replay) deliverMenuAction(dispatch);
      });
    }
    return () => {
      menuActionListeners.delete(cb);
    };
  },

















  onDeepLink(cb: (evt: PsDeepLinkPayload) => void) {
    const listener = (_event: IpcRendererEvent, evt: PsDeepLinkPayload) => cb(evt);
    // oxlint-disable-next-line ps/no-loosely-typed-webcontents-ipc -- preload-side subscription wrapper (precedent #14)
    ipcRenderer.on('ps:deep-link', listener);
    return () => ipcRenderer.removeListener('ps:deep-link', listener);
  },

  onShareReceived(cb: (payload: PsShareReceivedPayload) => void) {
    const listener = (_event: IpcRendererEvent, payload: PsShareReceivedPayload) => cb(payload);
    // oxlint-disable-next-line ps/no-loosely-typed-webcontents-ipc -- preload-side subscription wrapper (precedent #14)
    ipcRenderer.on('ps:share:received', listener);
    return () => ipcRenderer.removeListener('ps:share:received', listener);
  },

  onServerVersionDrift(cb: (info: PsServerVersionDriftInfo) => void) {
    const listener = (_event: IpcRendererEvent, info: PsServerVersionDriftInfo) => cb(info);
    // oxlint-disable-next-line ps/no-loosely-typed-webcontents-ipc -- preload-side subscription wrapper (precedent #14)
    ipcRenderer.on('ps:server-version-drift', listener);
    return () => ipcRenderer.removeListener('ps:server-version-drift', listener);
  },

  onServerRestarted(cb: (info: PsServerRestartedInfo) => void) {
    const listener = (_event: IpcRendererEvent, info: PsServerRestartedInfo) => cb(info);
    // oxlint-disable-next-line ps/no-loosely-typed-webcontents-ipc -- preload-side subscription wrapper (precedent #14)
    ipcRenderer.on('ps:server-restarted', listener);
    return () => ipcRenderer.removeListener('ps:server-restarted', listener);
  },

  onRecentRemovedMissing(cb: (info: PsRecentRemovedMissingInfo) => void) {
    const listener = (_event: IpcRendererEvent, info: PsRecentRemovedMissingInfo) => cb(info);
    // oxlint-disable-next-line ps/no-loosely-typed-webcontents-ipc -- preload-side subscription wrapper (precedent #14)
    ipcRenderer.on('ps:project:recent-removed-missing', listener);
    return () => ipcRenderer.removeListener('ps:project:recent-removed-missing', listener);
  },

  restartServer: (projectPath: string) => invoke('ps:project:restart-server', projectPath),

  setThemeSource: (source: PsThemeSource) => invoke('ps:theme:set-source', { source }),

  setLanguagePreference: (preference: LanguagePreference) =>
    invoke('ps:user-config:dispatch', { kind: 'set-language-preference', preference }) as Promise<{
      ok: true;
    }>,

  userConfig: {
    read: () =>
      invoke('ps:user-config:dispatch', { kind: 'read' }) as Promise<PsUserConfigSnapshot>,
    patch: (patch: ConfigPatch) =>
      invoke('ps:user-config:dispatch', {
        kind: 'patch',
        patch,
      }) as Promise<PsUserConfigPatchResult>,
    onChanged(cb: (snapshot: PsUserConfigSnapshot) => void) {
      const listener = (_event: IpcRendererEvent, snapshot: PsUserConfigSnapshot) => cb(snapshot);
      // oxlint-disable-next-line ps/no-loosely-typed-webcontents-ipc -- preload-side subscription wrapper (precedent #14)
      ipcRenderer.on('ps:user-config:changed', listener);
      invoke('ps:user-config:dispatch', { kind: 'subscribe' }).catch((err: unknown) => {
        console.warn(
          JSON.stringify({
            event: 'user-config-subscribe-failed',
            error: err instanceof Error ? err.message : String(err),
          }),
        );
      });
      return () => {
        ipcRenderer.removeListener('ps:user-config:changed', listener);
        invoke('ps:user-config:dispatch', { kind: 'unsubscribe' }).catch((err: unknown) => {
          console.warn(
            JSON.stringify({
              event: 'user-config-unsubscribe-failed',
              error: err instanceof Error ? err.message : String(err),
            }),
          );
        });
      };
    },
  },

  signalThemeApplied: (opts?: { reducedTransparency?: boolean; chrome?: PsChromeColors }) => {
    invoke('ps:theme:applied', opts).catch((err: unknown) => {
      console.warn(
        JSON.stringify({
          event: 'signal-theme-applied-failed',
          error: err instanceof Error ? err.message : String(err),
        }),
      );
    });
  },

  dialog: {
    openFolder: (opts) => invoke('ps:dialog:open-folder', opts),
  },

  shell: {
    openExternal: (url: string) => invoke('ps:shell:open-external', url),
    detectProtocol: (scheme: string) => invoke('ps:shell:detect-protocol', scheme),
    spawnCursor: (path: string) => invoke('ps:shell:spawn-cursor', path),
    recordHandoff: (line) => invoke('ps:shell:record-handoff', line),
    openAsset: (relPath: string) => invoke('ps:shell:open-asset', relPath),
    revealAsset: (relPath: string) => invoke('ps:shell:reveal-asset', relPath),
    revealExternal: (absPath: string) => invoke('ps:shell:reveal-external', absPath),
    showAssetMenu: (params) => invoke('ps:shell:show-asset-menu', params),
    showItemInFolder: (path: string) => invoke('ps:shell:show-item-in-folder', path),
    trashItem: (absPath: string) => invoke('ps:shell:trash-item', absPath),
  },

  clipboard: {
    writeText: (text: string) => invoke('ps:clipboard:write-text', text),
    copyImage: (params) => invoke('ps:clipboard:copy-image', params),
  },

  project: {
    listRecent: () => invoke('ps:project:list-recent'),
    removeRecent: (path: string) => invoke('ps:project:remove-recent', path),
    getSessionState: () => invoke('ps:project:get-session-state'),
    setSessionState: (state) => invoke('ps:project:set-session-state', state),
    open: (request) => invoke('ps:project:open', request),
    openFile: () => invoke('ps:project:open-file-picker'),
    createNew: (args) => invoke('ps:project:create-new', args),
    recordCreateNewBannerShown: (banner) =>
      invoke('ps:project:record-create-new-banner-shown', banner),
    checkTargetExists: (request) => invoke('ps:project:check-target-exists', request),
    readHeadBranch: (projectPath: string) => invoke('ps:project:read-head-branch', projectPath),
    fetchBranchInfo: (request) => invoke('ps:project:fetch-branch-info', request),
    runCheckout: (request) => invoke('ps:project:run-checkout', request),
    fetchTargetStatus: (request) => invoke('ps:project:fetch-target-status', request),
    awaitBranchSwitched: (request) => invoke('ps:project:await-branch-switched', request),
    psInit: (request) => invoke('ps:project:ps-init', request),
    close: () => invoke('ps:project:close'),
  },

  worktree: {
    list: () => invoke('ps:worktree:dispatch', { kind: 'list' }) as Promise<WorktreeListResult>,
    inventory: (request) =>
      invoke('ps:worktree:dispatch', {
        kind: 'inventory',
        ...request,
      }) as ReturnType<PsDesktopBridge['worktree']['inventory']>,
    openInventory: (request) =>
      invoke('ps:worktree:dispatch', {
        kind: 'open-inventory',
        ...request,
      }) as ReturnType<PsDesktopBridge['worktree']['openInventory']>,
    create: (request: WorktreeCreateRequest) =>
      invoke('ps:worktree:dispatch', {
        kind: 'create',
        ...request,
      }) as Promise<WorktreeCreateResult>,
    checkout: (request: { branch: string }) =>
      invoke('ps:worktree:dispatch', {
        kind: 'checkout',
        branch: request.branch,
      }) as Promise<WorktreeCreateResult>,
  },

  sharing: {
    status: async () => {
      const result = await invoke('ps:sharing:dispatch', { kind: 'status' });
      if (result.kind !== 'status') {
        throw new Error(`ps:sharing:dispatch: expected status, got ${result.kind}`);
      }
      return result;
    },
    setMode: async (mode: 'shared' | 'local-only') => {
      const result = await invoke('ps:sharing:dispatch', { kind: 'set-mode', mode });
      if (result.kind === 'status') {
        throw new Error('ps:sharing:dispatch: expected set-mode result, got status');
      }
      return result;
    },
  },

  slides: createSlidesBridge(invoke),

  bugReport: {
    create: (request: Parameters<PsDesktopBridge['bugReport']['create']>[0]) =>
      invoke('ps:bug-report:dispatch', {
        kind: 'create',
        level: request.level,
        note: request.note,
        includeCrashDump: request.includeCrashDump,
        includeScreenshot: request.includeScreenshot,
        attachments: request.attachments,
        agentChatThreadId: request.agentChatThreadId,
        crashEventId: request.crashEventId,
      }) as Promise<PsBugReportCreateResult>,
    captureScreenshot: () =>
      invoke('ps:bug-report:dispatch', {
        kind: 'capture-screenshot',
      }) as Promise<PsBugReportScreenshot | null>,
    crashDumpAvailability: () =>
      invoke('ps:bug-report:dispatch', {
        kind: 'crash-dump-availability',
      }) as Promise<PsBugReportCrashDumpAvailability>,
    send: (request: Parameters<PsDesktopBridge['bugReport']['send']>[0]) =>
      invoke('ps:bug-report:dispatch', {
        ...request,
        kind: 'send',
      }) as Promise<PsBugReportSendResult>,
    crashAck: (request: { eventId: string }) =>
      invoke('ps:bug-report:dispatch', {
        kind: 'crash-ack',
        eventId: request.eventId,
      }) as Promise<PsBugReportCrashAckResult>,
    list: () =>
      invoke('ps:bug-report:dispatch', { kind: 'list' }) as Promise<PsBugReportListResult>,
    delete: (id: string) =>
      invoke('ps:bug-report:dispatch', { kind: 'delete', id }) as Promise<PsBugReportDeleteResult>,
    onCrashDetected(cb: (event: PsBugReportCrashDetectedEvent) => void) {
      const listener = (_event: IpcRendererEvent, event: PsBugReportCrashDetectedEvent) =>
        cb(event);
      // oxlint-disable-next-line ps/no-loosely-typed-webcontents-ipc -- preload-side subscription wrapper (precedent #14)
      ipcRenderer.on('ps:bug-report:crash-detected', listener);
      return () => ipcRenderer.removeListener('ps:bug-report:crash-detected', listener);
    },
  },

  assetUpload: {
    uploadImage: (request: PsAssetUploadRequest) =>
      invoke('ps:bug-report:dispatch', {
        kind: 'upload-image',
        contentType: request.contentType,
        bytes: request.bytes,
        filename: request.filename,
      }) as Promise<PsAssetUploadResult>,
  },

  fs: {
    defaultProjectsRoot: () => invoke('ps:fs:default-projects-root'),
    folderState: (path: string) => invoke('ps:fs:folder-state', path),
    findEnclosingProjectRoot: (path: string) => invoke('ps:fs:find-enclosing-project-root', path),
    findEnclosingGitRoot: (path: string) => invoke('ps:fs:find-enclosing-git-root', path),
    removeGitFolder: (gitRoot: string) => invoke('ps:fs:remove-git-folder', gitRoot),
  },

  navigator: {
    open: () => invoke('ps:navigator:open'),
  },

  noteWindow: {
    open: async (docName: string, entryPoint: 'tab-menu' | 'palette') => {
      const result = await invoke('ps:window:open-note', { kind: 'open', docName, entryPoint });
      if (result.ok && !('outcome' in result)) {
        throw new Error('ps:window:open-note returned a non-open result for an open request');
      }
      return result as Awaited<ReturnType<PsDesktopBridge['noteWindow']['open']>>;
    },
    dispatchToMain: (action: PsNoteWindowMainAction) =>
      invoke('ps:window:open-note', {
        kind: 'dispatch-to-main',
        action,
      }) as Promise<PsNoteWindowMainActionResult>,
    onMainAction(cb: (action: PsNoteWindowMainAction) => void) {
      const listener = (_event: IpcRendererEvent, action: PsNoteWindowMainAction) => cb(action);
      // oxlint-disable-next-line ps/no-loosely-typed-webcontents-ipc -- preload-side subscription wrapper (precedent #14)
      ipcRenderer.on('ps:note-window:main-action', listener);
      return () => ipcRenderer.removeListener('ps:note-window:main-action', listener);
    },
  },

  seed: {
    plan: (options) => invoke('ps:seed:plan', options),
    apply: (plan, options) => invoke('ps:seed:apply', plan, options),
    listPacks: () => invoke('ps:seed:list-packs'),
  },

  skill: {
    detectClaudeDesktop: () => invoke('ps:skill:detect-claude-desktop'),
    buildAndOpen: (opts) => invoke('ps:skill:build-and-open', opts),
  },

  state: {
    query: () => invoke('ps:state:query'),
    resetIncompatible: () => invoke('ps:state:reset-incompatible'),
  },

  mcpWiring: {
    onShow(cb: (payload: PsMcpWiringShowPayload) => void) {
      const listener = (_event: IpcRendererEvent, payload: PsMcpWiringShowPayload) => cb(payload);
      // oxlint-disable-next-line ps/no-loosely-typed-webcontents-ipc -- preload-side subscription wrapper (precedent #14)
      ipcRenderer.on('ps:mcp-wiring:show', listener);
      return () => ipcRenderer.removeListener('ps:mcp-wiring:show', listener);
    },
    signalReady: () => {
      invoke('ps:mcp-wiring:renderer-ready').catch(() => {});
    },
    confirm: (request) =>
      invoke('ps:mcp-wiring:confirm', {
        editorIds: request.editorIds,
        pathInstall: request.pathInstall,
        skills: request.skills,
      }),
    skip: () => invoke('ps:mcp-wiring:skip'),
    reconfigure: () => invoke('ps:mcp-wiring:reconfigure'),
  },

  spellcheck: {
    toggle: () => invoke('ps:spellcheck:toggle'),
    languages: async () =>
      asSpellingLanguagesQueryResult(
        await invoke('ps:menu:dispatch', { kind: 'spelling-languages-query' }),
      ),
    setLanguages: async (languages: readonly string[]) =>
      asSpellingLanguagesSetResult(
        await invoke('ps:menu:dispatch', {
          kind: 'spelling-languages-set',
          languages: [...languages],
        }),
      ),
    setEnabled: async (enabled: boolean) =>
      asSpellcheckEnabledSetResult(
        await invoke('ps:menu:dispatch', { kind: 'spellcheck-enabled-set', enabled }),
      ),
  },

  integrations: {
    status: () =>
      invoke('ps:integrations:dispatch', { kind: 'status' }) as Promise<IntegrationsStatus>,
    setComponent: (request) =>
      invoke('ps:integrations:dispatch', {
        kind: 'set',
        component: request.component,
        enabled: request.enabled,
      }) as Promise<IntegrationsSetResult>,
  },

  projectIntegrations: {
    status: () =>
      invoke('ps:project-integrations:dispatch', {
        kind: 'status',
      }) as Promise<ProjectIntegrationsStatus>,
    setComponent: (request) =>
      invoke('ps:project-integrations:dispatch', {
        kind: 'set',
        component: request.component,
        enabled: request.enabled,
      }) as Promise<ProjectIntegrationsSetResult>,
  },

  agentIntegrations: {
    apply: (request) =>
      invoke('ps:integrations:dispatch', {
        kind: 'apply-batch',
        intents: request.intents,
      }) as Promise<AgentIntegrationsApplyResult>,
  },

  remoteAccess: {
    probePort: (port) =>
      invoke('ps:remote-access:dispatch', { kind: 'probe-port', port }) as Promise<boolean>,
  },

  onboarding: {
    onShow(cb: (payload: PsOnboardingShowPayload) => void) {
      const listener = (_event: IpcRendererEvent, payload: PsOnboardingShowPayload) => cb(payload);
      // oxlint-disable-next-line ps/no-loosely-typed-webcontents-ipc -- preload-side subscription wrapper (precedent #14)
      ipcRenderer.on('ps:onboarding:show', listener);
      return () => ipcRenderer.removeListener('ps:onboarding:show', listener);
    },
    signalReady: () => {
      invoke('ps:onboarding:renderer-ready').catch(() => {});
    },
    confirm: (request) => invoke('ps:onboarding:confirm', request),
    cancel: () => invoke('ps:onboarding:cancel'),
    probeContent: (request) => invoke('ps:onboarding:probe-content', request),
    onToast(cb: (payload: PsOnboardingToastPayload) => void) {
      const listener = (_event: IpcRendererEvent, payload: PsOnboardingToastPayload) => cb(payload);
      // oxlint-disable-next-line ps/no-loosely-typed-webcontents-ipc -- preload-side subscription wrapper (precedent #14)
      ipcRenderer.on('ps:onboarding:toast', listener);
      return () => ipcRenderer.removeListener('ps:onboarding:toast', listener);
    },
  },

  localOp: {
    auth: {
      start: () => createLocalOpAuthStream(),
    },
    clone: {
      start: (request) => createLocalOpCloneStream(request),
    },
    authStatus: (request) => invoke('ps:local-op:auth:status', request),
    authRepos: (request) => invoke('ps:local-op:auth:repos', request),
  },

  share: {
    validateLocalFolder: (args) => invoke('ps:share:validate-folder', args),
  },

  editor: {
    notifyActiveTargetChanged: (target: PsEditorActiveTargetSnapshot) => {
      invoke('ps:editor:active-target-changed', target).catch(() => {});
    },
    notifyViewMenuStateChanged: (state: PsEditorViewMenuStateChange) => {
      invoke('ps:editor:view-menu-state-changed', state).catch(() => {});
    },
    notifyBackgroundThrottle: (signal: { hasPendingWork: boolean; enabled: boolean }) => {
      invoke('ps:editor:background-throttle', signal).catch(() => {});
    },
  },

  menu: {
    dispatch: async (request: PsMenuUiDispatchRequest) =>
      asMenuRendererSnapshot(await invoke('ps:menu:dispatch', request)),
  },

  startup: {
    reportMarks: (marks: { pageListReadyMs: number; firstContentMs: number }) => {
      invoke('ps:startup:renderer-marks', marks).catch(() => {});
    },
  },

  sidebar: {
    expandAll(cb: () => void) {
      const listener = (_event: IpcRendererEvent) => cb();
      // oxlint-disable-next-line ps/no-loosely-typed-webcontents-ipc -- preload-side subscription wrapper (precedent #14)
      ipcRenderer.on('ps:sidebar:expand-all', listener);
      return () => ipcRenderer.removeListener('ps:sidebar:expand-all', listener);
    },
    collapseAll(cb: () => void) {
      const listener = (_event: IpcRendererEvent) => cb();
      // oxlint-disable-next-line ps/no-loosely-typed-webcontents-ipc -- preload-side subscription wrapper (precedent #14)
      ipcRenderer.on('ps:sidebar:collapse-all', listener);
      return () => ipcRenderer.removeListener('ps:sidebar:collapse-all', listener);
    },
  },

  terminal: {
    create: (opts) => invoke('ps:pty:create', opts),
    input: (ptyId, data) => {
      invoke('ps:pty:input', { ptyId, data }).catch(() => {});
    },
    resize: (ptyId, cols, rows) => {
      invoke('ps:pty:resize', { ptyId, cols, rows }).catch(() => {});
    },
    kill: (ptyId) => invoke('ps:pty:kill', { ptyId }),
    drain: (ptyId, bytes) => {
      invoke('ps:pty:drain', { ptyId, bytes }).catch(() => {});
    },
    list: () => invoke('ps:pty:list'),
    adopt: (ptyId, opts) => invoke('ps:pty:adopt', { ptyId, ...opts }),
    start: (ptyId) => invoke('ps:pty:adopt', { ptyId, start: true }),
    setMeta: (ptyId, meta) => {
      invoke('ps:pty:set-meta', { ptyId, ...meta }).catch(() => {});
    },
    setOrder: (orderedPtyIds) => {
      invoke('ps:pty:set-order', { orderedPtyIds: [...orderedPtyIds] }).catch(() => {});
    },
    getDockState: () => invoke('ps:terminal:dock-state'),
    setDockState: async (state) => {
      const request =
        state.surface === 'terminal'
          ? {
              surface: state.surface,
              order: [...state.order],
              activeKey: state.activeKey,
              terminalSnapshot: {
                tabs: state.terminalSnapshot.tabs.map((tab) => ({ ...tab })),
                activeOrdinal: state.terminalSnapshot.activeOrdinal,
              },
            }
          : {
              surface: state.surface,
              order: [...state.order],
              activeKey: state.activeKey,
            };
      try {
        return await invoke('ps:terminal:set-dock-state', request);
      } catch (error) {
        if (isDockStateIpcTeardown(error)) return { ok: false, reason: 'ipc-unavailable' };
        throw error;
      }
    },
    onData(cb) {
      const listener = (_event: IpcRendererEvent, msg: PsPtyData) => cb(msg);
      // oxlint-disable-next-line ps/no-loosely-typed-webcontents-ipc -- preload-side subscription wrapper (precedent #14)
      ipcRenderer.on('ps:pty:data', listener);
      return () => ipcRenderer.removeListener('ps:pty:data', listener);
    },
    onExit(cb) {
      const listener = (_event: IpcRendererEvent, msg: PsPtyExit) => cb(msg);
      // oxlint-disable-next-line ps/no-loosely-typed-webcontents-ipc -- preload-side subscription wrapper (precedent #14)
      ipcRenderer.on('ps:pty:exit', listener);
      return () => ipcRenderer.removeListener('ps:pty:exit', listener);
    },
    onNotice(cb) {
      const listener = (_event: IpcRendererEvent, msg: PsPtyNotice) => cb(msg);
      // oxlint-disable-next-line ps/no-loosely-typed-webcontents-ipc -- preload-side subscription wrapper (precedent #14)
      ipcRenderer.on('ps:pty:notice', listener);
      return () => ipcRenderer.removeListener('ps:pty:notice', listener);
    },
    claudePreflight: () => invoke('ps:terminal:claude-assist', { action: 'preflight' }),
    cliPreflight: (cli) => invoke('ps:terminal:cli-preflight', { cli }),
    cliInstalledMap: () => invoke('ps:terminal:cli-installed-map'),
  },

  accessibility: {
    isScreenReaderActive: () => screenReaderActive,
    onScreenReaderChanged(cb) {
      const listener = (_event: IpcRendererEvent, info: { screenReaderActive: boolean }) =>
        cb(info.screenReaderActive === true);
      // oxlint-disable-next-line ps/no-loosely-typed-webcontents-ipc -- preload-side subscription wrapper (precedent #14)
      ipcRenderer.on('ps:accessibility:changed', listener);
      return () => ipcRenderer.removeListener('ps:accessibility:changed', listener);
    },
  },

  platform: process.platform as HandoffHostPlatform,
  appVersion: parseArg('app-version') ?? '0.0.0',
  instanceLabel: parseArg('instance-label') ?? null,
  mcpServerName: parseArg(MCP_SERVER_NAME_ARG_NAME) ?? null,
  cliCommandName: parseArg(CLI_COMMAND_NAME_ARG_NAME) ?? null,

  getPathForFile: (file) => {
    const path = webUtils.getPathForFile(file);
    return path === '' ? null : path;
  },

  setDisplayLockCrashKey: (state) => {
    if (new TextEncoder().encode(state).length > DISPLAY_LOCK_CRASH_KEY_MAX_BYTES) return;
    crashReporter.addExtraParameter(DISPLAY_LOCK_CRASH_KEY, state);
  },
};

if (parseArg('debug-keyring-smoke') === '1') {
  bridge.debug = {
    keyringSmoke: () => invoke('ps:debug:keyring-smoke'),
  };
}

if (isUninstallPreload(process.argv)) {
  contextBridge.exposeInMainWorld('psUninstall', createUninstallBridge(invoke));
} else {
  contextBridge.exposeInMainWorld('psDesktop', bridge);
}
