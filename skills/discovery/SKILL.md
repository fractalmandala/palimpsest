---
name: palimpsest-discovery
description: "Read when the user asks what Palimpsest is, wants to install it on a repository, wants to open or preview a single markdown file that is not part of a Palimpsest project, wants to share a Palimpsest project with collaborators, asks whether Palimpsest supports a particular capability, or asks how `ps init` / `ps cowork` / Palimpsest Desktop set up a project. Do NOT load to perform Palimpsest reads/writes — the runtime guidance for editing markdown inside an initialized OK project ships as a separate project-local skill installed into each detected agent's skills dir (for example `.claude/skills/palimpsest/`) whenever `ps init` runs."
compatibility: "Any agent host — no MCP server required. Pure discovery + install guidance."
metadata:
  author: "Fractal Mandala"
  repository: "https://github.com/fractalmandala/palimpsest-skills"
---
# Palimpsest — what it is and how to install it

Palimpsest (OK) is a markdown-CRDT collaboration platform. It turns a
directory of `.md` / `.mdx` files into a live, multi-writer knowledge base:
agents and humans edit the same documents in real time, every change is
attributed, and a browser preview renders edits as they land.

This skill covers **discovery, install, and opening Palimpsest files** —
including single files that are not part of a project (see *Opening a file
outside a project* below). It does **not** carry the in-project read/write
runtime contract (the STOP rules for native file tools, the grounding and
linking rules, the MCP routing table) — that ships separately as the
project-local skill installed by `ps init` (see *Working inside a project*
below).

> **CLI name.** Commands below use Stable's `ps` (`palimpsest`). Palimpsest
> Beta's terminal commands are `ps-beta` (`palimpsest-beta`), with `~/.ps-beta/`
> in place of `~/.ps/`.

## Install Palimpsest on a repository

Run `ps init` from the repository root:

```bash
npx @palimpsest/cli init
# or, after a global install:
npm install -g @palimpsest/cli
ps init
```

`ps init` is the one setup verb. It:

- scaffolds a `.ps/` directory (project config — `content.dir` defaults to `.`);
- wires the Palimpsest MCP server into the coding agents it detects on this
  machine — skip with `--no-mcp`;
- installs the **project-local runtime skill** into each detected agent's
  skills dir (`<agent-dir>/skills/palimpsest/`) so agents working in this
  repo get the full read/write contract. OK only writes into agent
  directories that already exist — it never creates one, so nothing appears
  for agents you don't use, and `ps init` says so when it finds none;
- ensures the project has a `.git/`.

Re-run `ps init` any time to refresh wiring and skills to the installed CLI
version.

## Share a Palimpsest project with collaborators

An OK project travels with its repository. To share one:

1. Commit the `.ps/` directory and whichever project-local
   `<agent-dir>/skills/palimpsest/` directories `ps init` created, along
   with your `.md` content.
2. Collaborators clone the repo and run `ps init` once — that registers the
   MCP server on their machine and refreshes the project skill.
3. Start the editor + preview with `ps start` (or open the project in OK
   Desktop).

Collaboration is real-time once two writers have the project open against the
same content directory.

## `ps cowork` — Claude Chat & Cowork

`ps init`'s editor wiring does not reach Claude Chat or Cowork — those read a
separate Skills list inside the Claude Desktop App. Run `ps cowork` to
build `palimpsest.skill` and open Claude Desktop so the user can upload it
(Customize → Skills → + → Create skill → Upload skill).

## Palimpsest Desktop

Palimpsest Desktop is the standalone macOS app (`@palimpsest/desktop`). It
bundles its own CLI, opens a project as an editor + preview window, and keeps
the project's MCP wiring and skills current on every launch. Download DMGs
from the releases page.

## Opening a file outside a project

Palimpsest can open a single markdown file that is **not** part of an OK
project — a loose `.md` / `.mdx`, **or a file that lives inside a regular
repo/folder which was never `ps init`'d**. It opens in a throwaway session (a
temp project in the OS temp dir — your repo is never touched, no `.ps/` is
written into it) with the same live preview you get inside a project.

**Never run `ps init` just to view or open a file.** `ps init` turns a repo
into a shared Palimpsest project; it is not a prerequisite for opening one
file. Opening a file needs no project, no `.ps/`, and no server already
running — each path below boots the session itself.

When asked to open or preview such a file, **decide by the viewing surface you
actually have** — check the tool, not the host name. Only open a browser when
you genuinely have one; never pop a browser tab on a host that has none.

- **You have an in-app / built-in browser** (Claude Code Desktop's Browser pane, Cursor, Codex, and similar) — this
  is the default: call the **`preview_url` MCP tool** with `file` set to the
  absolute path (it finds, or boots on demand, the session and returns a full
  `url`), then **immediately open that `url` in your in-app browser**. "Open it"
  means navigate your browser — don't just print the URL and stop. This is also
  the only way to view it in a browser when the Palimpsest Desktop app is installed
  (`ps open` prefers the Desktop app). Get the URL from `preview_url` only —
  never hunt for it via `ps servers` / `ps status` / `ps start` or a guessed
  port.
- **No in-app browser** (a pure-stdio CLI) — run
  `ps open /abs/path/to/file.md`: it opens the Desktop app when installed, else a
  browser, and boots the session itself. Don't force a browser tab the user
  didn't ask for; `ps open` is the right default here. If `ps` isn't on PATH,
  `npx @palimpsest/cli open /abs/path/to/file.md` does the same.

If the OK MCP server isn't wired into this host there is no `preview_url` to
call — use the `ps open` path above. Don't reconstruct what `preview_url` does
by hand (spawning `ps mcp` yourself, scraping ports from `ps servers`).

Give an absolute path. `ps open` prints the absolute project root it resolved
for that path, and names the enclosing project too when the resolved root sits
inside another one. Read that line rather than assuming which project you got.

To name the project yourself, pass `--project <dir>`. It is honored wherever it
appears: `--project <dir>` or `--project=<dir>`, before or after the path, with
or without the `.md` extension. If it cannot be honored the command exits
non-zero and says why, so you never need a second command to find out where it
landed, and never need to stop a server to correct it.

Re-opening the same file lands on the same session. Never construct or guess the
URL — use the one `preview_url` returns.

## What else OK does

This skill does not enumerate OK's capabilities, and they change between releases. When asked whether OK supports something, read rather than guess:

- **Docs** — <https://github.com/fractalmandala/palimpsest/docs>
- **Source** — <https://github.com/fractalmandala/palimpsest>

## Working inside a project — use the project-local skill, not this one

Do **not** use this skill to perform Palimpsest reads or writes. The
runtime contract — STOP rules for native file tools on in-scope markdown, the
preview-attach handshake, grounding and linking rules, the MCP tool routing
table — lives in a **separate project-local skill** installed into each detected
agent's skills dir (`<agent-dir>/skills/palimpsest/SKILL.md`) whenever
`ps init` runs.

If the user is editing markdown inside a project that has a `.ps/` directory
and this discovery skill is the only Palimpsest skill loaded, the
project-local skill is missing (the repo was never `ps init`'d, or the skill
directory was not committed). Advise the user to run `ps init` to install it.

## Learn more

- Run `ok --help` for the full command list.
