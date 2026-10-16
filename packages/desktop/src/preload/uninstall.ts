import type {
  PsUninstallBridge,
  UninstallDispatchResult,
  UninstallIntent,
} from '@palimpsest/core';
import type { IpcInvoker } from '../shared/ipc-invoke.ts';

export function createUninstallBridge(invoke: IpcInvoker): PsUninstallBridge {
  return {
    ready: (): Promise<UninstallDispatchResult> =>
      invoke('ok:uninstall:dispatch', { kind: 'ready' }),
    send: (intent: UninstallIntent): Promise<UninstallDispatchResult> =>
      invoke('ok:uninstall:dispatch', intent),
  };
}
