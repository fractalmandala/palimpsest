# Palimpsest brand assets — drop-in folder

Place the Palimpsest logo and brand files here when ready. Suggested files:

- `palimpsest-logo.svg` (primary logo, light-on-transparent)
- `palimpsest-logo-dark.svg` (variant for dark backgrounds)
- `palimpsest-wordmark.svg` / `palimpsest-wordmark-dark.svg`
- `palimpsest-icon.png` (app icon source, 1024×1024)
- `hero.webp` (optional replacement for the README hero image)

Once added, the rebrand pass will point the app at these files:

- `README.md` header/wordmark block (currently upstream `assets/ps-wordmark*.svg`)
- `packages/app` favicons / app icons
- `packages/desktop` Electron `productName`, icons, and installer metadata
- `packages/cli` `--help` / banner text

Upstream brand files (`assets/ps-wordmark.svg`, `assets/ps-wordmark-dark.svg`,
`assets/hero.webp`) are intentionally left untouched until replacements land,
so nothing renders broken in the meantime.
