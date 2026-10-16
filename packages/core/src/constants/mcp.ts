import { DESKTOP_PRODUCTS } from './product.ts';

export const READ_DOCUMENT_HISTORY_DEPTH = 5;

export const GREP_MAX_RESULTS = 50;

export const MCP_SERVER_NAME = DESKTOP_PRODUCTS.stable.mcpServerName;

export const SERVER_UNREACHABLE_ERROR_PREFIX = 'Server unreachable:';

export const SERVER_TIMEOUT_ERROR_PREFIX = 'Server timed out:';

export const PALIMPSEST_MCP_TOOLS = [
  'exec',
  'search',
  'history',
  'links',
  'skills',
  'config',
  'palette',
  'preview_url',
  'share_link',
  'lint',
  'audit',
  'write',
  'edit',
  'delete',
  'move',
  'install',
  'import',
  'checkpoint',
  'restore_version',
] as const;

export type PalimpsestMcpTool = (typeof PALIMPSEST_MCP_TOOLS)[number];

export const PALIMPSEST_MCP_WRITE_TOOLS = [
  'write',
  'edit',
  'delete',
  'move',
  'install',
  'import',
  'checkpoint',
  'restore_version',
] as const satisfies ReadonlyArray<PalimpsestMcpTool>;

export const PS_HOSTED_AGENT_ENV = 'PS_HOSTED_AGENT';

export const PS_DESKTOP_TERMINAL_ENV = 'PS_DESKTOP_TERMINAL';

export function resolveIsHostedAgent(env: Record<string, string | undefined>): boolean {
  return env[PS_DESKTOP_TERMINAL_ENV] === '1' || env[PS_HOSTED_AGENT_ENV] === '1';
}
