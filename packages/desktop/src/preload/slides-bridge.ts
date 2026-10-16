import type { PsSlidesOpenResult, PsSlidesStatusResult } from '../shared/ipc-channels.ts';
import type { IpcInvoker } from '../shared/ipc-invoke.ts';

export interface SlidesBridge {
  status(): Promise<PsSlidesStatusResult>;
  open(docPath: string): Promise<PsSlidesOpenResult>;
}

export function createSlidesBridge(invoke: IpcInvoker): SlidesBridge {
  return {
    status: async () => {
      const result = await invoke('ps:slides:dispatch', { kind: 'status' });
      if (result.kind !== 'status') {
        throw new Error('ps:slides:dispatch: expected status result');
      }
      return result;
    },
    open: async (docPath: string) => {
      const result = await invoke('ps:slides:dispatch', { kind: 'open', docPath });
      if (result.kind !== 'open') {
        throw new Error('ps:slides:dispatch: expected open result');
      }
      return result;
    },
  };
}
