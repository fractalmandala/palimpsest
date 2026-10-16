import {
  PALIMPSEST_DISCORD_URL,
  PALIMPSEST_DOCS_URL,
  PALIMPSEST_GITHUB_URL,
} from '@palimpsest/core';
import type { MenuDispatchCommand } from '../shared/ipc-channels.ts';

export type MenuDispatchHelpLinkCommand = Extract<
  MenuDispatchCommand,
  'open-github' | 'open-docs' | 'open-discord'
>;

const HELP_LINK_URLS: Readonly<Record<MenuDispatchHelpLinkCommand, string>> = {
  'open-github': PALIMPSEST_GITHUB_URL,
  'open-docs': PALIMPSEST_DOCS_URL,
  'open-discord': PALIMPSEST_DISCORD_URL,
};

export function menuDispatchHelpLinkUrl(command: MenuDispatchHelpLinkCommand): string {
  return HELP_LINK_URLS[command];
}
