import { expect, test } from '@playwright/test';

test('nested lifetime control reaches its test body', async () => {
  expect(process.env.PS_PORT_OWNERSHIP_RUN_DIR).toBeTruthy();
});
