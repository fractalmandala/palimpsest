import type {
  HandoffFailureReason,
  HandoffScope,
  HandoffTarget,
} from '@palimpsest/core/handoff';

export type HandoffHost = 'electron' | 'web';

type HandoffOutcomeStatus = 'ok' | 'error';

export interface HandoffStatsLine {
  readonly target: HandoffTarget;
  readonly host: HandoffHost;
  readonly outcome: HandoffOutcomeStatus;
  readonly ts: string;
  readonly reason?: HandoffFailureReason;
  readonly scope?: HandoffScope;
}

interface RecordHandoffDeps {
  readonly psDesktop?: { shell: { recordHandoff(line: HandoffStatsLine): Promise<void> } };
  readonly warn?: (message: string) => void;
}

export async function recordHandoff(
  line: HandoffStatsLine,
  deps: RecordHandoffDeps = {},
): Promise<void> {
  const psDesktop =
    deps.psDesktop ?? (typeof window !== 'undefined' ? window.psDesktop : undefined);
  if (!psDesktop?.shell?.recordHandoff) {
    return;
  }
  try {
    await psDesktop.shell.recordHandoff(line);
  } catch (err) {
    const warn = deps.warn ?? ((m: string) => console.warn(m));
    const reason = err instanceof Error ? err.message : String(err);
    warn(`[handoff] recordHandoff IPC rejected (telemetry skipped): ${reason}`);
  }
}
