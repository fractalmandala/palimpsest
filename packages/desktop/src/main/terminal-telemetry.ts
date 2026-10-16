import { withSpanSync } from '@palimpsest/server';

function platformAttributes(): { 'ps.platform': NodeJS.Platform } {
  return { 'ps.platform': process.platform };
}

export function recordShellExit(info: { crashed: boolean }): void {
  withSpanSync(
    'ps.desktop.shellExit',
    {
      attributes: {
        'ps.desktop.shell_crashed': info.crashed,
        ...platformAttributes(),
      },
    },
    () => undefined,
  );
}

export function recordTerminalSession(): void {
  withSpanSync('ps.desktop.terminalSession', { attributes: platformAttributes() }, () => undefined);
}

export function recordConcurrentSessions(info: { count: number }): void {
  withSpanSync(
    'ps.desktop.terminalConcurrentSessions',
    {
      attributes: {
        'ps.desktop.concurrent_sessions': info.count,
        ...platformAttributes(),
      },
    },
    () => undefined,
  );
}

export function recordTerminalWindowOpened(): void {
  withSpanSync(
    'ps.desktop.terminalWindowOpened',
    { attributes: platformAttributes() },
    () => undefined,
  );
}
