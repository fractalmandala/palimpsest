import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { psVitestBase } from '../../test-support/vitest.base';

const serverAuthorityRegistrySetup = fileURLToPath(
  new URL('../../test-support/server-authority-registry.setup.ts', import.meta.url),
);

export default defineConfig({
  ...psVitestBase,
  test: {
    ...psVitestBase.test,
    setupFiles: [...psVitestBase.test.setupFiles, serverAuthorityRegistrySetup],
    exclude: [...psVitestBase.test.exclude, '**/*.network.test.ts', '.ps-skill-publish-*'],
  },
});
