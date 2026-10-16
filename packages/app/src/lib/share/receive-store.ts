import type { PsDesktopBridge, PsShareReceivedPayload } from '@/lib/desktop-bridge-types';

export interface ShareReceiveStore {
  install(opts: { bridge: PsDesktopBridge | undefined }): (() => void) | undefined;
  getSnapshot(): PsShareReceivedPayload | null;
  subscribe(listener: () => void): () => void;
  dismiss(): void;
}

export function createShareReceiveStore(): ShareReceiveStore {
  let current: PsShareReceivedPayload | null = null;
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
      if (!bridge) return undefined;
      if (attached) return unsubscribeFromBridge ?? undefined;
      attached = true;
      unsubscribeFromBridge = bridge.onShareReceived((payload) => {
        current = payload;
        notify();
      });
      return () => {
        unsubscribeFromBridge?.();
        unsubscribeFromBridge = null;
        attached = false;
        clearCurrent();
      };
    },

    getSnapshot(): PsShareReceivedPayload | null {
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

export const shareReceiveStore: ShareReceiveStore = createShareReceiveStore();

export function installShareReceivedListener(opts: {
  bridge: PsDesktopBridge | undefined;
}): (() => void) | undefined {
  return shareReceiveStore.install(opts);
}
