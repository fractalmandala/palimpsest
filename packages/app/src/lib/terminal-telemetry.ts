import { trace } from '@opentelemetry/api';

const TRACER_NAME = 'palimpsest-app';

function emitMarker(name: string): void {
  try {
    trace.getTracer(TRACER_NAME).startSpan(name).end();
  } catch (err) {
    console.warn(
      '[terminal-telemetry] span emit failed:',
      err instanceof Error ? err : String(err),
    );
  }
}

export function recordTerminalOpened(): void {
  emitMarker('ps.desktop.terminalOpened');
}

export function recordShellConsentGranted(): void {
  emitMarker('ps.desktop.shellConsentGranted');
}
