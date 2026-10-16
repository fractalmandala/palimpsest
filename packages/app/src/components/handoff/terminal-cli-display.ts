import {
  type HandoffTarget,
  TERMINAL_CLI_IDS,
  TERMINAL_CLIS,
  type TerminalCli,
} from '@palimpsest/core/handoff';

export const VISIBLE_CLIS: readonly TerminalCli[] = TERMINAL_CLI_IDS;

export function cliIconTargetId(cli: TerminalCli): HandoffTarget {
  return TERMINAL_CLIS[cli].handoffTarget;
}
