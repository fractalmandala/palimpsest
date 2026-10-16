import type * as Y from 'yjs';
import type { ConfigValidationError } from './errors.ts';
import type { Err, Ok, Result } from './result.ts';

const DEFAULT_YTEXT_KEY = 'source';

const DEFAULT_ACCEPTANCE_DELAY_MS = 800;

export interface PsignoreDocProvider {
  document: Y.Doc;
  on(event: 'synced', listener: () => void): void;
  off(event: 'synced', listener: () => void): void;
}

export type PsignoreBindingStatus = 'idle' | 'pending' | 'accepted' | 'rejected';

export interface PsignoreBindingPatchSuccess {
  text: string;
}

export type PsignoreBindingPatchResult = Result<PsignoreBindingPatchSuccess, ConfigValidationError>;

export interface PsignoreBindingRejection {
  error: ConfigValidationError;
  text: string;
}

export type PsignoreUnsubscribe = () => void;

export interface PsignoreBinding {
  current(): string;
  patch(newText: string): PsignoreBindingPatchResult;
  subscribe(listener: (text: string) => void): PsignoreUnsubscribe;
  subscribeRejection(listener: (rejection: PsignoreBindingRejection) => void): PsignoreUnsubscribe;
  subscribeStatus(listener: (status: PsignoreBindingStatus) => void): PsignoreUnsubscribe;
  status(): PsignoreBindingStatus;
  notifyRejection(error: ConfigValidationError): void;
  dispose(): void;
}

export interface BindPsignoreDocOptions {
  ytextKey?: string;
  acceptanceDelayMs?: number;
}

function err(error: ConfigValidationError): Err<ConfigValidationError> {
  return { ok: false, error };
}

function ok(value: PsignoreBindingPatchSuccess): Ok<PsignoreBindingPatchSuccess> {
  return { ok: true, ...value };
}

export function bindPsignoreDoc(
  provider: PsignoreDocProvider,
  options: BindPsignoreDocOptions = {},
): PsignoreBinding {
  const { ytextKey = DEFAULT_YTEXT_KEY, acceptanceDelayMs = DEFAULT_ACCEPTANCE_DELAY_MS } = options;
  const ydoc = provider.document;
  const ytext = ydoc.getText(ytextKey);

  const textListeners = new Set<(text: string) => void>();
  const rejectionListeners = new Set<(rejection: PsignoreBindingRejection) => void>();
  const statusListeners = new Set<(status: PsignoreBindingStatus) => void>();
  let disposed = false;
  let currentStatus: PsignoreBindingStatus = 'idle';
  let acceptanceTimer: ReturnType<typeof setTimeout> | null = null;

  function clearAcceptanceTimer(): void {
    if (acceptanceTimer !== null) {
      clearTimeout(acceptanceTimer);
      acceptanceTimer = null;
    }
  }

  function setStatus(next: PsignoreBindingStatus): void {
    if (disposed) return;
    if (currentStatus === next) return;
    currentStatus = next;
    for (const listener of statusListeners) {
      try {
        listener(next);
      } catch (e) {
        console.warn('[bindPsignoreDoc] status listener threw:', e);
      }
    }
  }

  function fireTextListeners(): void {
    if (disposed) return;
    const text = ytext.toString();
    for (const listener of textListeners) {
      try {
        listener(text);
      } catch (e) {
        console.warn('[bindPsignoreDoc] text listener threw:', e);
      }
    }
  }

  function fireRejectionListeners(rejection: PsignoreBindingRejection): void {
    if (disposed) return;
    for (const listener of rejectionListeners) {
      try {
        listener(rejection);
      } catch (e) {
        console.warn('[bindPsignoreDoc] rejection listener threw:', e);
      }
    }
  }

  ytext.observe(fireTextListeners);
  provider.on('synced', fireTextListeners);

  return {
    current(): string {
      return ytext.toString();
    },

    patch(newText: string): PsignoreBindingPatchResult {
      if (disposed) {
        return err({
          code: 'WRITE_ERROR',
          detail: 'PsignoreBinding has been disposed',
        });
      }
      ydoc.transact(() => {
        if (ytext.length > 0) ytext.delete(0, ytext.length);
        if (newText.length > 0) ytext.insert(0, newText);
      });
      clearAcceptanceTimer();
      setStatus('pending');
      acceptanceTimer = setTimeout(() => {
        acceptanceTimer = null;
        if (disposed) return;
        if (currentStatus === 'pending') setStatus('accepted');
      }, acceptanceDelayMs);
      return ok({ text: newText });
    },

    subscribe(listener: (text: string) => void): PsignoreUnsubscribe {
      textListeners.add(listener);
      return () => {
        textListeners.delete(listener);
      };
    },

    subscribeRejection(
      listener: (rejection: PsignoreBindingRejection) => void,
    ): PsignoreUnsubscribe {
      rejectionListeners.add(listener);
      return () => {
        rejectionListeners.delete(listener);
      };
    },

    subscribeStatus(listener: (status: PsignoreBindingStatus) => void): PsignoreUnsubscribe {
      statusListeners.add(listener);
      return () => {
        statusListeners.delete(listener);
      };
    },

    status(): PsignoreBindingStatus {
      return currentStatus;
    },

    notifyRejection(error: ConfigValidationError): void {
      if (disposed) return;
      clearAcceptanceTimer();
      setStatus('rejected');
      fireRejectionListeners({ error, text: ytext.toString() });
    },

    dispose(): void {
      if (disposed) return;
      disposed = true;
      clearAcceptanceTimer();
      ytext.unobserve(fireTextListeners);
      provider.off('synced', fireTextListeners);
      textListeners.clear();
      rejectionListeners.clear();
      statusListeners.clear();
    },
  };
}
