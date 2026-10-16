import { DEFAULT_GITHUB_OAUTH_CLIENT_ID } from '@palimpsest/core';

export function getOAuthClientId(): string {
  return process.env.PALIMPSEST_GITHUB_CLIENT_ID ?? DEFAULT_GITHUB_OAUTH_CLIENT_ID;
}
