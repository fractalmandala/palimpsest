import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';

vi.doMock('@/components/PsBlob', () => ({
  PsBlob: ({ size, variant }: { size: number; variant?: string }) => (
    <div data-testid="ps-blob-probe" data-size={String(size)} data-variant={variant ?? 'default'} />
  ),
}));

const resting = () => document.querySelector('[data-slot="ps-blob-runner-easter-egg"]');
const game = () => document.querySelector('[data-slot="ps-blob-runner"]');

describe('PsBlobRunnerEasterEgg', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  test('shows only the resting mascot — no track, no score, no hint', async () => {
    const { PsBlobRunnerEasterEgg } = await import('./PsBlobRunnerEasterEgg');
    render(<PsBlobRunnerEasterEgg />);

    expect(resting()).toBeTruthy();
    expect(game()).toBeNull();
    expect(screen.getByTestId('ps-blob-probe').dataset.variant).toBe('sleeping');
    expect(document.querySelector('[data-slot="ps-blob-runner-hint"]')).toBeNull();
  });

  test('ArrowUp wakes it', async () => {
    const { PsBlobRunnerEasterEgg } = await import('./PsBlobRunnerEasterEgg');
    render(<PsBlobRunnerEasterEgg />);

    fireEvent.keyDown(window, { key: 'ArrowUp' });
    expect(game()).toBeTruthy();
  });

  test('clicking the mascot wakes it', async () => {
    const { PsBlobRunnerEasterEgg } = await import('./PsBlobRunnerEasterEgg');
    render(<PsBlobRunnerEasterEgg />);

    const node = resting();
    if (!node) throw new Error('resting mascot missing');
    fireEvent.pointerDown(node);
    expect(game()).toBeTruthy();
  });

  test('Space wakes it when nothing owns the keyboard', async () => {
    const { PsBlobRunnerEasterEgg } = await import('./PsBlobRunnerEasterEgg');
    render(<PsBlobRunnerEasterEgg />);

    fireEvent.keyDown(window, { key: ' ' });
    expect(game()).toBeTruthy();
  });

  test('Space does NOT wake it while a button holds focus', async () => {
    const { PsBlobRunnerEasterEgg } = await import('./PsBlobRunnerEasterEgg');
    render(
      <div>
        <button type="button">Try again</button>
        <PsBlobRunnerEasterEgg />
      </div>,
    );

    const button = screen.getByRole('button', { name: 'Try again' });
    button.focus();
    expect(document.activeElement).toBe(button);

    fireEvent.keyDown(window, { key: ' ' });
    expect(game()).toBeNull();

    fireEvent.keyDown(window, { key: 'ArrowUp' });
    expect(game()).toBeTruthy();
  });
});

describe('keyboard={false} (crash screens)', () => {
  test('ArrowUp and Space are both ignored', async () => {
    const { PsBlobRunnerEasterEgg } = await import('./PsBlobRunnerEasterEgg');
    render(<PsBlobRunnerEasterEgg keyboard={false} />);

    fireEvent.keyDown(window, { key: 'ArrowUp' });
    fireEvent.keyDown(window, { key: ' ' });
    expect(game()).toBeNull();
  });

  test('but clicking the mascot still opens it', async () => {
    const { PsBlobRunnerEasterEgg } = await import('./PsBlobRunnerEasterEgg');
    render(<PsBlobRunnerEasterEgg keyboard={false} />);

    const node = resting();
    if (!node) throw new Error('resting mascot missing');
    fireEvent.pointerDown(node);
    expect(game()).toBeTruthy();
  });
});
