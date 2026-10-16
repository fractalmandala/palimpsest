import { useSyncExternalStore } from 'react';

let relaunchInFlight = false;
const listeners = new Set<() => void>();

function notify(): void {
  for (const l of listeners) l();
}

export function getRelaunchInFlightSnapshot(): boolean {
  return relaunchInFlight;
}

export function subscribeRelaunchInFlight(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useRelaunchInFlight(): boolean {
  return useSyncExternalStore(subscribeRelaunchInFlight, getRelaunchInFlightSnapshot, () => false);
}

export function resetRelaunchStoreForTest(): void {
  relaunchInFlight = false;
  listeners.clear();
}

export function setRelaunchInFlightForTest(next: boolean): void {
  relaunchInFlight = next;
  notify();
}
