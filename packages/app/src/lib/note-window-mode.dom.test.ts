import { afterEach, describe, expect, test } from 'vitest';
import { isNoteWindow } from './note-window-mode.ts';

type PsDesktopStub = { config: { mode: string } };

function stubMode(mode: string | null): void {
  if (mode === null) {
    (window as unknown as { psDesktop?: PsDesktopStub }).psDesktop = undefined;
    return;
  }
  (window as unknown as { psDesktop?: PsDesktopStub }).psDesktop = { config: { mode } };
}

afterEach(() => {
  stubMode(null);
});

describe('isNoteWindow', () => {
  test('is true for a popped-out note window', () => {
    stubMode('note');
    expect(isNoteWindow()).toBe(true);
  });

  test.each(['editor', 'navigator', 'terminal'])('is false for the %s window mode', (mode) => {
    stubMode(mode);
    expect(isNoteWindow()).toBe(false);
  });

  test('is false on the web host, which has no desktop bridge', () => {
    stubMode(null);
    expect(isNoteWindow()).toBe(false);
  });

  test('a partial bridge with no config resolves false instead of throwing', () => {
    (window as unknown as { psDesktop?: unknown }).psDesktop = {};
    expect(isNoteWindow()).toBe(false);
  });
});
