import { describe, expect, test } from 'vitest';
import {
  DOWNLOADS_END,
  DOWNLOADS_START,
  renderDownloadsBlock,
  stripDownloadsBlock,
  upsertDownloadsBlock,
} from './render-release-downloads.mjs';

const REPO = 'fractalmandala/palimpsest';
const TAG = 'v0.43.0';

const ALL_INSTALLERS = [
  'Palimpsest-arm64.dmg',
  'Palimpsest-Setup-x64.exe',
  'Palimpsest-Setup-arm64.exe',
  'Palimpsest-amd64.deb',
  'Palimpsest-arm64.deb',
  'Palimpsest-x86_64.rpm',
  'Palimpsest-aarch64.rpm',
];

const ALL_ASSETS = [
  ...ALL_INSTALLERS,
  'Palimpsest-arm64.dmg.blockmap',
  'Palimpsest-0.43.0-arm64-mac.zip',
  'Palimpsest-0.43.0-arm64-mac.zip.blockmap',
  'latest-mac.yml',
  'latest.yml',
  'latest-linux.yml',
  'latest-linux-arm64.yml',
];

const BETA_BODY = 'Delta since previous beta v0.43.0-beta.4\n\n### Patch Changes\n\n- fix a thing\n\n<!-- ps-consumed-set: ["abc"] -->\n';

describe('renderDownloadsBlock', () => {
  test('renders one row per present installer, none for updater plumbing', () => {
    const block = renderDownloadsBlock({ tag: TAG, repo: REPO, assetNames: ALL_ASSETS });
    for (const name of ALL_INSTALLERS) {
      expect(block).toContain(`[${name}](https://github.com/${REPO}/releases/download/${TAG}/${name})`);
    }
    expect(block).not.toContain('mac.zip');
    expect(block).not.toContain('.blockmap');
    expect(block).not.toContain('.yml');
  });

  test('omits rows for absent installers instead of rendering dead links', () => {
    const block = renderDownloadsBlock({
      tag: TAG,
      repo: REPO,
      assetNames: ['Palimpsest-arm64.dmg', 'Palimpsest-amd64.deb'],
    });
    expect(block).toContain('Palimpsest-arm64.dmg');
    expect(block).toContain('Palimpsest-amd64.deb');
    expect(block).not.toContain('Setup-x64');
    expect(block).not.toContain('.rpm');
  });

  test('returns null when no known installer is attached', () => {
    expect(renderDownloadsBlock({ tag: TAG, repo: REPO, assetNames: ['latest.yml'] })).toBeNull();
    expect(renderDownloadsBlock({ tag: TAG, repo: REPO, assetNames: [] })).toBeNull();
  });

  test('URLs are tag-pinned, never latest/download', () => {
    const block = renderDownloadsBlock({ tag: TAG, repo: REPO, assetNames: ALL_ASSETS });
    expect(block).toContain(`/releases/download/${TAG}/`);
    expect(block).not.toContain('/releases/latest/');
  });
});

describe('upsertDownloadsBlock', () => {
  test('appends the block after the existing body, preserving it byte-for-byte', () => {
    const out = upsertDownloadsBlock({
      body: BETA_BODY,
      tag: TAG,
      repo: REPO,
      assetNames: ALL_ASSETS,
    });
    expect(out.startsWith(BETA_BODY.trimEnd())).toBe(true);
    expect(out).toContain('<!-- ps-consumed-set: ["abc"] -->');
    expect(out).toContain(DOWNLOADS_START);
    expect(out).toContain(DOWNLOADS_END);
  });

  test('is idempotent: re-rendering replaces the previous block, never stacks', () => {
    const once = upsertDownloadsBlock({ body: BETA_BODY, tag: TAG, repo: REPO, assetNames: ALL_ASSETS });
    const twice = upsertDownloadsBlock({ body: once, tag: TAG, repo: REPO, assetNames: ALL_ASSETS });
    expect(twice).toBe(once);
    expect(twice.split(DOWNLOADS_START).length).toBe(2);
  });

  test('a re-render with fewer assets drops the missing rows', () => {
    const once = upsertDownloadsBlock({ body: BETA_BODY, tag: TAG, repo: REPO, assetNames: ALL_ASSETS });
    const rerender = upsertDownloadsBlock({
      body: once,
      tag: TAG,
      repo: REPO,
      assetNames: ['Palimpsest-arm64.dmg'],
    });
    expect(rerender).toContain('Palimpsest-arm64.dmg');
    expect(rerender).not.toContain('Setup-x64');
  });

  test('no installers → the body stays unchanged (no empty Downloads section)', () => {
    expect(
      upsertDownloadsBlock({ body: BETA_BODY, tag: TAG, repo: REPO, assetNames: ['latest.yml'] }),
    ).toBe(BETA_BODY);
  });

  test('a re-render with NO installers strips a previously-rendered block', () => {
    const withBlock = upsertDownloadsBlock({ body: BETA_BODY, tag: TAG, repo: REPO, assetNames: ALL_ASSETS });
    const rerender = upsertDownloadsBlock({
      body: withBlock,
      tag: TAG,
      repo: REPO,
      assetNames: ['latest.yml'],
    });
    expect(rerender).not.toContain(DOWNLOADS_START);
    expect(rerender).not.toContain('## Downloads');
    expect(rerender).toContain('<!-- ps-consumed-set: ["abc"] -->');
  });

  test('works on an empty body (manual releases have none)', () => {
    const out = upsertDownloadsBlock({ body: '', tag: TAG, repo: REPO, assetNames: ALL_ASSETS });
    expect(out.startsWith(DOWNLOADS_START)).toBe(true);
  });
});

describe('stripDownloadsBlock', () => {
  test('removes the block and leaves the rest of the body intact', () => {
    const withBlock = upsertDownloadsBlock({ body: BETA_BODY, tag: TAG, repo: REPO, assetNames: ALL_ASSETS });
    const stripped = stripDownloadsBlock(withBlock);
    expect(stripped).not.toContain(DOWNLOADS_START);
    expect(stripped).not.toContain('## Downloads');
    expect(stripped).toContain('<!-- ps-consumed-set: ["abc"] -->');
    expect(stripped).toContain('fix a thing');
  });

  test('passes through a body with no block untouched', () => {
    expect(stripDownloadsBlock(BETA_BODY)).toBe(BETA_BODY);
  });
});
