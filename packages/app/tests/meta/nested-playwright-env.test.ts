import { afterEach, describe, expect, test, vi } from 'vitest';
import { createNestedPlaywrightEnv } from '../stress/_helpers/port-ownership/nested-playwright-env.test-helper.ts';

const OUTER_RUN_SERVING = {
  PS_TEST_E2E_REUSE_SOCKET: '/tmp/outer-supervisor.sock',
  PS_TEST_E2E_REUSE_RUN: 'outer-run',
  PS_TEST_E2E_SERVING: 'prebuilt',
  PS_TEST_PREBUILT_APP: '/tmp/outer-prebuilt-app',
};

afterEach(() => {
  vi.unstubAllEnvs();
});

function stubOuterRun(): void {
  for (const [name, value] of Object.entries(OUTER_RUN_SERVING)) vi.stubEnv(name, value);
  vi.stubEnv('PS_NESTED_ENV_UNRELATED', 'kept');
  vi.stubEnv('PLAYWRIGHT_JSON_OUTPUT_FILE', '/tmp/outer-results.json');
}

describe('a nested Playwright run starts from the outer environment without its server reuse or serving mode', () => {
  test('the outer run’s reuse socket, run id, serving mode and prebuilt app are not inherited', () => {
    stubOuterRun();
    expect(process.env.PS_TEST_E2E_REUSE_SOCKET).toBe(OUTER_RUN_SERVING.PS_TEST_E2E_REUSE_SOCKET);

    const env = createNestedPlaywrightEnv({ PS_NESTED_ENV_OVERRIDE: 'set' });

    expect(Object.keys(env).filter((name) => name in OUTER_RUN_SERVING)).toEqual([]);
  });

  test('everything else the outer run had is kept, the overrides apply and the JSON report path is dropped', () => {
    stubOuterRun();

    const env = createNestedPlaywrightEnv({ PS_NESTED_ENV_OVERRIDE: 'set' });

    expect(env.PS_NESTED_ENV_UNRELATED).toBe('kept');
    expect(env.PS_NESTED_ENV_OVERRIDE).toBe('set');
    expect(env.PATH).toBe(process.env.PATH);
    expect(env.PLAYWRIGHT_JSON_OUTPUT_FILE).toBeUndefined();
  });

  test('a nested run that names its own reuse socket keeps that socket', () => {
    stubOuterRun();

    const env = createNestedPlaywrightEnv({
      PS_TEST_E2E_REUSE_SOCKET: '/tmp/nested-supervisor.sock',
    });

    expect(env.PS_TEST_E2E_REUSE_SOCKET).toBe('/tmp/nested-supervisor.sock');
    expect(env.PS_TEST_E2E_REUSE_RUN).toBeUndefined();
  });
});
