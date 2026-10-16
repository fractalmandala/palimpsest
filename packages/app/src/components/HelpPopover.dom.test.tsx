import * as actualLinguiMacro from '@lingui/react/macro';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { renderLinguiTemplate } from '@/test-utils/lingui-mock';
import { createServedBindingLog } from '@/test-utils/served-binding.test-helper';

vi.doMock('@lingui/core/macro', () => ({ ...actualLinguiMacro, msg: renderLinguiTemplate }));

vi.doMock('@lingui/react/macro', () => ({
  ...actualLinguiMacro,
  Trans: ({ children }: { children: ReactNode }) => <>{children}</>,
  useLingui: () => ({ t: renderLinguiTemplate }),
}));

const servedCore = createServedBindingLog();

vi.doMock('@palimpsest/core/utils/github-stars', async (importActual) =>
  servedCore.serve('@palimpsest/core/utils/github-stars', {
    ...(await importActual<typeof import('@palimpsest/core/utils/github-stars')>()),
    getGitHubStars: async () => 1234,
  }),
);

vi.doMock('@/lib/external-link', () => ({
  dispatchExternalLinkClick: () => {},
}));

const reportBugDialogProps: Array<{ open: boolean; launcherBorne?: boolean }> = [];
vi.doMock('@/components/ReportBugDialog', () => ({
  ReportBugDialog: (props: { open: boolean; launcherBorne?: boolean }) => {
    reportBugDialogProps.push(props);
    return <div data-open={String(props.open)} data-testid="report-bug-dialog" />;
  },
}));

async function renderOpenHelpPopover() {
  const { HelpPopover } = await import('./HelpPopover');
  render(
    <TooltipProvider>
      <HelpPopover />
    </TooltipProvider>,
  );
  await userEvent.click(screen.getByRole('button', { name: 'Resources' }));
}

function linkShape(link: HTMLElement) {
  return {
    label: Array.from(link.childNodes)
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent)
      .join('')
      .trim(),
    href: link.getAttribute('href'),
    target: link.getAttribute('target'),
    rel: link.getAttribute('rel'),
    hasIcon: link.querySelector('svg') !== null,
  };
}

afterEach(cleanup);

describe('HelpPopover runtime behavior', () => {
  test('exports the component', async () => {
    const mod = await import('./HelpPopover');
    expect(typeof mod.HelpPopover).toBe('function');
  });

  test('groups links under Resources and Community navs', async () => {
    await renderOpenHelpPopover();

    for (const heading of ['Resources', 'Community']) {
      expect(screen.getByRole('navigation', { name: heading })).not.toBeNull();
    }
    expect(screen.queryByRole('navigation', { name: 'Product updates' })).toBeNull();
    expect(screen.queryByText(/Help\s*&\s*Resources/i)).toBeNull();
    expect(screen.queryByText('Settings')).toBeNull();
  });

  test('the open popover is a dialog that screen readers announce as Resources, like its trigger', async () => {
    await renderOpenHelpPopover();

    const dialog = screen.getByRole('dialog', { name: 'Resources' });
    expect(within(dialog).getByRole('navigation', { name: 'Community' })).not.toBeNull();
  });

  test('omits the desktop-only Report a bug action in the web host', async () => {
    await renderOpenHelpPopover();

    const nav = screen.getByRole('navigation', { name: 'Resources' });
    expect(within(nav).queryByRole('button', { name: 'Report a bug' })).toBeNull();
  });

  test('renders Resources links in the required order', async () => {
    await renderOpenHelpPopover();

    const nav = screen.getByRole('navigation', { name: 'Resources' });
    const links = within(nav).getAllByRole('link');
    expect(links.map(linkShape)).toEqual([
      {
        label: 'Docs',
        href: 'https://github.com/fractalmandala/palimpsest/tree/main/docs/content',
        target: '_blank',
        rel: 'noopener noreferrer',
        hasIcon: true,
      },
      {
        label: 'Download app',
        href: 'https://github.com/fractalmandala/palimpsest/download',
        target: '_blank',
        rel: 'noopener noreferrer',
        hasIcon: true,
      },
    ]);
  });

  test('renders Community links in the required order', async () => {
    await renderOpenHelpPopover();

    const nav = screen.getByRole('navigation', { name: 'Community' });
    const links = within(nav).getAllByRole('link');
    expect(links.map(linkShape)).toEqual([
      {
        label: 'GitHub',
        href: 'https://github.com/fractalmandala/palimpsest',
        target: '_blank',
        rel: 'noopener noreferrer',
        hasIcon: true,
      },
    ]);
  });

  test('does not advertise the hidden game', async () => {
    await renderOpenHelpPopover();

    const nav = screen.getByRole('navigation', { name: 'Resources' });
    expect(within(nav).queryByRole('button', { name: 'Blob Run' })).toBeNull();
  });

  test('shows the fetched GitHub star count on the GitHub row', async () => {
    await renderOpenHelpPopover();

    const nav = screen.getByRole('navigation', { name: 'Community' });
    const githubLink = within(nav).getByRole('link', { name: /GitHub/ });
    await waitFor(() => expect(within(githubLink).getByText('1.2k')).not.toBeNull());
  });

});

