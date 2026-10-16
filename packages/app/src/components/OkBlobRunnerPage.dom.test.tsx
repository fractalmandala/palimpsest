import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';

vi.doMock('@/components/PsBlobRunner', () => ({
  PsBlobRunner: ({ autoStart }: { autoStart?: boolean }) => (
    <div data-testid="runner-probe" data-autostart={String(autoStart ?? false)} />
  ),
}));

describe('PsBlobRunnerPage', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  test('takes focus on mount', async () => {
    const focus = vi.spyOn(HTMLElement.prototype, 'focus');
    const { PsBlobRunnerPage } = await import('./PsBlobRunnerPage');
    render(<PsBlobRunnerPage />);
    expect(focus).toHaveBeenCalled();
  });

  test('does not auto-start by default, and does when asked', async () => {
    const { PsBlobRunnerPage } = await import('./PsBlobRunnerPage');
    const { getByTestId, unmount } = render(<PsBlobRunnerPage />);
    expect(getByTestId('runner-probe').dataset.autostart).toBe('false');
    unmount();

    const revealed = render(<PsBlobRunnerPage autoStart />);
    expect(revealed.getByTestId('runner-probe').dataset.autostart).toBe('true');
  });
});
