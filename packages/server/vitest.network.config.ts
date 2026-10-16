import { defineConfig } from 'vitest/config';
import { psVitestBase } from '../../test-support/vitest.base';

export default defineConfig({
  ...psVitestBase,
  test: {
    ...psVitestBase.test,
    include: ['src/acp/*.network.test.ts'],
    fileParallelism: false,
  },
});
