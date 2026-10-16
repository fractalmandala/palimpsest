import { describe, expect, test } from 'vitest';
import { DESKTOP_PRODUCTS, PACKAGED_DESKTOP_PRODUCT_NAMES } from './constants/product.ts';
import {
  HELPER_BUNDLE_NAME,
  HELPER_EXECUTABLE_NAME,
  resolveHelperBundleBinary,
} from './helper-bundle.ts';

const PARENT_APP = '/Applications/Palimpsest.app';
const PARENT_EXEC = `${PARENT_APP}/Contents/MacOS/Palimpsest`;
const HELPER_BINARY = `${PARENT_APP}/Contents/Frameworks/${HELPER_BUNDLE_NAME}/Contents/MacOS/${HELPER_EXECUTABLE_NAME}`;

describe('resolveHelperBundleBinary', () => {
  test('joins the helper-bundle path relative to the parent .app/Contents/MacOS', () => {
    expect(resolveHelperBundleBinary(PARENT_EXEC)).toBe(HELPER_BINARY);
  });

  test('handles a user-Applications path identically', () => {
    const userParent = '/Users/alex/Applications/Palimpsest.app/Contents/MacOS/Palimpsest';
    expect(resolveHelperBundleBinary(userParent)).toBe(
      `/Users/alex/Applications/Palimpsest.app/Contents/Frameworks/${HELPER_BUNDLE_NAME}/Contents/MacOS/${HELPER_EXECUTABLE_NAME}`,
    );
  });

  test('keys off the executable, so a renamed app bundle still resolves', () => {
    expect(
      resolveHelperBundleBinary('/Applications/Renamed.app/Contents/MacOS/Palimpsest Beta'),
    ).toBe(
      '/Applications/Renamed.app/Contents/Frameworks/Palimpsest Beta Server.app/Contents/MacOS/Palimpsest Beta Helper',
    );
  });

  test.each(PACKAGED_DESKTOP_PRODUCT_NAMES.map((name) => DESKTOP_PRODUCTS[name]))(
    'matches the layout afterPack writes for $productName',
    ({ productName }) => {
      const app = `/Applications/${productName}.app`;
      expect(resolveHelperBundleBinary(`${app}/Contents/MacOS/${productName}`)).toBe(
        `${app}/Contents/Frameworks/${productName} Server.app/Contents/MacOS/${productName} Helper`,
      );
    },
  );
});
