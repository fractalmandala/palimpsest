import type { DesktopProduct } from './product.ts';

declare const serverName: DesktopProduct['mcpServerName'];
const _sharesPalimpsestPrefix: `palimpsest${string}` = serverName;
void _sharesPalimpsestPrefix;
