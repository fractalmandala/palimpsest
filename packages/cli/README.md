# @palimpsest/cli

[Palimpsest](https://github.com/fractalmandala/palimpsest) is a local-first, agent-friendly Markdown knowledge base with a rich editor. It is available as a desktop app for **macOS, Windows, and Linux**, or as the same local web app served from your terminal.

This package installs the cross-platform `ps` / `palimpsest` CLI and bundles the web app. Use it on Linux, Windows, macOS, an Intel Mac, or a server. The macOS desktop app currently requires Apple silicon, so Intel Mac users should use this CLI and the web app.

## Install

```bash
npm install -g @palimpsest/cli
```

Requires [Node.js 24+](https://nodejs.org) and Git.

To remove Palimpsest later, run `ps uninstall` (whole machine) or `ps deinit` (one project).

## Quick start

```bash
cd your-project
ps init          # scaffold .ps/ and connect supported AI tools
ps start         # serve the editor and open it in your browser
```

- `ps init` — turn a folder into a Palimpsest project and register the MCP server with supported AI tools.
- `ps start` — run the local server and web editor, then open it in your browser.
- `ps open <target>` — open a doc, a folder, or a path to a Markdown file in the editor. It prints the project root it resolved; pass `--project <dir>` anywhere in the command to name one yourself.
- `ok --help` — list every command.

## Desktop app

For the native desktop experience, [download Palimpsest](https://github.com/fractalmandala/palimpsest/download) for macOS, Windows, or Linux.

## Documentation

Full docs, integrations, and configuration: <https://github.com/fractalmandala/palimpsest/docs>.

- [CLI and web app guide](https://github.com/fractalmandala/palimpsest/blob/main/docs/content/reference/cli.mdx)
- [Quickstart](https://github.com/fractalmandala/palimpsest/blob/main/docs/content/get-started/quickstart.mdx)

## License

[GPL-3.0-or-later](https://github.com/fractalmandala/palimpsest/blob/main/LICENSE).
