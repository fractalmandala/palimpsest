import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { psVitestBase } from '../test-support/vitest.base';

const docsRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  ...psVitestBase,
  test: {
    ...psVitestBase.test,
    css: false,
    server: { deps: { inline: [/fumadocs-ui/] } },
    exclude: [...psVitestBase.test.exclude, '**/*.real-source.test.ts'],
  },
  resolve: {
    ...psVitestBase.resolve,
    alias: [
      { find: /^@\/\.source(?=$|\/)/, replacement: `${docsRoot}.source` },
      { find: /^@\//, replacement: `${docsRoot}src/` },
    ],
  },
});
