import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Page } from '@playwright/test';
import {
  expect,
  openProjectPluginsPanel,
  openSettingsSection,
  setPluginEnabled,
  test,
  waitForSettingsPanel,
} from './_helpers';

test.use({
  workerServerEnv: { PS_TEST_OKF_RECOMMENDED_SKILL: 'isolated-content-v1' },
});

async function openOkfSettings(page: Page): Promise<void> {
  await openProjectPluginsPanel(page);
  await setPluginEnabled(page, 'psf', true);
  await openSettingsSection(page, 'plugin:psf', 'settings-plugin-psf');
}

test('installs the recommended skill through the real endpoint and recognizes it after reload', async ({
  page,
  workerServer,
}) => {
  const platformSkillDir = join(workerServer.contentDir, '.claude', 'skills', 'palimpsest');
  mkdirSync(platformSkillDir, { recursive: true });
  writeFileSync(
    join(platformSkillDir, 'SKILL.md'),
    '---\nname: palimpsest\ndescription: project skill\n---\n',
    'utf-8',
  );

  await openOkfSettings(page);
  const card = page.getByTestId('settings-psf-recommended-skill');
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: 'Install skill' }).click();

  const dialog = page.getByRole('dialog', { name: 'Install from OKF' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Installs into this project');
  await expect(dialog).toContainText('psf-knowledge-base');
  await dialog.getByRole('button', { name: 'Install 1 skill' }).click();

  const installedSkill = join(
    workerServer.contentDir,
    '.claude',
    'skills',
    'psf-knowledge-base',
    'SKILL.md',
  );
  await expect.poll(() => existsSync(installedSkill), { timeout: 15_000 }).toBe(true);
  await expect(card).toContainText('Installed');
  expect(readFileSync(installedSkill, 'utf-8')).toContain('name: psf-knowledge-base');

  await page.reload();
  await waitForSettingsPanel(page, 'settings-plugin-psf');
  const reloadedCard = page.getByTestId('settings-psf-recommended-skill');
  await expect(reloadedCard).toContainText('Installed');
  await expect(reloadedCard.getByRole('button', { name: 'Open skill' })).toBeVisible();
  await expect(reloadedCard.getByRole('button', { name: 'Install skill' })).toHaveCount(0);
});
