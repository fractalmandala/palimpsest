import { defineConfig } from 'vitest/config';
import { psVitestBase } from '../../test-support/vitest.base';
import InstallOutcomeReporter from './tests/e2e/install-outcome.test-helper';

export default defineConfig({
  ...psVitestBase,
  test: {
    ...psVitestBase.test,
    include: ['tests/e2e/cli-linux-e2e.ts'],
    reporters: ['default', new InstallOutcomeReporter()],
  },
});
