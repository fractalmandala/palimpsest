// biome-ignore-all assist/source/organizeImports: each import form is a separate positive or negative case; merging or reordering them would erase cases and shift the asserted positions
// FIXTURE — drives `no-app-core-barrel-import.uncached.test.mjs` via shell-out to oxlint.
// Not part of the main lint: `__fixtures__/` is in `oxlint.config.ts#ignorePatterns`, and
// `__fixtures__/oxlint.fixtures.json` re-enables the rules for the test.
//
// Positive cases (one per line, each prefixed `p`): every module-reference form that names
// the bare core barrel, with or without a `?query` or `#hash` suffix. Negative cases (prefixed `n`): the adjacent shapes the rule must NOT
// match — declared subpaths, sibling packages sharing the prefix, the barrel name inside a
// string or a comment, and non-literal or member-call loads.

// === Positive cases — must fire ===

import { sharedExtensions } from '@palimpsest/core'; // p value
import type { LinterConfig } from '@palimpsest/core'; // p whole-declaration type
import { THEME_PLUGINS, type ThemePlugin } from '@palimpsest/core'; // p mixed
import * as coreNamespace from '@palimpsest/core'; // p namespace
import '@palimpsest/core'; // p side-effect
import coreDefault from '@palimpsest/core'; // p default
import coreRequired = require('@palimpsest/core'); // p TS import-equals
export { FORM_WRITE_ORIGIN } from '@palimpsest/core'; // p named re-export
export type { ConfigSchema } from '@palimpsest/core'; // p type re-export
export * from '@palimpsest/core'; // p star re-export
export * as coreStar from '@palimpsest/core'; // p star-as re-export
export type CoreModule = typeof import('@palimpsest/core'); // p typeof import type
export type CoreLinter = import('@palimpsest/core').LinterConfig; // p import type
export const pDynamic = () => import('@palimpsest/core'); // p literal dynamic import
export const pTemplate = () => import(`@palimpsest/core`); // p template, no expressions
export const pRequire = () => require('@palimpsest/core'); // p literal require
import coreRaw from '@palimpsest/core?raw'; // p query suffix
import '@palimpsest/core?v=1'; // p cache-busting query on a side-effect import
export const pHash = () => import('@palimpsest/core#entry'); // p hash suffix

// === Negative cases — must NOT fire ===

import { getGitHubStars } from '@palimpsest/core/utils/github-stars'; // n subpath
import type { CheckpointKind } from '@palimpsest/core/constants/checkpoint-kinds'; // n type subpath
import { startServer } from '@palimpsest/core/server'; // n pre-existing subpath
import { bootServer } from '@palimpsest/server'; // n sibling package
import { cliMain } from '@palimpsest/cli'; // n prefix of the barrel name
import { extra } from '@palimpsest/core-extra'; // n longer package sharing the prefix
export { SHOW_INSTALL_SKILL } from '@palimpsest/core/constants/feature-flags'; // n subpath re-export
export * from '@palimpsest/core/bridge'; // n subpath star re-export
export type BridgeModule = typeof import('@palimpsest/core/bridge'); // n subpath import type
export const nDynamic = () => import('@palimpsest/core/markdown/lint'); // n subpath dynamic import
export const nRequire = () => require('@palimpsest/core/bridge'); // n subpath require
import bridgeRaw from '@palimpsest/core/bridge?raw'; // n subpath with a query suffix
import extraVersioned from '@palimpsest/core-extra?v=1'; // n longer package with a query suffix
export const nString = '@palimpsest/core'; // n ordinary string literal
export const nMessage = `install @palimpsest/core`; // n template containing the name
// n the comment names '@palimpsest/core' and must not fire
export const nComputed = (suffix: string) => import(`@palimpsest/core${suffix}`); // n computed
export const nMember = (loader: { require(id: string): unknown }) =>
  loader.require('@palimpsest/core'); // n member call, not the require builtin

export const used = [
  sharedExtensions,
  THEME_PLUGINS,
  coreNamespace,
  coreDefault,
  coreRequired,
  coreRaw,
  bridgeRaw,
  extraVersioned,
  getGitHubStars,
  startServer,
  bootServer,
  cliMain,
  extra,
];
export type UsedType = LinterConfig | ThemePlugin | CheckpointKind;
