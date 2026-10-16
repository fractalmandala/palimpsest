import { afterEach, describe, expect, test } from 'vitest';

const store = await import('./relaunch-store');

afterEach(() => {
  store.resetRelaunchStoreForTest();
});

describe('relaunch-store', () => {
  test('starts false and notifies subscribers on test-set flips', () => {
    expect(store.getRelaunchInFlightSnapshot()).toBe(false);

    let notifications = 0;
    const unsub = store.subscribeRelaunchInFlight(() => {
      notifications += 1;
    });

    store.setRelaunchInFlightForTest(true);
    expect(store.getRelaunchInFlightSnapshot()).toBe(true);
    expect(notifications).toBe(1);

    store.setRelaunchInFlightForTest(false);
    expect(store.getRelaunchInFlightSnapshot()).toBe(false);
    expect(notifications).toBe(2);

    unsub();
    store.setRelaunchInFlightForTest(true);
    expect(notifications).toBe(2);
  });
});
