import { afterEach, describe, expect, test, vi } from 'vitest';
import { MissingPsConfigError, missingPsConfigMessage } from './missing-ok-config-error.ts';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('MissingPsConfigError', () => {
  test('carries the canonical message verbatim for both kinds', () => {
    const a = new MissingPsConfigError('okdir', '/tmp/proj-a');
    const b = new MissingPsConfigError('config', '/tmp/proj-b');
    expect(a.message).toBe(missingPsConfigMessage());
    expect(b.message).toBe(missingPsConfigMessage());
  });

  test('tells a Stable user to run ps init', () => {
    vi.stubEnv('PS_CHANNEL', 'stable');
    expect(new MissingPsConfigError('okdir', '/tmp/proj').message).toBe(
      'Palimpsest config not found at .ps/config.yml. Run ps init to scaffold OK in this directory.',
    );
  });

  test('tells a Beta user to run ps-beta init', () => {
    vi.stubEnv('PS_CHANNEL', 'beta');
    expect(new MissingPsConfigError('okdir', '/tmp/proj').message).toBe(
      'Palimpsest config not found at .ps/config.yml. Run ps-beta init to scaffold OK in this directory.',
    );
  });

  test('discriminator + projectDir are queryable as readonly fields', () => {
    const e = new MissingPsConfigError('config', '/tmp/proj');
    expect(e.kind).toBe('config');
    expect(e.projectDir).toBe('/tmp/proj');
    expect(e.name).toBe('MissingPsConfigError');
  });

  test('forwards `cause` to the Error options bag', () => {
    const cause = new Error('underlying');
    const e = new MissingPsConfigError('okdir', '/tmp/proj', { cause });
    expect(e.cause).toBe(cause);
  });
});
