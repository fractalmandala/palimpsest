import { expect, test, vi } from 'vitest';
import {
  notifySignInTerminalExited,
  subscribeToSignInTerminalExits,
} from './sign-in-terminal-events';

test('an exit reaches every subscriber with its thread id until they unsubscribe', () => {
  const target = new EventTarget();
  const seen = vi.fn();
  const stop = subscribeToSignInTerminalExits(seen, target);
  notifySignInTerminalExited('t1', target);
  expect(seen).toHaveBeenCalledWith('t1');
  stop();
  notifySignInTerminalExited('t2', target);
  expect(seen).toHaveBeenCalledTimes(1);
});

test('an event without a thread id is ignored', () => {
  const target = new EventTarget();
  const seen = vi.fn();
  subscribeToSignInTerminalExits(seen, target);
  target.dispatchEvent(new CustomEvent('palimpsest:sign-in-terminal-exit', { detail: {} }));
  target.dispatchEvent(new Event('palimpsest:sign-in-terminal-exit'));
  expect(seen).not.toHaveBeenCalled();
});
