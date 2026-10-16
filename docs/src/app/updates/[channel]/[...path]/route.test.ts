import { describe, expect, test, vi } from 'vitest';

type CaptureOpts = {
  event: string;
  distinctId: string;
  properties?: Record<string, string | undefined>;
};
let _lastCapture: CaptureOpts | null = null;

vi.doMock('../../../../lib/track.ts', () => ({
  captureServerEvent: (opts: CaptureOpts) => {
    _lastCapture = opts;
  },
  resolveDistinctId: () => 'updater-1',
  userAgentProperties: () => ({ ua_class: 'electron' }),
}));

const BETA_DMG_URL =
  'https://github.com/fractalmandala/palimpsest/releases/download/v0.20.0-beta.4/Palimpsest-Beta-arm64.dmg';
type BetaRedirect = { kind: string; url: string; cause?: string; refreshError?: string };
let _betaRedirect: BetaRedirect = { kind: 'fresh', url: BETA_DMG_URL };
let _selectedAsset: string | undefined;
vi.doMock('../../../../lib/download-links.ts', () => ({
  createBetaResolver:
    ({ assetName }: { assetName: string }) =>
    () => {
      _selectedAsset = assetName;
      return Promise.resolve(_betaRedirect);
    },
}));

const { GET } = await import('./route.ts');
const REL = 'https://github.com/fractalmandala/palimpsest/releases';

function call(
  channel: string,
  path: string[],
  headers: Record<string, string> = {},
): Promise<Response> {
  return GET(
    new Request(
      `https://github.com/fractalmandala/palimpsest/updates/${channel}/${path.join('/')}`,
      { headers },
    ),
    {
      params: Promise.resolve({ channel, path }),
    },
  );
}

