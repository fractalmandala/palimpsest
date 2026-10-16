import type { PsAboutInfo } from '@palimpsest/core/desktop-bridge';
import { releasesPageUrl, releaseUrlFor } from '../shared/release-links.ts';

export function buildAboutInfo({
  version,
  variant,
}: {
  version: string;
  variant: { readonly name: string; readonly productName: string };
}): PsAboutInfo {
  const releasesUrl = releasesPageUrl(variant);
  return {
    productName: variant.productName,
    version,
    releasesUrl,
    releaseNotesUrl: releaseUrlFor(version, releasesUrl),
  };
}
