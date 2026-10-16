import { t } from '@lingui/core/macro';
import { desktopChannelLabel } from '@palimpsest/core/constants/product';
import { psCliCommandName } from '@/lib/channel-cli-copy';
import type { PsDesktopBridge, PsServerRestartFailure } from '@/lib/desktop-bridge-types';

export function restartServerFailureMessage(failure: PsServerRestartFailure): string {
  switch (failure.reason) {
    case 'other-channel':
      return otherChannelRestartMessage(failure.holderChannel);
    case 'eperm':
      return t`Couldn't restart the server — another process owns it. Quit other Palimpsest windows for this project, then try again.`;
    case 'other': {
      const cliCommand = psCliCommandName();
      return t`Couldn't restart the server. Try \`${cliCommand} start\` in this folder.`;
    }
  }
}

export function otherChannelRestartMessage(holderChannel: string): string {
  const holder = desktopChannelLabel(holderChannel);
  return t`${holder} is serving this project, so this app won't stop it. Close this window and open the project again to stop ${holder}'s server and open the project here.`;
}

export async function restartCollabServer(
  bridge: Pick<PsDesktopBridge, 'restartServer' | 'config'>,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const outcome = await bridge.restartServer(bridge.config.projectPath);
  if (outcome.ok) return { ok: true };
  return { ok: false, message: restartServerFailureMessage(outcome) };
}
