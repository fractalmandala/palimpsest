import {
  type DesktopProduct,
  desktopProductForCliCommand,
  userHomeDisplayPath,
} from '@palimpsest/core/constants/product';

function rendererDesktopProduct(): DesktopProduct {
  return desktopProductForCliCommand(
    typeof window === 'undefined' ? null : window.psDesktop?.cliCommandName,
  );
}

export function psCliCommandName(): string {
  return rendererDesktopProduct().cliCommandNames[0];
}

export function psUserHomeLabel(...segments: string[]): string {
  return userHomeDisplayPath(rendererDesktopProduct(), ...segments);
}
