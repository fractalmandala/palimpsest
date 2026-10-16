import { type ChildProcess, spawn } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, test } from 'vitest';
import { parse as parseYaml } from 'yaml';
import {
  betaBuildVersion,
  createLocalEntitlements,
  createVariantBuilderConfig,
  createVariantHelperInfo,
  createVariantNsisInclude,
  createVariantPostInstall,
  createVariantPostRemove,
  createVariantPostTransaction,
  parseBuilderConfig,
} from '../../scripts/desktop-variant-config.ts';
import { DESKTOP_VARIANTS } from '../../src/shared/desktop-variant.ts';
import { removeTempDirBestEffort } from '../support/temp-dir-cleanup.test-helper';

const desktopRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

const fixtures: string[] = [];
const children = new Map<ChildProcess, Promise<void>>();

afterEach(async () => {
  for (const [child, closed] of children) {
    if (child.pid !== undefined && child.exitCode === null && child.signalCode === null)
      child.kill();
    await closed;
  }
  children.clear();
  for (const fixture of fixtures.splice(0)) removeTempDirBestEffort(fixture);
});

async function runBuilder(
  args: string[],
  status = 0,
  signal = false,
  platform: NodeJS.Platform = process.platform,
  variant = 'stable',
) {
  const fixture = mkdtempSync(join(tmpdir(), 'ps-builder-wrapper-'));
  fixtures.push(fixture);
  for (const file of [
    'scripts/run-electron-builder.mjs',
    'scripts/desktop-variant-config.ts',
    'scripts/packaging-diagnostics.mjs',
    'src/shared/desktop-variant.ts',
    'package.json',
    'electron-builder.yml',
    'build/installer.nsh',
    'build/deb-postinst.sh',
    'build/deb-postrm.sh',
    'build/entitlements.mac.plist',
    'build/helper-bundle/Info.plist',
  ]) {
    const target = join(fixture, file);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(join(desktopRoot, file), target);
  }
  for (const dep of ['yaml', '@palimpsest/core']) {
    const target = join(fixture, 'node_modules', dep);
    mkdirSync(dirname(target), { recursive: true });
    symlinkSync(realpathSync(join(desktopRoot, 'node_modules', dep)), target, 'junction');
  }
  const builderDir = join(fixture, 'node_modules/electron-builder');
  mkdirSync(builderDir, { recursive: true });
  writeFileSync(
    join(builderDir, 'package.json'),
    JSON.stringify({ name: 'electron-builder', type: 'module' }),
  );
  writeFileSync(
    join(builderDir, 'cli.js'),
    `
    import { mkdirSync, writeFileSync } from 'node:fs';
    writeFileSync('invocation.json', JSON.stringify({
      execPath: process.execPath,
      args: process.argv.slice(2),
      entry: process.argv[1],
      cwd: process.cwd(),
      marker: process.env.PS_BUILDER_TEST_MARKER,
    }));
    process.exit(Number(process.env.PS_BUILDER_TEST_STATUS));
  `,
  );
  const preload = join(fixture, 'platform.mjs');
  writeFileSync(
    preload,
    `
    import childProcess from 'node:child_process';
    import { writeFileSync } from 'node:fs';
    import { syncBuiltinESMExports } from 'node:module';
    Object.defineProperty(process, 'platform', { value: process.env.PS_BUILDER_TEST_PLATFORM });
    const spawnSync = childProcess.spawnSync;
    childProcess.spawnSync = (command, args, options) => {
      writeFileSync('spawn.json', JSON.stringify({ command, args, shell: options?.shell ?? false, platform: process.platform }));
      return process.env.PS_BUILDER_TEST_SIGNAL === '1'
        ? { status: null, signal: 'SIGTERM' }
        : spawnSync(command, args, options);
    };
    syncBuiltinESMExports();
  `,
  );
  const child = spawn(
    process.execPath,
    ['--import', preload, join(fixture, 'scripts/run-electron-builder.mjs'), ...args],
    {
      cwd: fixture,
      env: {
        ...process.env,
        PATH: '',
        CSC_LINK: '',
        CSC_KEYCHAIN: '',
        PS_DESKTOP_VARIANT: variant,
        PS_BUILDER_TEST_MARKER: 'forwarded',
        PS_BUILDER_TEST_STATUS: String(status),
        PS_BUILDER_TEST_SIGNAL: signal ? '1' : '0',
        PS_BUILDER_TEST_PLATFORM: platform,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  children.set(child, new Promise<void>((resolve) => child.once('close', () => resolve())));
  let stderr = '';
  child.stdout.resume();
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (chunk: string) => {
    stderr += chunk;
  });
  const result = await new Promise<{
    status: number | null;
    signal: NodeJS.Signals | null;
    stderr: string;
  }>((resolve, reject) => {
    child.once('error', reject);
    child.once('close', (status, signal) => resolve({ status, signal, stderr }));
  });
  return { fixture: realpathSync(fixture), result };
}

const configSource = `
appId: com.fractalmandala.palimpsest
productName: Palimpsest
protocols:
  - name: Palimpsest URL
    schemes: [palimpsest]
publish:
  - provider: github
    owner: example
    repo: palimpsest
    channel: latest
mac:
  icon: build/psglass.icon
  entitlements: build/entitlements.mac.plist
  provisioningProfile: build/embedded.provisionprofile
  extraResources: []
  extraFiles: []
  extendInfo: {}
win:
  icon: build/icon.png
  extraResources:
    - from: resources/cli/bin/ps.cmd
      to: cli/bin/ps.cmd
    - from: resources/cli/bin/ps.ps1
      to: cli/bin/ps.ps1
dmg:
  artifactName: \${productName}-\${arch}.\${ext}
linux:
  icon: build/icon.png
  artifactName: \${productName}-\${arch}.\${ext}
  executableName: palimpsest
  extraResources: []
nsis:
  artifactName: \${productName}-Setup-\${arch}.\${ext}
  include: build/installer.nsh
deb:
  afterInstall: build/deb-postinst.sh
  afterRemove: build/deb-postrm.sh
rpm:
  afterInstall: build/deb-postinst.sh
  afterRemove: build/deb-postrm.sh
  depends: [libsecret]
`;

const paths = {
  includePath: '.variant-build/installer.nsh',
  postInstallPath: '.variant-build/deb-postinst.sh',
  postRemovePath: '.variant-build/deb-postrm.sh',
  postTransactionPath: '.variant-build/rpm-posttrans.sh',
  localEntitlementsPath: '.variant-build/entitlements.mac.local.plist',
  helperInfoPath: '.variant-build/helper-Info.plist',
  profileAvailable: false,
};

const token = (name: string): string => `\${${name}}`;
const macArtifact = (name: string): string =>
  `${name}-${token('version')}-${token('arch')}-mac.${token('ext')}`;
const platformArtifact = (name: string): string => `${name}-${token('arch')}.${token('ext')}`;
const nsisArtifact = (name: string): string => `${name}-Setup-${token('arch')}.${token('ext')}`;

describe('desktop variant builder config', () => {
  test('legacy Beta preserves the installed identity, CLI wrappers and old manifest names', () => {
    const stable = createVariantBuilderConfig(
      parseBuilderConfig(configSource),
      'stable',
      paths,
      '0.78.0-beta.6',
    );
    const legacy = createVariantBuilderConfig(
      parseBuilderConfig(configSource),
      'legacy-beta',
      paths,
      '0.78.0-beta.6',
    );
    expect(legacy).toEqual({
      ...stable,
      extraMetadata: {
        ...stable.extraMetadata,
        psDesktopVariant: 'legacy-beta',
        version: '0.78.0-beta.6',
      },
      publish: stable.publish.map((entry) => ({ ...entry, channel: 'beta' })),
    });
  });

  test('preserves Stable identity', () => {
    const config = createVariantBuilderConfig(
      parseBuilderConfig(configSource),
      'stable',
      paths,
      '0.77.7',
    );
    expect(config).toMatchObject({
      appId: 'com.fractalmandala.palimpsest',
      productName: 'Palimpsest',
      protocols: [{ schemes: ['palimpsest'] }],
      publish: [{ channel: 'latest' }],
      mac: {
        icon: 'build/psglass.icon',
        artifactName: macArtifact('Palimpsest'),
        provisioningProfile: 'build/embedded.provisionprofile',
      },
      dmg: { artifactName: platformArtifact('Palimpsest') },
      nsis: { artifactName: nsisArtifact('Palimpsest') },
      linux: {
        artifactName: platformArtifact('Palimpsest'),
        executableName: 'palimpsest',
      },
      deb: {
        afterInstall: paths.postInstallPath,
        afterRemove: paths.postRemovePath,
        packageName: 'palimpsest',
        fpm: [],
      },
      rpm: {
        afterInstall: paths.postInstallPath,
        afterRemove: paths.postRemovePath,
        packageName: 'palimpsest',
        depends: ['libsecret'],
        fpm: [
          '--replaces',
          'Palimpsest',
          '--provides',
          'Palimpsest',
          '--rpm-posttrans',
          paths.postTransactionPath,
        ],
      },
    });
    expect(config.win.extraResources).toEqual([
      { from: 'resources/cli/bin/ps.cmd', to: 'cli/bin/ps.cmd' },
      { from: 'resources/cli/bin/ps.ps1', to: 'cli/bin/ps.ps1' },
    ]);
  });

  test('builds isolated Beta config', () => {
    const beta = createVariantBuilderConfig(
      parseBuilderConfig(configSource),
      'beta',
      paths,
      '0.77.7',
    );
    expect(beta).toMatchObject({
      appId: 'com.fractalmandala.palimpsest.beta',
      productName: 'Palimpsest Beta',
      protocols: [{ schemes: ['palimpsest-beta'] }],
      publish: [{ channel: 'beta-product' }],
      extraMetadata: {
        name: 'palimpsest-beta-desktop',
        productName: 'Palimpsest Beta',
        version: '0.77.7-beta.0',
      },
      mac: {
        icon: 'build/icon-beta.png',
        artifactName: macArtifact('Palimpsest-Beta'),
        entitlements: paths.localEntitlementsPath,
      },
      dmg: { artifactName: platformArtifact('Palimpsest-Beta') },
      nsis: { artifactName: nsisArtifact('Palimpsest-Beta') },
      linux: {
        artifactName: platformArtifact('Palimpsest-Beta'),
        executableName: 'palimpsest-beta',
      },
      deb: {
        afterInstall: paths.postInstallPath,
        afterRemove: paths.postRemovePath,
        packageName: 'palimpsest-beta',
        fpm: [
          '--replaces',
          'palimpsest-beta-desktop',
          '--conflicts',
          'palimpsest-beta-desktop',
          '--provides',
          'palimpsest-beta-desktop',
        ],
      },
      rpm: {
        afterInstall: paths.postInstallPath,
        afterRemove: paths.postRemovePath,
        packageName: 'palimpsest-beta',
        depends: ['libsecret'],
        fpm: [
          '--replaces',
          'palimpsest-beta-desktop',
          '--provides',
          'palimpsest-beta-desktop',
          '--rpm-posttrans',
          paths.postTransactionPath,
        ],
      },
    });
    expect(beta.mac.provisioningProfile).toBeUndefined();
    expect(beta.win.extraResources.map((entry) => entry.to)).toEqual([
      'cli/bin/ps-beta.cmd',
      'cli/bin/ps-beta.ps1',
      'cli/bin/palimpsest-beta.cmd',
      'cli/bin/palimpsest-beta.ps1',
    ]);
  });

  test.each([
    { variant: 'stable', icon: 'build/icon.ico' },
    { variant: 'beta', icon: 'build/icon-beta.ico' },
    { variant: 'legacy-beta', icon: 'build/icon.ico' },
  ] as const)('selects the committed Windows icon for $variant', ({ variant, icon }) => {
    expect(existsSync(resolve(desktopRoot, icon)), icon).toBe(true);
    const config = createVariantBuilderConfig(
      parseBuilderConfig(configSource),
      variant,
      paths,
      '0.77.7',
    );
    expect(config.win.icon).toBe(icon);
  });

  test('selects the matching signed profile when it is available', () => {
    const beta = createVariantBuilderConfig(
      parseBuilderConfig(configSource),
      'beta',
      {
        ...paths,
        profileAvailable: true,
      },
      '0.77.7-beta.4',
    );
    expect(beta.mac.provisioningProfile).toBe('build/embedded.beta.provisionprofile');
    expect(beta.mac.entitlements).toBe('build/entitlements.mac.plist');
    expect(beta.extraMetadata?.version).toBe('0.77.7-beta.4');
  });

  test('derives a valid manual Beta version from the package version', () => {
    expect(betaBuildVersion('0.77.7')).toBe('0.77.7-beta.0');
    expect(betaBuildVersion('0.77.7-beta.4')).toBe('0.77.7-beta.4');
    expect(() => betaBuildVersion('dev')).toThrow(/invalid/);
  });

  test('names platform integration shims per variant', () => {
    expect(
      createVariantNsisInclude(
        'palimpsest:// Software\\Classes\\palimpsest URL:Palimpsest',
        'beta',
      ),
    ).toBe('palimpsest-beta:// Software\\Classes\\palimpsest-beta URL:Palimpsest Beta');
    expect(
      createVariantPostInstall(
        'ln -sf "$PS_WRAPPER" /usr/bin/ps\nln -sf "$PS_WRAPPER" /usr/bin/palimpsest',
        'beta',
      ),
    ).toContain(
      'ln -sf "$PS_WRAPPER" /usr/bin/ps-beta\nln -sf "$PS_WRAPPER" /usr/bin/palimpsest-beta',
    );
    expect(
      createVariantPostRemove(
        'for link in /usr/bin/ps /usr/bin/palimpsest /usr/bin/ok /usr/bin/open-knowledge; do',
        'beta',
      ),
    ).toContain('/usr/bin/ps-beta /usr/bin/palimpsest-beta');
  });

  test.each([
    {
      variant: 'stable',
      links: ['/usr/bin/ps', '/usr/bin/palimpsest'],
      exe: "'/opt/Palimpsest/palimpsest'",
    },
    {
      variant: 'beta',
      links: ['/usr/bin/ps-beta', '/usr/bin/palimpsest-beta'],
      exe: "'/opt/Palimpsest Beta/palimpsest-beta'",
    },
  ] as const)(
    'rebuilds the $variant postinst as an rpm post-transaction script with every macro expanded',
    ({ variant, links, exe }) => {
      const postInstall = readFileSync(resolve(desktopRoot, 'build/deb-postinst.sh'), 'utf8');
      const script = createVariantPostTransaction(postInstall, variant);
      expect(script).not.toMatch(/\$\{/);
      expect(script).toContain(exe);
      for (const link of links) expect(script).toContain(`ln -sf "$PS_WRAPPER" ${link}`);
    },
  );

  test('refuses a post-transaction template with a macro it cannot expand', () => {
    expect(() =>
      createVariantPostTransaction(
        `ln -sf "$PS_WRAPPER" /usr/bin/ps\nln -sf "$PS_WRAPPER" /usr/bin/palimpsest\n${token('version')}`,
        'beta',
      ),
    ).toThrow(/\$\{version\}/);
  });

  test('drops the restricted entitlement for unsigned local variant builds', () => {
    expect(
      createLocalEntitlements(
        '<dict>\n<key>com.apple.developer.associated-domains</key><array><string>x</string></array>\n</dict>',
      ),
    ).toBe('<dict>\n</dict>');
  });

  test('names the detached helper bundle with the variant identity', () => {
    expect(
      createVariantHelperInfo(
        'com.fractalmandala.palimpsest.server Palimpsest Server Palimpsest Helper',
        'beta',
      ),
    ).toBe(
      'com.fractalmandala.palimpsest.beta.server Palimpsest Beta Server Palimpsest Beta Helper',
    );
  });

  test('transforms every committed packaging template for both variants', () => {
    const installer = readFileSync(resolve(desktopRoot, 'build/installer.nsh'), 'utf8');
    const postInstall = readFileSync(resolve(desktopRoot, 'build/deb-postinst.sh'), 'utf8');
    const postRemove = readFileSync(resolve(desktopRoot, 'build/deb-postrm.sh'), 'utf8');
    const entitlements = readFileSync(resolve(desktopRoot, 'build/entitlements.mac.plist'), 'utf8');
    const helperInfo = readFileSync(resolve(desktopRoot, 'build/helper-bundle/Info.plist'), 'utf8');

    for (const variant of ['stable', 'beta'] as const) {
      expect(() => createVariantNsisInclude(installer, variant)).not.toThrow();
      expect(() => createVariantPostInstall(postInstall, variant)).not.toThrow();
      expect(() => createVariantPostRemove(postRemove, variant)).not.toThrow();
      expect(() => createVariantPostTransaction(postInstall, variant)).not.toThrow();
      expect(() => createVariantHelperInfo(helperInfo, variant)).not.toThrow();
    }
    expect(() => createLocalEntitlements(entitlements)).not.toThrow();
  });

  test('fails closed when a packaging template loses a required anchor', () => {
    expect(() => createVariantNsisInclude('palimpsest://', 'beta')).toThrow(/registry key/);
    expect(() => createVariantPostInstall('ln -sf "$PS_WRAPPER" /usr/bin/ps', 'beta')).toThrow(
      /palimpsest install command/,
    );
    expect(() => createVariantPostRemove('missing', 'beta')).toThrow(/removal loop/);
    expect(createLocalEntitlements('<dict/>')).toBe('<dict/>');
    expect(() => createVariantHelperInfo('Palimpsest Server', 'beta')).toThrow(/bundle identifier/);
  });
});

const WRAPPER_CELLS = Object.keys(DESKTOP_VARIANTS).flatMap((variant) =>
  ['--linux', '--win', '--mac'].flatMap((target) =>
    (['darwin', 'win32', 'linux'] as const).map((platform) => ({ variant, target, platform })),
  ),
);

describe('electron-builder wrapper execution', () => {
  const baseRebuild = parseYaml(
    readFileSync(join(desktopRoot, 'electron-builder.yml'), 'utf8'),
  ).npmRebuild;

  test.each(WRAPPER_CELLS)(
    'runs $variant $target on $platform through Node with the target rebuild policy',
    async ({ variant, target, platform }) => {
      const { fixture, result } = await runBuilder(
        [target, '--publish', 'never'],
        0,
        false,
        platform,
        variant,
      );
      expect(result.status, result.stderr).toBe(0);
      const entry = join(fixture, 'node_modules/electron-builder/cli.js');
      const args = [
        target,
        '--publish',
        'never',
        '--config',
        '.variant-build/electron-builder.yml',
      ];
      expect(JSON.parse(readFileSync(join(fixture, 'spawn.json'), 'utf8'))).toEqual({
        command: process.execPath,
        args: [entry, ...args],
        shell: false,
        platform,
      });
      expect(JSON.parse(readFileSync(join(fixture, 'invocation.json'), 'utf8'))).toEqual({
        execPath: process.execPath,
        entry,
        args,
        cwd: fixture,
        marker: 'forwarded',
      });
      const generated = parseYaml(
        readFileSync(join(fixture, '.variant-build/electron-builder.yml'), 'utf8'),
      );
      expect(generated.npmRebuild).toBe(target === '--linux' ? false : baseRebuild);
      expect(generated.mac.notarize).toBe(false);
      expect(generated.rpm.fpm.slice(-2)).toEqual([
        '--rpm-posttrans',
        '.variant-build/rpm-posttrans.sh',
      ]);
      expect(readFileSync(join(fixture, '.variant-build/rpm-posttrans.sh'), 'utf8')).toContain(
        `/opt/${DESKTOP_VARIANTS[variant as keyof typeof DESKTOP_VARIANTS].productName}/`,
      );
    },
  );

  test('forwards a failing builder exit status', async () => {
    const { result } = await runBuilder(['--linux'], 7);
    expect(result.status, result.stderr).toBe(7);
  });

  test('reports a signaled builder as failure', async () => {
    const { result } = await runBuilder(['--linux'], 0, true);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('electron-builder terminated by SIGTERM');
  });

  test('the direct Linux overlay disables native rebuilds as well', () => {
    const overlay = parseYaml(
      readFileSync(join(desktopRoot, 'electron-builder.linux.yml'), 'utf8'),
    );
    expect(overlay.npmRebuild).toBe(false);
  });
});
