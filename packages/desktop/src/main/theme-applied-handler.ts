import type { PsChromeColors } from '../shared/bridge-contract.ts';

interface ApplyThemeAppliedDeps {
  fireThemeApplied: (window: object) => void;
  applyReducedTransparency: (reduced: boolean) => void;
  applyChromeColors: (chrome: PsChromeColors) => void;
  warn: (line: string) => void;
}

export function applyThemeApplied(
  deps: ApplyThemeAppliedDeps,
  senderWindow: object | null,
  opts: { reducedTransparency?: boolean; chrome?: PsChromeColors } | undefined,
): void {
  if (opts?.reducedTransparency !== undefined) {
    deps.applyReducedTransparency(opts.reducedTransparency);
  }
  if (opts?.chrome) {
    deps.applyChromeColors(opts.chrome);
  }
  if (senderWindow !== null) {
    deps.fireThemeApplied(senderWindow);
  } else {
    deps.warn(
      JSON.stringify({
        event: 'theme-applied-no-window-for-sender',
      }),
    );
  }
}
