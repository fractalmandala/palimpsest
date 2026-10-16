import * as actualLinguiMacro from '@lingui/react/macro';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import type { PsAboutInfo } from '@/lib/desktop-bridge-types';
import { renderLinguiTemplate } from '@/test-utils/lingui-mock';

vi.doMock('@lingui/react/macro', () => ({
  ...actualLinguiMacro,
  Trans: ({ children }: { children: ReactNode }) => <>{children}</>,
  useLingui: () => ({ t: renderLinguiTemplate }),
}));

const { AboutSection } = await import('./AboutSection');

const CLOUD_ABOUT: PsAboutInfo = {
  productName: 'Palimpsest Cloud',
  version: '0.81.5-cloud.1343',
  releasesUrl: 'https://github.com/fractalmandala/palimpsest/releases',
  releaseNotesUrl: 'https://github.com/fractalmandala/palimpsest/releases/tag/v0.81.5-cloud.1343',
};

function installBridge(about: PsAboutInfo | null, appVersion = about?.version ?? '0.0.0') {
  const openExternal = vi.fn(async (_url: string) => {});
  const query = vi.fn(async () => ({
    channel: 'latest' as const,
    schemaIncompatibility: null,
    ...(about ? { about } : {}),
  }));
  Object.defineProperty(window, 'psDesktop', {
    value: {
      appVersion,
      shell: { openExternal },
      state: { query },
    },
    configurable: true,
    writable: true,
  });
  return {
    openExternal,
    query,
  };
}

afterEach(() => {
  cleanup();
  (window as unknown as { psDesktop?: unknown }).psDesktop = undefined;
});

describe('AboutSection', () => {
  test('shows the installed product and its version', async () => {
    installBridge(CLOUD_ABOUT);
    render(<AboutSection />);

    expect(await screen.findByText('Palimpsest Cloud')).not.toBeNull();
    expect(screen.getByTestId('settings-about-version').textContent).toBe('v0.81.5-cloud.1343');
  });

  test('Release notes opens the page the installed build names', async () => {
    const { openExternal } = installBridge(CLOUD_ABOUT);
    render(<AboutSection />);

    await userEvent.click(await screen.findByRole('button', { name: 'Release notes' }));

    expect(openExternal).toHaveBeenCalledWith(
      'https://github.com/fractalmandala/palimpsest/releases/tag/v0.81.5-cloud.1343',
    );
  });

  test('renders no updater UI', async () => {
    installBridge(CLOUD_ABOUT);
    render(<AboutSection />);

    await screen.findByText('Palimpsest Cloud');
    expect(screen.queryByRole('button', { name: /updates/i })).toBeNull();
    expect(screen.queryByRole('switch')).toBeNull();
  });

  test('an older desktop build without About data still shows its version', async () => {
    const { openExternal } = installBridge(null, '0.80.0');
    render(<AboutSection />);

    await waitFor(() =>
      expect(screen.getByTestId('settings-about-version').textContent).toBe('v0.80.0'),
    );
    expect(screen.queryByRole('button', { name: 'Release notes' })).toBeNull();
    expect(openExternal).not.toHaveBeenCalled();
  });

  test('renders nothing without a desktop bridge', () => {
    const { container } = render(<AboutSection />);
    expect(container.firstChild).toBeNull();
  });
});
