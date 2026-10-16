import pkgJson from '../package.json' with { type: 'json' };

export { PS_DIR } from '@palimpsest/core';

export const CONFIG_FILENAME = 'config.yml';

export const PACKAGE_VERSION = pkgJson.version;
