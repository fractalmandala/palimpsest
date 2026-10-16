import { afterEach, describe, expect, test, vi } from 'vitest';
import { psCliCommandName, psUserHomeLabel } from './channel-cli-copy';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('channel CLI copy', () => {
  test('names Stable without a desktop bridge', () => {
    expect(psCliCommandName()).toBe('ok');
    expect(psUserHomeLabel('secrets.yml')).toBe('~/.ps/secrets.yml');
  });

  test('names Beta when main hands the window the Beta command', () => {
    vi.stubGlobal('window', { psDesktop: { cliCommandName: 'ps-beta' } });
    expect(psCliCommandName()).toBe('ps-beta');
    expect(psUserHomeLabel('secrets.yml')).toBe('~/.ps-beta/secrets.yml');
  });

  test('falls back to Stable for a command no channel owns', () => {
    vi.stubGlobal('window', { psDesktop: { cliCommandName: 'rm -rf' } });
    expect(psCliCommandName()).toBe('ok');
  });
});
