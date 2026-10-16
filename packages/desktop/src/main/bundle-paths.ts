import { dirname, join, win32 } from 'node:path';

export function wrapperPathInBundle(
  executablePath: string,
  platform: 'darwin' | 'win32' | 'linux' | string = process.platform,
): string {
  if (platform === 'win32') {
    return win32.join(win32.dirname(executablePath), 'resources', 'cli', 'bin', 'ps.cmd');
  }
  if (platform === 'linux') {
    return join(dirname(executablePath), 'resources', 'cli', 'bin', 'ps.sh');
  }
  const bundleRoot = executablePath.replace(/\/Contents\/MacOS\/.*$/, '');
  return join(bundleRoot, 'Contents', 'Resources', 'cli', 'bin', 'ps.sh');
}

export function appBundleRootFromExecutable(
  executablePath: string,
  platform: 'darwin' | 'win32' | 'linux' | string = process.platform,
): string {
  if (platform === 'win32') return win32.dirname(executablePath);
  if (platform === 'darwin') {
    const bundleRoot = executablePath.replace(/\/Contents\/MacOS\/[^/]+$/, '');
    if (bundleRoot !== executablePath) return bundleRoot;
  }
  return dirname(executablePath);
}
