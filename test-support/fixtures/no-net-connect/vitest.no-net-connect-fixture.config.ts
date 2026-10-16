import { defineConfig } from 'vitest/config';
import { psVitestBase } from '../../vitest.base';

export default defineConfig({
  ...psVitestBase,
  test: {
    ...psVitestBase.test,
    include: ['test-support/fixtures/no-net-connect/no-net-connect.fixture.ts'],
    maxWorkers: 1,
  },
});
