import { describe, expect, test } from 'vitest';
import { applyUnpackagedDevChannel, desktopProtocolScheme } from './dev-channel.ts';

describe('applyUnpackagedDevChannel', () => {
  test('an unpackaged build runs as the dev channel', () => {
    const env: Record<string, string | undefined> = {};
    applyUnpackagedDevChannel(env, false);
    expect(env.PS_CHANNEL).toBe('dev');
  });

  test.each(['stable', 'beta'])('an explicit PS_CHANNEL=%s still wins', (channel) => {
    const env: Record<string, string | undefined> = { PS_CHANNEL: channel };
    applyUnpackagedDevChannel(env, false);
    expect(env.PS_CHANNEL).toBe(channel);
  });

  test('a packaged app keeps resolving by its executable', () => {
    const env: Record<string, string | undefined> = {};
    applyUnpackagedDevChannel(env, true);
    expect(env.PS_CHANNEL).toBeUndefined();
  });

  test('the desktop smoke harness keeps the shipped identity', () => {
    const env: Record<string, string | undefined> = { PS_DESKTOP_E2E_SMOKE: '1' };
    applyUnpackagedDevChannel(env, false);
    expect(env.PS_CHANNEL).toBeUndefined();
  });
});

describe('desktopProtocolScheme', () => {
  test('a dev build claims palimpsest-dev, never Stable', () => {
    expect(desktopProtocolScheme(false, 'palimpsest', { PS_CHANNEL: 'dev' })).toBe(
      'palimpsest-dev',
    );
  });

  test('an unpackaged build pinned to a channel uses that channel', () => {
    expect(desktopProtocolScheme(false, 'palimpsest', { PS_CHANNEL: 'beta' })).toBe(
      'palimpsest-beta',
    );
  });

  test('a packaged build keeps its variant scheme whatever the env says', () => {
    expect(desktopProtocolScheme(true, 'palimpsest-beta', { PS_CHANNEL: 'dev' })).toBe(
      'palimpsest-beta',
    );
  });
});
