import { t } from '@lingui/core/macro';
import type {
  PsDesktopBridge,
  PsMcpWiringConfirmRequest,
  PsMcpWiringResult,
  PsMcpWiringShowPayload,
} from '@/lib/desktop-bridge-types';

export interface McpConsentStore {
  install(opts: { bridge: PsDesktopBridge | undefined }): (() => void) | undefined;
  getSnapshot(): PsMcpWiringShowPayload | null;
  subscribe(listener: () => void): () => void;
  confirm(request: PsMcpWiringConfirmRequest): Promise<PsMcpWiringResult>;
  skip(): Promise<PsMcpWiringResult>;
  dismiss(): void;
}

export function createMcpConsentStore(): McpConsentStore {
  let currentRequest: PsMcpWiringShowPayload | null = null;
  let bridge: PsDesktopBridge | null = null;
  const listeners = new Set<() => void>();
  let attached = false;
  let unsubscribeFromBridge: (() => void) | null = null;

  function notify(): void {
    for (const l of listeners) l();
  }

  function clearCurrent(): void {
    if (currentRequest === null) return;
    currentRequest = null;
    notify();
  }

  return {
    install({ bridge: b }): (() => void) | undefined {
      if (!b) return undefined;
      if (attached) return unsubscribeFromBridge ?? undefined;
      attached = true;
      bridge = b;
      unsubscribeFromBridge = b.mcpWiring.onShow((payload) => {
        currentRequest = payload;
        notify();
      });
      b.mcpWiring.signalReady();
      return () => {
        unsubscribeFromBridge?.();
        unsubscribeFromBridge = null;
        attached = false;
        bridge = null;
        clearCurrent();
      };
    },

    getSnapshot(): PsMcpWiringShowPayload | null {
      return currentRequest;
    },

    subscribe(listener): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    async confirm(request): Promise<PsMcpWiringResult> {
      const b = bridge;
      if (!b) return { ok: false, error: t`Not attached to desktop bridge` };
      try {
        const result = await b.mcpWiring.confirm(request);
        if (result.ok) clearCurrent();
        return result;
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : t`Unknown error` };
      }
    },

    async skip(): Promise<PsMcpWiringResult> {
      const b = bridge;
      if (!b) return { ok: false, error: t`Not attached to desktop bridge` };
      try {
        const result = await b.mcpWiring.skip();
        if (result.ok) clearCurrent();
        return result;
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : t`Unknown error` };
      }
    },

    dismiss(): void {
      clearCurrent();
    },
  };
}

export const mcpConsentStore: McpConsentStore = createMcpConsentStore();

export function installMcpConsentListener(opts: {
  bridge: PsDesktopBridge | undefined;
}): (() => void) | undefined {
  return mcpConsentStore.install(opts);
}
