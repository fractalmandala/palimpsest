import type { PsBugReportCrashDetectedEvent } from '@palimpsest/core/logger-types';
import type { PsDesktopBridge } from '@/lib/desktop-bridge-types';

export interface CrashInviteStore {
  install(opts: { bridge: PsDesktopBridge | undefined }): (() => void) | undefined;
  getSnapshot(): PsBugReportCrashDetectedEvent | null;
  subscribe(listener: () => void): () => void;
  dismiss(): void;
}

export function createCrashInviteStore(): CrashInviteStore {
  let current: PsBugReportCrashDetectedEvent | null = null;
  const listeners = new Set<() => void>();
  let attached = false;
  let unsubscribeFromBridge: (() => void) | null = null;

  function notify(): void {
    for (const l of listeners) l();
  }

  function clearCurrent(): void {
    if (current === null) return;
    current = null;
    notify();
  }

  return {
    install({ bridge }): (() => void) | undefined {
      const onCrashDetected = (bridge as { bugReport?: PsDesktopBridge['bugReport'] } | undefined)
        ?.bugReport?.onCrashDetected;
      if (typeof onCrashDetected !== 'function') return undefined;
      if (attached) return unsubscribeFromBridge ?? undefined;
      attached = true;
      unsubscribeFromBridge = onCrashDetected((event) => {
        current = event;
        notify();
      });
      return () => {
        unsubscribeFromBridge?.();
        unsubscribeFromBridge = null;
        attached = false;
        clearCurrent();
      };
    },

    getSnapshot(): PsBugReportCrashDetectedEvent | null {
      return current;
    },

    subscribe(listener): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    dismiss(): void {
      clearCurrent();
    },
  };
}

export const crashInviteStore: CrashInviteStore = createCrashInviteStore();

export function installCrashInviteListener(opts: {
  bridge: PsDesktopBridge | undefined;
}): (() => void) | undefined {
  return crashInviteStore.install(opts);
}
