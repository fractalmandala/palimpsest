// @vitest-environment jsdom
import type { PsUninstallBridge, UninstallDispatchResult } from '@palimpsest/core';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { requestUninstallScreen, sendUninstallIntent } from './bridge';

function bridgeWith(ready: () => Promise<UninstallDispatchResult>): PsUninstallBridge {
  return {
    ready,
    send: (): Promise<UninstallDispatchResult> => Promise.resolve({ kind: 'accepted' }),
  };
}

describe('requestUninstallScreen', () => {
  afterEach(() => {
    window.psUninstall = undefined;
  });

  test('reports an absent bridge', async () => {
    window.psUninstall = undefined;
    expect(await requestUninstallScreen()).toEqual({
      kind: 'unavailable',
      reason: 'missing-bridge',
    });
  });

  test('returns the screen main answers the ready pull with', async () => {
    window.psUninstall = bridgeWith(() =>
      Promise.resolve({ kind: 'screen', screen: { kind: 'progress' } }),
    );
    expect(await requestUninstallScreen()).toEqual({
      kind: 'screen',
      screen: { kind: 'progress' },
    });
  });

  test('retains the refusal reason', async () => {
    window.psUninstall = bridgeWith(() =>
      Promise.resolve({ kind: 'refused', reason: 'unknown-window' }),
    );
    expect(await requestUninstallScreen()).toEqual({ kind: 'refused', reason: 'unknown-window' });
  });

  test('reports a rejected invoke', async () => {
    window.psUninstall = bridgeWith(() => Promise.reject(new Error('ipc channel closed')));
    await expect(requestUninstallScreen()).resolves.toEqual({
      kind: 'unavailable',
      reason: 'request-failed',
    });
  });
});

describe('sendUninstallIntent', () => {
  afterEach(() => {
    window.psUninstall = undefined;
  });

  test('is a no-op when the window has no bridge', () => {
    window.psUninstall = undefined;
    expect(() => sendUninstallIntent({ kind: 'picker-cancel' })).not.toThrow();
  });

  test('swallows a rejected send so a teardown race is not an unhandled rejection', async () => {
    let sent: unknown;
    window.psUninstall = {
      ready: () => Promise.resolve({ kind: 'refused', reason: 'unknown-window' }),
      send: (intent): Promise<UninstallDispatchResult> => {
        sent = intent;
        return Promise.reject(new Error('channel torn down'));
      },
    };
    expect(() => sendUninstallIntent({ kind: 'notice-confirm' })).not.toThrow();
    expect(sent).toEqual({ kind: 'notice-confirm' });
    await Promise.resolve();
  });
});

test('bounds a ready request that never settles', async () => {
  vi.useFakeTimers();
  try {
    window.psUninstall = bridgeWith(() => new Promise(() => {}));
    const result = requestUninstallScreen();
    await vi.advanceTimersByTimeAsync(5000);
    expect(await result).toEqual({ kind: 'unavailable', reason: 'timeout' });
    expect(vi.getTimerCount()).toBe(0);
  } finally {
    window.psUninstall = undefined;
    vi.useRealTimers();
  }
});
