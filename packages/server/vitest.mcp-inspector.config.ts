import { defineConfig } from 'vitest/config';
import { psVitestBase } from '../../test-support/vitest.base';

export default defineConfig({
  ...psVitestBase,
  test: {
    ...psVitestBase.test,
    include: ['src/mcp/mcp-inspector-portability.network.test.ts'],
  },
});
