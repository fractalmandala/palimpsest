import { agentIdForTerminalCli, type HostSnapshot } from '@palimpsest/core';
import { observeReadiness, type ReadinessObservationLogger } from '@palimpsest/server';

export interface TerminalGateObservationOptions {
  readonly launchCli: string;
  readonly projectRoot: string;
  readonly log: ReadinessObservationLogger;
  readonly snapshot: (projectRoot: string) => Promise<HostSnapshot>;
}

export async function observeTerminalLaunch(
  options: TerminalGateObservationOptions,
): Promise<void> {
  await observeReadiness({
    site: 'terminal',
    agentId: agentIdForTerminalCli(options.launchCli) ?? options.launchCli,
    mode: 'terminal',
    log: options.log,
    snapshot: () => options.snapshot(options.projectRoot),
  });
}
