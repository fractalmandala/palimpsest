import * as actualLinguiMacro from '@lingui/react/macro';
import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { PsScaffoldPlan, PsSeedPackInfo } from '@/lib/desktop-bridge-types';
import { renderLinguiTemplate } from '@/test-utils/lingui-mock';

vi.doMock('@lingui/react/macro', () => ({
  ...actualLinguiMacro,
  Trans: ({ children }: { children: ReactNode }) => <>{children}</>,
  useLingui: () => ({ t: renderLinguiTemplate }),
}));

vi.doMock('@lingui/core/macro', () => ({
  ...actualLinguiMacro,
  t: renderLinguiTemplate,
  msg: renderLinguiTemplate,
  plural: (value: number, options: { one: string; other: string }) =>
    (value === 1 ? options.one : options.other).replace('#', String(value)),
}));

function pack(folders: Array<{ path: string; summary: string }>): PsSeedPackInfo {
  return {
    id: 'knowledge-base',
    name: 'Knowledge base',
    description: 'Trusted articles.',
    folders,
    entryCounts: { files: 0, folders: folders.length },
  };
}

async function renderList(plan: PsScaffoldPlan, selectedPack: PsSeedPackInfo) {
  const { CreatedItemsList } = await import('./CreatedItemsList');
  render(
    <TooltipProvider>
      <CreatedItemsList plan={plan} selectedPack={selectedPack} />
    </TooltipProvider>,
  );
}

function folderCountText(): string | null | undefined {
  const label = screen.queryByText(/^folders?$/);
  return label?.parentElement?.textContent;
}

describe('CreatedItemsList — cards + count derivation', () => {
  afterEach(cleanup);

  test('subfolder mode: the parent folder gets no card and the count matches the cards', async () => {
    const plan: PsScaffoldPlan = {
      created: [
        { kind: 'folder', path: 'brain' },
        { kind: 'folder', path: 'brain/external-sources' },
        { kind: 'folder', path: 'brain/research' },
        { kind: 'folder', path: 'brain/articles' },
        { kind: 'file', path: 'brain/external-sources/.ps/templates/clip.md' },
      ],
      skipped: [],
      warnings: [],
    };
    await renderList(
      plan,
      pack([
        { path: 'external-sources', summary: 'Sources.' },
        { path: 'research', summary: 'Research.' },
        { path: 'articles', summary: 'Articles.' },
      ]),
    );

    expect(screen.getByText('external-sources/')).toBeTruthy();
    expect(screen.queryByText('brain/')).toBeNull();
    expect(folderCountText()).toBe('3 folders');
  });

  test('a fully-present folder (not in created) is dropped from cards and the count', async () => {
    const plan: PsScaffoldPlan = {
      created: [
        { kind: 'folder', path: 'notes' },
        { kind: 'file', path: 'notes/.ps/templates/note.md' },
      ],
      skipped: [],
      warnings: [],
    };
    await renderList(
      plan,
      pack([
        { path: 'notes', summary: 'Notes.' },
        { path: 'daily', summary: 'Daily.' },
      ]),
    );

    expect(screen.getByText('notes/')).toBeTruthy();
    expect(screen.queryByText('daily/')).toBeNull();
    expect(folderCountText()).toBe('1 folder');
  });

  test('template-only reinstall (no folder entry) still shows the folder card', async () => {
    const plan: PsScaffoldPlan = {
      created: [{ kind: 'file', path: 'notes/.ps/templates/note.md' }],
      skipped: [],
      warnings: [],
    };
    await renderList(plan, pack([{ path: 'notes', summary: 'Notes.' }]));

    expect(screen.getByText('notes/')).toBeTruthy();
    expect(folderCountText()).toBe('1 folder');
  });

  test('template files under .ps/ do not render as file cards', async () => {
    const plan: PsScaffoldPlan = {
      created: [
        { kind: 'folder', path: 'notes' },
        { kind: 'file', path: 'notes/.ps/templates/note.md' },
        { kind: 'file', path: 'log.md' },
      ],
      skipped: [],
      warnings: [],
    };
    await renderList(plan, pack([{ path: 'notes', summary: 'Notes.' }]));

    expect(screen.getByText('log.md')).toBeTruthy();
    expect(screen.queryByText('note.md')).toBeNull();
  });
});

describe('CreatedItemsList — required plugins', () => {
  test('a pending required plugin renders with its label and an undo pointer', async () => {
    const plan: PsScaffoldPlan = {
      created: [],
      skipped: [],
      warnings: [],
      requiredPlugins: [{ id: 'psf', pending: true }],
    };
    await renderList(plan, pack([]));

    expect(screen.getByText('OKF')).toBeTruthy();
    expect(screen.getByText(/turn it off any time in settings/i)).toBeTruthy();
  });

  test('an already-enabled required plugin renders no row', async () => {
    const plan: PsScaffoldPlan = {
      created: [{ kind: 'file', path: 'log.md' }],
      skipped: [],
      warnings: [],
      requiredPlugins: [{ id: 'psf', pending: false }],
    };
    await renderList(plan, pack([]));

    expect(screen.queryByText('OKF')).toBeNull();
  });
});
