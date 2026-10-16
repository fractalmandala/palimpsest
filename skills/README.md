# Palimpsest skills

This directory is the canonical home of the skills Palimpsest ships and curates.

## Layout

- `discovery/`, `project/`, `write-skill/` — the built-in bundles. Each holds a
  `SKILL.md` (bundle skills use `name: palimpsest-discovery`, `palimpsest`, and
  `palimpsest-write-skill` respectively).
- `packs/<id>/` — starter-pack skill content (knowledge-base, codebase-wiki,
  software-lifecycle, entity-vault, plain-notes, worldbuilding,
  writing-pipeline, psf). Pack skill names are short (`note-taking`,
  `codebase-wiki`, …); the `open-knowledge-pack-*` names are the retired
  upstream names and are only kept in the migration map
  (`packages/core/src/constants/skills.ts` → `RENAMED_PACK_SKILLS`).
- `_shared/` — prose includes (`{{> _shared/<name>.md }}`) composed into
  bundles at build time.

## Build pipeline

`SKILL.md` files may contain shared-include placeholders. They are composed by
`packages/server/scripts/build-skill-bundles.ts` (run via the CLI package's
`build:skill-asset` step) into `packages/cli/dist/assets/skills/`, which is
what ships inside the published CLI and the desktop app. Run from source, the
server reads this directory directly.

Related code:

- `packages/server/src/skill-bundles.ts` — bundle ids, names, and paths.
- `packages/server/src/build-skill-zip.ts` — resolves a bundle dir from source
  (`skills/<id>`) or from a built `dist/assets/skills` copy.
- `packages/cli/scripts/build-skill-assets.ts` — the CLI build step that
  composes + copies into `dist/`.
- `packages/core/src/constants/skills.ts` — `RENAMED_PACK_SKILLS` migration
  map and `PACK_SKILL_PREFIX` for retired upstream listings.
