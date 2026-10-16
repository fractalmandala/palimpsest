import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Page } from '@playwright/test';
import { expect, test } from './_helpers';

function uniqueStamp(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

const sidebar = (page: Page) => page.locator('[data-slot="sidebar-container"]');
const fileRow = (page: Page, fileName: string) =>
  sidebar(page).getByRole('treeitem', { name: fileName, exact: true });
const folderRow = (page: Page, folderName: string) =>
  sidebar(page).getByRole('treeitem', { name: folderName, exact: true });
const treeScroller = (page: Page) => sidebar(page).locator('[data-file-tree-virtualized-scroll]');
const textViewer = (page: Page) => page.locator('[data-text-viewer]');

async function toggleShowPsFolders(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Tree view options' }).click();
  await page.getByTestId('tree-options-show-ps-folders').click();
}

test('toggle reveals .ps rows, routes clicks to sanctioned surfaces, and keeps rows mutate-free', async ({
  page,
  api,
  workerServer,
}) => {
  const stamp = uniqueStamp();
  const controlDoc = `ps-reveal-control-${stamp}`;
  const templateName = `greeting-${stamp}`;
  const rawDocBase = `notes-probe-${stamp}`;

  await api.createPage(`${controlDoc}.md`);
  const psDir = join(workerServer.contentDir, '.ps');
  mkdirSync(join(psDir, 'templates'), { recursive: true });
  mkdirSync(join(psDir, 'worktrees', 'checkout'), { recursive: true });
  mkdirSync(join(psDir, 'local'), { recursive: true });
  writeFileSync(join(psDir, 'templates', `${templateName}.md`), '# Greeting template\n', 'utf-8');
  writeFileSync(join(psDir, `${rawDocBase}.md`), `# Raw probe ${stamp}\n`, 'utf-8');
  writeFileSync(join(psDir, 'worktrees', 'checkout', 'README.md'), '# checkout\n', 'utf-8');

  await page.goto(`/#/${controlDoc}`);
  await fileRow(page, `${controlDoc}.md`).waitFor({ state: 'visible', timeout: 15_000 });

  await expect(folderRow(page, '.ps')).toHaveCount(0);

  await toggleShowPsFolders(page);
  await treeScroller(page).evaluate((el) => {
    el.scrollTop = 0;
  });
  await folderRow(page, '.ps').waitFor({ state: 'visible', timeout: 15_000 });

  await folderRow(page, '.ps').click();
  await folderRow(page, 'templates').waitFor({ state: 'visible', timeout: 15_000 });
  await fileRow(page, `${rawDocBase}.md`).waitFor({ state: 'visible', timeout: 15_000 });
  await expect(folderRow(page, 'worktrees')).toHaveCount(0);
  await expect(folderRow(page, 'local')).toHaveCount(0);

  await folderRow(page, 'templates').click({ button: 'right' });
  await expect(page.getByRole('menuitem', { name: /copy path/i })).toBeVisible({
    timeout: 5_000,
  });
  await expect(page.getByRole('menuitem', { name: /new file/i })).toHaveCount(0);
  await expect(page.getByRole('menuitem', { name: /rename/i })).toHaveCount(0);
  await expect(page.getByRole('menuitem', { name: /duplicate/i })).toHaveCount(0);
  await expect(page.getByRole('menuitem', { name: /^delete/i })).toHaveCount(0);
  await expect(page.getByRole('menuitem', { name: /hide/i })).toHaveCount(0);
  await page.keyboard.press('Escape');

  await fileRow(page, `${rawDocBase}.md`).click({ button: 'right' });
  await expect(page.getByRole('menuitem', { name: /copy path/i })).toBeVisible({
    timeout: 5_000,
  });
  await expect(page.getByRole('menuitem', { name: /rename/i })).toHaveCount(0);
  await expect(page.getByRole('menuitem', { name: /duplicate/i })).toHaveCount(0);
  await expect(page.getByRole('menuitem', { name: /^delete/i })).toHaveCount(0);
  await expect(page.getByRole('menuitem', { name: /hide/i })).toHaveCount(0);
  await page.keyboard.press('Escape');

  await fileRow(page, `${rawDocBase}.md`).click();
  await expect(textViewer(page)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(`Raw probe ${stamp}`)).toBeVisible({ timeout: 15_000 });
  await page.locator('[data-text-viewer] .cm-content').click();
  await page.keyboard.type('MUTATION-ATTEMPT');
  await expect(page.getByText('MUTATION-ATTEMPT')).toHaveCount(0);
  await expect(page.getByText(`Raw probe ${stamp}`)).toBeVisible();

  await folderRow(page, 'templates').click();
  await fileRow(page, `${templateName}.md`).waitFor({ state: 'visible', timeout: 15_000 });
  await fileRow(page, `${templateName}.md`).click();
  await expect
    .poll(async () => decodeURIComponent(await page.evaluate(() => window.location.hash)), {
      timeout: 15_000,
    })
    .toBe(`#/.ps/templates/${templateName}`);

  await toggleShowPsFolders(page);
  await expect(folderRow(page, '.ps')).toHaveCount(0, { timeout: 15_000 });
});

test('a direct hash to a raw .ps docName lands read-only — existing shows bytes, missing never offers create', async ({
  page,
  api,
  workerServer,
}) => {
  const stamp = uniqueStamp();
  const anchorDoc = `ps-guard-anchor-${stamp}`;
  const rawDocBase = `guard-probe-${stamp}`;

  await api.createPage(`${anchorDoc}.md`);
  mkdirSync(join(workerServer.contentDir, '.ps'), { recursive: true });
  writeFileSync(
    join(workerServer.contentDir, '.ps', `${rawDocBase}.md`),
    `# Guard probe ${stamp}\n`,
    'utf-8',
  );

  await page.goto(`/#/${anchorDoc}`);
  await fileRow(page, `${anchorDoc}.md`).waitFor({ state: 'visible', timeout: 15_000 });

  await page.evaluate((docName) => {
    window.location.hash = `#/${docName}`;
  }, `.ps/${rawDocBase}`);
  await expect(textViewer(page)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(`Guard probe ${stamp}`)).toBeVisible({ timeout: 15_000 });
  await page.locator('[data-text-viewer] .cm-content').click();
  await page.keyboard.type('MUTATION-ATTEMPT');
  await expect(page.getByText('MUTATION-ATTEMPT')).toHaveCount(0);
  await expect(page.getByText(`Guard probe ${stamp}`)).toBeVisible();

  await page.evaluate((docName) => {
    window.location.hash = `#/${docName}`;
  }, `.ps/ghost-${stamp}`);
  await expect(textViewer(page)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByPlaceholder('Start writing to create this page')).toHaveCount(0);
  await expect(page.getByText('Start writing to create this page')).toHaveCount(0);
});

test('an activated .ps folder row never becomes a mutation target — create falls back to root, keyboard delete no-ops', async ({
  page,
  api,
  workerServer,
}) => {
  const stamp = uniqueStamp();
  const anchorDoc = `ps-mutation-anchor-${stamp}`;
  const controlFolder = `ps-delete-control-${stamp}`;
  const createdDoc = `ps-create-fallback-${stamp}`;
  const probeDocBase = `activation-probe-${stamp}`;

  await api.createPage(`${anchorDoc}.md`);
  await api.createPage(`${controlFolder}/inside.md`);
  const psDir = join(workerServer.contentDir, '.ps');
  mkdirSync(psDir, { recursive: true });
  writeFileSync(join(psDir, `${probeDocBase}.md`), `# Activation probe ${stamp}\n`, 'utf-8');

  await page.goto(`/#/${anchorDoc}`);
  await fileRow(page, `${anchorDoc}.md`).waitFor({ state: 'visible', timeout: 15_000 });

  await toggleShowPsFolders(page);
  await treeScroller(page).evaluate((el) => {
    el.scrollTop = 0;
  });
  await folderRow(page, '.ps').waitFor({ state: 'visible', timeout: 15_000 });

  await folderRow(page, '.ps').click();
  await fileRow(page, `${probeDocBase}.md`).waitFor({ state: 'visible', timeout: 15_000 });

  await page.getByRole('button', { name: 'New file', exact: true }).click();
  const renameInput = page.getByRole('textbox', { name: /rename Untitled/i });
  await expect(renameInput).toBeVisible({ timeout: 10_000 });
  await renameInput.fill(createdDoc);
  const renameResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/rename-path') && response.request().method() === 'POST',
  );
  await renameInput.press('Enter');
  await fileRow(page, `${createdDoc}.md`).waitFor({ state: 'visible', timeout: 15_000 });

  await expect
    .poll(() => existsSync(join(workerServer.contentDir, `${createdDoc}.md`)), {
      timeout: 15_000,
    })
    .toBe(true);
  expect(existsSync(join(psDir, `${createdDoc}.md`))).toBe(false);
  await renameResponse;
  await expect(sidebar(page).locator('file-tree-container')).toHaveAttribute('data-state', 'idle');

  await treeScroller(page).evaluate((el) => {
    el.scrollTop = 0;
  });
  const controlRow = folderRow(page, controlFolder);
  await controlRow.waitFor({ state: 'visible', timeout: 15_000 });
  await controlRow.click();
  await controlRow.focus();
  await expect(controlRow).toBeFocused();
  await page.keyboard.press('Delete');
  await expect(page.getByRole('alertdialog')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole('alertdialog')).toHaveAccessibleName(`Delete ${controlFolder}/`);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('alertdialog')).toHaveCount(0);

  await treeScroller(page).evaluate((el) => {
    el.scrollTop = 0;
  });
  const psRow = folderRow(page, '.ps');
  await psRow.waitFor({ state: 'visible', timeout: 15_000 });
  await psRow.click();
  await psRow.focus();
  await expect(psRow).toBeFocused();
  await page.keyboard.press('Delete');
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await expect(psRow).toBeVisible();
  expect(existsSync(join(psDir, `${probeDocBase}.md`))).toBe(true);

  await toggleShowPsFolders(page);
  await expect(folderRow(page, '.ps')).toHaveCount(0, { timeout: 15_000 });
});

test('a legacy __template__ bookmark redirects to the content doc and opens it', async ({
  page,
  api,
  workerServer,
}) => {
  const stamp = uniqueStamp();
  const anchorDoc = `tmpl-legacy-anchor-${stamp}`;
  const templateName = `legacy-greeting-${stamp}`;
  const bodyMarker = `Legacy redirect ${stamp}`;

  await api.createPage(`${anchorDoc}.md`);
  mkdirSync(join(workerServer.contentDir, '.ps', 'templates'), { recursive: true });
  writeFileSync(
    join(workerServer.contentDir, '.ps', 'templates', `${templateName}.md`),
    `# ${bodyMarker}\n`,
    'utf-8',
  );

  await page.goto(`/#/${anchorDoc}`);
  await fileRow(page, `${anchorDoc}.md`).waitFor({ state: 'visible', timeout: 15_000 });

  await page.evaluate((name) => {
    window.location.hash = `#/__template__/${name}`;
  }, templateName);
  await expect(page.getByRole('heading', { name: bodyMarker })).toBeVisible({ timeout: 15_000 });
});
