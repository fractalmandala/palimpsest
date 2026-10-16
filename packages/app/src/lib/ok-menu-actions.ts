import type { PsMenuAction } from './desktop-bridge-types';

export const PS_MENU_ACTIONS = [
  'new-doc',
  'new-folder',
  'new-project',
  'rename',
  'delete',
  'close-active-tab-or-window',
  'toggle-sidebar',
  'toggle-source',
  'save-version',
  'version-history',
  'focus-search',
  'focus-command-palette',
  'navigate-back',
  'navigate-forward',
  'new-from-template',
  'duplicate',
  'move-to-trash',
  'reveal-in-finder',
  'send-to-ai',
  'copy-full-path',
  'copy-relative-path',
  'toggle-show-hidden-files',
  'toggle-show-ps-folders',
  'toggle-show-only-markdown-files',
  'toggle-show-skills-section',
  'expand-all-tree',
  'collapse-all-tree',
  'toggle-doc-panel',
  'toggle-terminal',
  'move-terminal',
  'toggle-agent-panel',
  'toggle-editor',
  'new-terminal',
  'kill-terminal',
  'new-worktree',
  'switch-worktree',
  'report-bug',
  'send-feedback',
] as const satisfies readonly PsMenuAction[];

type _MenuActionDrift = Exclude<PsMenuAction, (typeof PS_MENU_ACTIONS)[number]>;
const _menuActionDriftGuard: [_MenuActionDrift] extends [never]
  ? true
  : ['PS_MENU_ACTIONS is missing an PsMenuAction id', _MenuActionDrift] = true;
void _menuActionDriftGuard;
