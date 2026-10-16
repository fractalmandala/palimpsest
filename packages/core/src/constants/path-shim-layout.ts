import { posixOkManagedBinDir } from './ps-dir.ts';
import { DESKTOP_PRODUCTS, type DesktopProductName } from './product.ts';

function posixHome(home: string): string {
  return home.replace(/\/+/g, '/').replace(/\/+$/, '');
}

export function pathShimHomeDirName(channel: DesktopProductName): string {
  return DESKTOP_PRODUCTS[channel].userHomeDirName;
}

export function pathShimBinDir(channel: DesktopProductName, home: string): string {
  return posixOkManagedBinDir(home, pathShimHomeDirName(channel));
}

export function pathShimMarkerPath(channel: DesktopProductName, home: string): string {
  if (channel === 'stable') {
    return `${posixHome(home)}/Library/Application Support/Palimpsest/path-install.json`;
  }
  return `${posixHome(home)}/${pathShimHomeDirName(channel)}/path-install.json`;
}

export function pathShimBlockLabel(channel: DesktopProductName): string {
  return channel === 'stable' ? 'palimpsest cli' : `palimpsest ${channel} cli`;
}

export function pathShimFishConfFileName(channel: DesktopProductName): string {
  return channel === 'stable' ? 'palimpsest.fish' : `open-knowledge-${channel}.fish`;
}