describe('HelpPopover with the desktop bridge present', () => {
  beforeEach(() => {
    (window as unknown as { psDesktop?: unknown }).psDesktop = {
      state: { query: async () => ({ channel: 'latest', schemaIncompatibility: null }) },
    };
  });

  afterEach(() => {
    (window as unknown as { psDesktop?: unknown }).psDesktop = undefined;
  });

  test('adds Report a bug and Send feedback actions after the Docs link', async () => {
    await renderOpenHelpPopover();

    const nav = screen.getByRole('navigation', { name: 'Resources' });
    const docs = within(nav).getByRole('link', { name: 'Docs' });
    const reportBug = within(nav).getByRole('button', { name: 'Report a bug' });
    const sendFeedback = within(nav).getByRole('button', { name: 'Send feedback' });

    expect(docs.compareDocumentPosition(reportBug)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(docs.compareDocumentPosition(sendFeedback)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  test('the report it opens waits for the popover to clear before shooting', async () => {
    reportBugDialogProps.length = 0;
    await renderOpenHelpPopover();

    const nav = screen.getByRole('navigation', { name: 'Resources' });
    await userEvent.click(within(nav).getByRole('button', { name: 'Report a bug' }));

    await waitFor(() => {
      expect(screen.getByTestId('report-bug-dialog').getAttribute('data-open')).toBe('true');
    });
    expect(reportBugDialogProps.at(-1)?.launcherBorne).toBe(true);
  });

  test('keeps the download route available for reinstalling or sharing from desktop', async () => {
    await renderOpenHelpPopover();

    expect(screen.getByRole('link', { name: 'Download app' }).getAttribute('href')).toBe(
      'https://github.com/fractalmandala/palimpsest/download',
    );
  });
});

describe('HelpPopover version on the desktop app', () => {
  function aboutInfo() {
    return {
      productName: 'Palimpsest Beta',
      version: '0.83.0-beta.8',
      releasesUrl: 'https://example.test/releases',
      releaseNotesUrl: 'https://example.test/releases/tag/v0.83.0-beta.8',
    };
  }

  function installBridge(withAbout: boolean) {
    const query = vi.fn(async () => ({
      channel: 'latest' as const,
      schemaIncompatibility: null,
      ...(withAbout ? { about: aboutInfo() } : {}),
    }));
    (window as unknown as { psDesktop?: unknown }).psDesktop = {
      appVersion: '0.83.0-beta.8',
      state: { query },
    };
    return { query };
  }

  afterEach(() => {
    (window as unknown as { psDesktop?: unknown }).psDesktop = undefined;
    window.location.hash = '';
  });

  test('the version row opens Settings at About', async () => {
    installBridge(true);
    await renderOpenHelpPopover();

    await userEvent.click(screen.getByRole('button', { name: 'v0.83.0-beta.8 About' }));

    expect(window.location.hash).toBe('#settings/about');
  });

  test('renders no updater UI', async () => {
    installBridge(true);
    await renderOpenHelpPopover();

    expect(screen.queryByRole('button', { name: /updates/i })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Check for updates' })).toBeNull();
  });

  test('an older desktop build without About data keeps the version row only', async () => {
    installBridge(false);
    await renderOpenHelpPopover();
    await act(async () => {});

    expect(screen.getByRole('button', { name: 'v0.83.0-beta.8 About' })).not.toBeNull();
  });

  test('the web host shows no version row', async () => {
    await renderOpenHelpPopover();

    expect(screen.queryByRole('button', { name: /^v\d/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Check for updates' })).toBeNull();
  });
});

describe('HelpPopover core replacement liveness', () => {
  test('the star count HelpPopover renders is the one the github-stars replacement serves', async () => {
    const since = servedCore.mark();
    await renderOpenHelpPopover();

    const nav = screen.getByRole('navigation', { name: 'Community' });
    const githubLink = within(nav).getByRole('link', { name: /GitHub/ });
    await waitFor(() => expect(within(githubLink).getByText('1.2k')).not.toBeNull());
    expect(
      servedCore.readersOf('@palimpsest/core/utils/github-stars', 'getGitHubStars', since),
    ).toEqual(['components/HelpPopover.tsx']);
  });
});
