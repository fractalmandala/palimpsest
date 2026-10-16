import { describe, expect, test } from 'vitest';
import {
  pathShimBinDir,
  pathShimBlockLabel,
  pathShimFishConfFileName,
  pathShimHomeDirName,
  pathShimMarkerPath,
} from './path-shim-layout.ts';

describe('path shim layout', () => {
  test('Stable keeps its historical names and paths', () => {
    expect(pathShimHomeDirName('stable')).toBe('.ps');
    expect(pathShimBinDir('stable', '/Users/a/')).toBe('/Users/a/.ps/bin');
    expect(pathShimMarkerPath('stable', '/Users/a')).toBe(
      '/Users/a/Library/Application Support/Palimpsest/path-install.json',
    );
    expect(pathShimBlockLabel('stable')).toBe('palimpsest cli');
    expect(pathShimFishConfFileName('stable')).toBe('palimpsest.fish');
  });

  test('Beta lives under ~/.ps-beta with its own block and fish file', () => {
    expect(pathShimHomeDirName('beta')).toBe('.ps-beta');
    expect(pathShimBinDir('beta', '/Users/a')).toBe('/Users/a/.ps-beta/bin');
    expect(pathShimMarkerPath('beta', '/Users/a')).toBe('/Users/a/.ps-beta/path-install.json');
    expect(pathShimBlockLabel('beta')).toBe('palimpsest beta cli');
    expect(pathShimFishConfFileName('beta')).toBe('palimpsest-beta.fish');
  });
});