describe('GET /updates/[channel]/[...path]', () => {
  test.each([
    ['beta', 'beta-mac.yml', 'beta-mac.yml'],
    ['beta', 'Palimpsest-Setup-x64.exe', 'beta.yml'],
    ['beta', 'Palimpsest-arm64.deb', 'beta-linux-arm64.yml'],
    ['beta', 'Palimpsest-x86_64.rpm', 'beta-linux.yml'],
    ['beta-product', 'Palimpsest-Beta-aarch64.rpm', 'beta-product-linux-arm64.yml'],
  ])(
    '%s/%s resolves a release carrying %s, not another platform',
    async (channel, filename, manifest) => {
      _betaRedirect = { kind: 'fresh', url: BETA_DMG_URL };
      expect((await call(channel, [filename])).status).toBe(302);
      expect(_selectedAsset).toBe(manifest);
    },
  );

  test('stable manifest 302s to the latest alias and is NOT counted', async () => {
    _lastCapture = null;
    const res = await call('stable', ['latest-mac.yml']);
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe(`${REL}/latest/download/latest-mac.yml`);
    expect(_lastCapture).toBeNull();
  });

  test('beta manifest 302s to the resolved beta tag and is NOT counted', async () => {
    _betaRedirect = { kind: 'fresh', url: BETA_DMG_URL };
    _lastCapture = null;
    const res = await call('beta', ['beta-mac.yml']);
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe(`${REL}/download/v0.20.0-beta.4/beta-mac.yml`);
    expect(_lastCapture).toBeNull();
  });

  test('stable zip 302s to the tagged release and counts app_update_downloaded', async () => {
    _lastCapture = null;
    const file = 'Palimpsest-0.20.0-arm64-mac.zip';
    const res = await call('stable', [file], { 'x-ps-from-version': '0.19.1' });
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe(`${REL}/download/v0.20.0/${file}`);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(_lastCapture?.event).toBe('app_update_downloaded');
    expect(_lastCapture?.properties?.channel).toBe('stable');
    expect(_lastCapture?.properties?.artifact_type).toBe('zip');
    expect(_lastCapture?.properties?.to_version).toBe('0.20.0');
    expect(_lastCapture?.properties?.from_version).toBe('0.19.1');
    expect(_lastCapture?.properties?.ua_class).toBe('electron');
    expect(_lastCapture?.properties?.os).toBe('macos');
    expect(_lastCapture?.properties?.arch).toBe('arm64');
  });

  test('beta zip parses the prerelease version and counts (no from_version header)', async () => {
    _lastCapture = null;
    const file = 'Palimpsest-0.20.0-beta.4-arm64-mac.zip';
    const res = await call('beta', [file]);
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe(`${REL}/download/v0.20.0-beta.4/${file}`);
    expect(_lastCapture?.properties?.to_version).toBe('0.20.0-beta.4');
    expect(_lastCapture?.properties?.from_version).toBeUndefined();
  });

  test('an ill-formed x-ps-from-version header is dropped, not forwarded to analytics', async () => {
    _lastCapture = null;
    const file = 'Palimpsest-0.20.0-arm64-mac.zip';
    const res = await call('stable', [file], { 'x-ps-from-version': '../etc; rm -rf' });
    expect(res.status).toBe(302);
    expect(_lastCapture?.event).toBe('app_update_downloaded');
    expect(_lastCapture?.properties?.from_version).toBeUndefined();
  });

  test('blockmap 302s but is NOT counted', async () => {
    _lastCapture = null;
    const file = 'Palimpsest-0.20.0-arm64-mac.zip.blockmap';
    const res = await call('stable', [file]);
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe(`${REL}/download/v0.20.0/${file}`);
    expect(_lastCapture).toBeNull();
  });

  test('human dmg 302s (latest alias) but is NOT counted', async () => {
    _lastCapture = null;
    const res = await call('stable', ['Palimpsest-arm64.dmg']);
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe(`${REL}/latest/download/Palimpsest-arm64.dmg`);
    expect(_lastCapture).toBeNull();
  });

  test('dmg blockmap 302s (latest alias) but is NOT counted', async () => {
    _lastCapture = null;
    const file = 'Palimpsest-arm64.dmg.blockmap';
    const res = await call('stable', [file]);
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe(`${REL}/latest/download/${file}`);
    expect(_lastCapture).toBeNull();
  });

  test('invalid channel → 404', async () => {
    expect((await call('canary', ['latest-mac.yml'])).status).toBe(404);
  });

  test('public channel paths reject the other product manifest or artifact', async () => {
    expect((await call('stable', ['beta-mac.yml'])).status).toBe(404);
    expect((await call('beta', ['latest-mac.yml'])).status).toBe(404);
    expect((await call('stable', ['Palimpsest-Beta-0.21.0-beta.4-arm64-mac.zip'])).status).toBe(
      404,
    );
    expect((await call('beta', ['Palimpsest-0.21.0-arm64-mac.zip'])).status).toBe(404);
    expect((await call('beta', ['Palimpsest-Beta-0.21.0-beta.4-arm64-mac.zip'])).status).toBe(404);
    expect((await call('beta', ['beta-product-mac.yml'])).status).toBe(404);
    expect((await call('beta-product', ['beta-mac.yml'])).status).toBe(404);
    expect((await call('beta-product', ['Palimpsest-0.21.0-beta.4-arm64-mac.zip'])).status).toBe(
      404,
    );
  });

  test('separate Beta uses its own manifest and artifact names', async () => {
    _betaRedirect = { kind: 'fresh', url: BETA_DMG_URL };
    const manifest = await call('beta-product', ['beta-product-mac.yml']);
    expect(manifest.headers.get('location')).toBe(
      `${REL}/download/v0.20.0-beta.4/beta-product-mac.yml`,
    );
    const file = 'Palimpsest-Beta-0.20.0-beta.4-arm64-mac.zip';
    expect((await call('beta-product', [file])).headers.get('location')).toBe(
      `${REL}/download/v0.20.0-beta.4/${file}`,
    );
  });

  test('path traversal / multi-segment → 404', async () => {
    expect((await call('stable', ['..', 'secret'])).status).toBe(404);
  });

  test('unknown artifact type → 404', async () => {
    expect((await call('stable', ['random.txt'])).status).toBe(404);
  });

  test('x64 zip parses the version and counts', async () => {
    _lastCapture = null;
    const file = 'Palimpsest-0.20.0-x64-mac.zip';
    const res = await call('stable', [file]);
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe(`${REL}/download/v0.20.0/${file}`);
    expect(_lastCapture?.properties?.to_version).toBe('0.20.0');
  });

  test('beta manifest 503s (no-store) on resolver fallback, not counted', async () => {
    _betaRedirect = { kind: 'fallback', url: REL, cause: 'API error' };
    _lastCapture = null;
    const res = await call('beta', ['beta-mac.yml']);
    expect(res.status).toBe(503);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(_lastCapture).toBeNull();
    _betaRedirect = { kind: 'fresh', url: BETA_DMG_URL };
  });

  test('stale-lkg resolver still 302s (graceful degradation during a GitHub outage)', async () => {
    _betaRedirect = { kind: 'stale-lkg', url: BETA_DMG_URL, refreshError: 'API timeout' };
    _lastCapture = null;
    const res = await call('beta', ['beta-mac.yml']);
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe(`${REL}/download/v0.20.0-beta.4/beta-mac.yml`);
    expect(_lastCapture).toBeNull();
    _betaRedirect = { kind: 'fresh', url: BETA_DMG_URL };
  });

  test('Windows stable manifest (latest.yml) 302s to the latest alias, NOT counted', async () => {
    _lastCapture = null;
    const res = await call('stable', ['latest.yml']);
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe(`${REL}/latest/download/latest.yml`);
    expect(_lastCapture).toBeNull();
  });

  test('Windows beta manifest (beta.yml) 302s to the resolved beta tag, NOT counted', async () => {
    _lastCapture = null;
    const res = await call('beta', ['beta.yml']);
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe(`${REL}/download/v0.20.0-beta.4/beta.yml`);
    expect(_lastCapture).toBeNull();
  });

  test('Linux manifests (x64 + arm64-suffixed, both channels) 302 and are NOT counted', async () => {
    _lastCapture = null;
    const stable = await call('stable', ['latest-linux-arm64.yml']);
    expect(stable.status).toBe(302);
    expect(stable.headers.get('location')).toBe(`${REL}/latest/download/latest-linux-arm64.yml`);
    const beta = await call('beta', ['beta-linux.yml']);
    expect(beta.status).toBe(302);
    expect(beta.headers.get('location')).toBe(`${REL}/download/v0.20.0-beta.4/beta-linux.yml`);
    expect(_lastCapture).toBeNull();
  });

  test('Windows stable exe counts with artifact_type=exe and no to_version when the updater sends no header', async () => {
    _lastCapture = null;
    const file = 'Palimpsest-Setup-x64.exe';
    const res = await call('stable', [file], { 'x-ps-from-version': '0.19.1' });
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe(`${REL}/latest/download/${file}`);
    expect(_lastCapture?.event).toBe('app_update_downloaded');
    expect(_lastCapture?.properties?.artifact_type).toBe('exe');
    expect(_lastCapture?.properties?.to_version).toBeUndefined();
    expect(_lastCapture?.properties?.from_version).toBe('0.19.1');
    expect(_lastCapture?.properties?.os).toBe('windows');
    expect(_lastCapture?.properties?.arch).toBe('x64');
  });

  test('a versionless stable installer takes to_version from the updater header', async () => {
    _lastCapture = null;
    const res = await call('stable', ['Palimpsest-Setup-arm64.exe'], {
      'x-ps-from-version': '0.19.1',
      'x-ps-to-version': '0.20.0',
    });
    expect(res.status).toBe(302);
    expect(_lastCapture?.properties?.to_version).toBe('0.20.0');
    expect(_lastCapture?.properties?.from_version).toBe('0.19.1');
  });

  test('an ill-formed x-ps-to-version is dropped, not forwarded to analytics', async () => {
    _lastCapture = null;
    const res = await call('stable', ['Palimpsest-amd64.deb'], {
      'x-ps-to-version': '0.20.0; DROP TABLE',
    });
    expect(res.status).toBe(302);
    expect(_lastCapture?.properties?.to_version).toBeUndefined();
  });

  test('server-derived versions outrank the header, which is only a client claim', async () => {
    _lastCapture = null;
    await call('stable', ['Palimpsest-0.20.0-arm64-mac.zip'], {
      'x-ps-to-version': '9.9.9',
    });
    expect(_lastCapture?.properties?.to_version).toBe('0.20.0');

    _lastCapture = null;
    await call('beta', ['Palimpsest-arm64.deb'], { 'x-ps-to-version': '9.9.9' });
    expect(_lastCapture?.properties?.to_version).toBe('0.20.0-beta.4');
  });

  test('Linux beta deb counts with to_version derived from the resolved beta tag', async () => {
    _lastCapture = null;
    const file = 'Palimpsest-arm64.deb';
    const res = await call('beta', [file]);
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe(`${REL}/download/v0.20.0-beta.4/${file}`);
    expect(_lastCapture?.event).toBe('app_update_downloaded');
    expect(_lastCapture?.properties?.artifact_type).toBe('deb');
    expect(_lastCapture?.properties?.to_version).toBe('0.20.0-beta.4');
    expect(_lastCapture?.properties?.os).toBe('linux');
    expect(_lastCapture?.properties?.arch).toBe('arm64');
  });

  test('Linux stable rpm counts with artifact_type=rpm and no to_version when the updater sends no header', async () => {
    _lastCapture = null;
    const file = 'Palimpsest-x86_64.rpm';
    const res = await call('stable', [file]);
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe(`${REL}/latest/download/${file}`);
    expect(_lastCapture?.properties?.artifact_type).toBe('rpm');
    expect(_lastCapture?.properties?.to_version).toBeUndefined();
    expect(_lastCapture?.properties?.os).toBe('linux');
    expect(_lastCapture?.properties?.arch).toBe('x64');
  });

  test('every packager arch spelling normalizes onto one analytics vocabulary', async () => {
    const cases: ReadonlyArray<readonly [string, string, string]> = [
      ['Palimpsest-Setup-arm64.exe', 'windows', 'arm64'],
      ['Palimpsest-amd64.deb', 'linux', 'x64'],
      ['Palimpsest-aarch64.rpm', 'linux', 'arm64'],
      ['Palimpsest-0.20.0-universal-mac.zip', 'macos', 'universal'],
    ];
    for (const [file, os, arch] of cases) {
      _lastCapture = null;
      const res = await call('stable', [file]);
      expect(res.status).toBe(302);
      expect(_lastCapture?.properties?.os, file).toBe(os);
      expect(_lastCapture?.properties?.arch, file).toBe(arch);
    }
  });

  test('an unrecognized arch token is dropped, not forwarded to analytics', async () => {
    _lastCapture = null;
    const res = await call('stable', ['Palimpsest-riscv64.deb']);
    expect(res.status).toBe(302);
    expect(_lastCapture?.properties?.os).toBe('linux');
    expect(_lastCapture?.properties?.arch).toBeUndefined();
  });

  test('a manifest-lookalike name that is not a real channel file → 404', async () => {
    expect((await call('stable', ['nightly-mac.yml'])).status).toBe(404);
    expect((await call('stable', ['latest-windows.yml'])).status).toBe(404);
    expect((await call('stable', ['builder-debug.yml'])).status).toBe(404);
  });
});
