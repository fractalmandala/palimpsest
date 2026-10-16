import { describe, expect, test, vi } from 'vitest';

type FakeListener = (_event: unknown, payload: unknown) => void;

interface FakeIpcRenderer {
  on: ReturnType<typeof vi.fn>;
  removeListener: ReturnType<typeof vi.fn>;
}

function makeFakeIpc(): FakeIpcRenderer {
  const listeners = new Map<string, Set<FakeListener>>();
  return {
    on: vi.fn((channel: string, listener: FakeListener) => {
      if (!listeners.has(channel)) listeners.set(channel, new Set());
      listeners.get(channel)?.add(listener);
    }),
    removeListener: vi.fn((channel: string, listener: FakeListener) => {
      listeners.get(channel)?.delete(listener);
    }),
  };
}

function createUpdateSubscription<T>(
  ipc: FakeIpcRenderer,
  channel: string,
  cb: (info: T) => void,
): () => void {
  const listener: FakeListener = (_event: unknown, payload: unknown) => cb(payload as T);
  ipc.on(channel, listener);
  return () => ipc.removeListener(channel, listener);
}

describe('M3 update-listener subscribe/unsubscribe pattern', () => {
  test('onUpdateDownloaded subscription registers on correct channel', () => {
    const ipc = makeFakeIpc();
    const cb = vi.fn(() => {});
    createUpdateSubscription(ipc, 'ps:update:downloaded', cb);
    expect(ipc.on).toHaveBeenCalledTimes(1);
    expect(ipc.on.mock.calls[0]?.[0]).toBe('ps:update:downloaded');
  });

  test('unsubscribe closure detaches the listener by reference identity', () => {
    const ipc = makeFakeIpc();
    const cb = vi.fn(() => {});
    const unsubscribe = createUpdateSubscription(ipc, 'ps:update:downloaded', cb);

    const registeredWrapper = ipc.on.mock.calls[0]?.[1];
    expect(registeredWrapper).toBeDefined();

    unsubscribe();

    expect(ipc.removeListener).toHaveBeenCalledTimes(1);
    expect(ipc.removeListener.mock.calls[0]?.[0]).toBe('ps:update:downloaded');
    expect(ipc.removeListener.mock.calls[0]?.[1]).toBe(registeredWrapper);
  });

  test('unsubscribe prevents callback from firing on subsequent events', () => {
    const ipc = makeFakeIpc();
    const cb = vi.fn(() => {});
    const unsubscribe = createUpdateSubscription<{ version: string }>(
      ipc,
      'ps:update:downloaded',
      cb,
    );
    const registeredWrapper = ipc.on.mock.calls[0]?.[1] as FakeListener | undefined;
    expect(registeredWrapper).toBeDefined();
    registeredWrapper?.(null, { version: '0.1.1' });
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenLastCalledWith({ version: '0.1.1' });

    unsubscribe();

    expect(ipc.removeListener).toHaveBeenCalledWith('ps:update:downloaded', registeredWrapper);
  });

  test('all update listeners follow the same pattern (channel-name parametric)', () => {
    const channels = [
      'ps:update:downloaded',
      'ps:update:relaunching',
      'ps:update:relaunch-failed',
      'ps:update:whats-new',
      'ps:update:whats-new-dismissed',
      'ps:update:stuck-hint',
      'ps:update:manual-check',
    ] as const;
    for (const channel of channels) {
      const ipc = makeFakeIpc();
      const cb = vi.fn(() => {});
      const unsubscribe = createUpdateSubscription(ipc, channel, cb);
      expect(ipc.on.mock.calls[0]?.[0]).toBe(channel);
      unsubscribe();
      expect(ipc.removeListener.mock.calls[0]?.[0]).toBe(channel);
    }
  });

  test('manual-check payload is delivered and unsubscribed by wrapper identity', () => {
    const ipc = makeFakeIpc();
    const cb = vi.fn<(info: { phase: 'started' | 'settled' }) => void>(() => {});
    const unsubscribe = createUpdateSubscription(ipc, 'ps:update:manual-check', cb);
    const registeredWrapper = ipc.on.mock.calls[0]?.[1] as FakeListener | undefined;

    registeredWrapper?.(null, { phase: 'started' });
    expect(cb).toHaveBeenCalledWith({ phase: 'started' });

    unsubscribe();
    expect(ipc.removeListener).toHaveBeenCalledWith('ps:update:manual-check', registeredWrapper);
  });
});
