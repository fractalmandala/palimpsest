import { homedir } from 'node:os';
import { join } from 'node:path';
import { currentDesktopProduct } from './product.ts';

export function psUserHomeDir(home: string = homedir()): string {
  return join(home, currentDesktopProduct().userHomeDirName);
}
