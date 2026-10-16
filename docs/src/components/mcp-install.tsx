import type { ReactNode } from 'react';
import type { SerializerApi } from '@/lib/mdx-serializer';

const WEB_APP_GUIDE_HREF = '/docs/get-started/quickstart#ps-install-web-app';

interface McpInstallMarkdownApi extends Pick<SerializerApi, 'url'> {
  link(label: string, url: string): string;
}

export function mcpInstallMarkdown(editor: string, api: McpInstallMarkdownApi): string {
  return [
    `There are two ways to connect ${editor}, depending on how you run Palimpsest:`,
    '',
    `- **Desktop app** (macOS, Windows, Linux). The first time you open a project, a consent dialog detects ${editor} and configures it for you. To re-trigger the dialog, choose **File → Set up Palimpsest integrations…**.`,
    `- **Web app / terminal** (any platform, including Intel Macs — see the ${api.link('web app guide', api.url(WEB_APP_GUIDE_HREF))}). Run \`ps init\` in your project: it registers the Palimpsest MCP server with ${editor} and the other editors it detects. Every \`ps start\` repairs the entry if it has drifted (it never adds one you removed).`,
  ].join('\n');
}

export function McpInstall({ editor, children }: { editor: string; children?: ReactNode }) {
  return (
    <>
      <p>There are two ways to connect {editor}, depending on how you run Palimpsest:</p>
      <ul>
        <li>
          <strong>Desktop app</strong> (macOS, Windows, Linux). The first time you open a project, a
          consent dialog detects {editor} and configures it for you. To re-trigger the dialog,
          choose{' '}
          {/* oxlint-disable-next-line ps/microcopy-ellipsis -- quoting the literal menu label (menu.ts) */}
          <strong>File → Set up Palimpsest integrations…</strong>.
        </li>
        <li>
          <strong>Web app / terminal</strong> (any platform, including Intel Macs — see the{' '}
          <a href={WEB_APP_GUIDE_HREF}>web app guide</a>
          ). Run <code>ps init</code> in your project: it registers the Palimpsest MCP server with{' '}
          {editor} and the other editors it detects. Every <code>ps start</code> repairs the entry
          if it has drifted (it never adds one you removed).
        </li>
      </ul>
      {children}
    </>
  );
}
