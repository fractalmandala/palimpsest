import { describe, expect, test } from 'vitest';
import { resolvePsDesktopMode, resolvePsThemePreference } from './ok-desktop-argv.ts';

describe('resolvePsDesktopMode', () => {
  test('maps the terminal flag to the terminal window mode', () => {
    expect(resolvePsDesktopMode('terminal')).toBe('terminal');
  });

  test('maps the navigator flag to the navigator window mode', () => {
    expect(resolvePsDesktopMode('navigator')).toBe('navigator');
  });

  test('maps the editor flag to the editor window mode', () => {
    expect(resolvePsDesktopMode('editor')).toBe('editor');
  });

  test('maps the note flag to the popped-out note window mode', () => {
    expect(resolvePsDesktopMode('note')).toBe('note');
  });

  test('falls back to editor when the flag is absent', () => {
    expect(resolvePsDesktopMode(undefined)).toBe('editor');
  });

  test('falls back to editor for an unrecognized flag value', () => {
    expect(resolvePsDesktopMode('totally-unknown')).toBe('editor');
  });
});

describe('resolvePsThemePreference', () => {
  test.each(['light', 'dark', 'system'] as const)('accepts %s', (value) => {
    expect(resolvePsThemePreference(value)).toBe(value);
  });

  test('preserves absence and defaults invalid present values to system', () => {
    expect(resolvePsThemePreference(undefined)).toBeUndefined();
    expect(resolvePsThemePreference('ultraviolet')).toBe('system');
  });
});
