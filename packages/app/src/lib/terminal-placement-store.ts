import {
  DEFAULT_TERMINAL_PLACEMENT,
  normalizeTerminalPlacement,
  type TerminalPlacement,
} from '@palimpsest/core/terminal-layout';

export type { TerminalPlacement } from '@palimpsest/core/terminal-layout';
export { DEFAULT_TERMINAL_PLACEMENT } from '@palimpsest/core/terminal-layout';

export const TERMINAL_PLACEMENT_KEY = 'ps-terminal-placement-v1';

export interface TerminalPlacementStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function readTerminalPlacement(storage?: TerminalPlacementStorage): TerminalPlacement {
  try {
    const target = storage ?? localStorage;
    return normalizeTerminalPlacement(target.getItem(TERMINAL_PLACEMENT_KEY));
  } catch {
    return DEFAULT_TERMINAL_PLACEMENT;
  }
}

export function writeTerminalPlacement(
  placement: TerminalPlacement,
  storage?: TerminalPlacementStorage,
): void {
  try {
    const target = storage ?? localStorage;
    target.setItem(TERMINAL_PLACEMENT_KEY, placement);
  } catch {}
}
