import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { zipSync } from 'fflate';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const repoRoot = path.resolve(root, '..');
const outDir = path.join(root, 'public', 'brand');

const SOURCE_FILES = [
  'assets/palimpsest-wordmark.svg',
  'assets/palimpsest-wordmark-dark.svg',
  'assets/palimpsest-logo.svg',
  'assets/palimpsest-logo-dark.svg',
  'assets/palimpsest-icon.png',
  'assets/1024x1024.png',
  'assets/512x512.png',
  'assets/256x256.png',
  'assets/128x128.png',
];

async function main() {
  mkdirSync(outDir, { recursive: true });
  const zipEntries: Record<string, Uint8Array> = {};

  for (const rel of SOURCE_FILES) {
    const src = path.join(repoRoot, rel);
    const dest = path.join(outDir, path.basename(rel));
    copyFileSync(src, dest);
    zipEntries[path.basename(rel)] = new Uint8Array(readFileSync(dest));
    console.log(`wrote ${path.basename(rel)}`);
  }

  const png = await sharp(path.join(repoRoot, 'assets/palimpsest-icon.png'), { density: 400 })
    .resize({ width: 2400 })
    .png()
    .toBuffer();
  writeFileSync(path.join(outDir, 'palimpsest-icon-2400.png'), png);
  zipEntries['palimpsest-icon-2400.png'] = new Uint8Array(png);
  console.log(`wrote palimpsest-icon-2400.png (${png.length} bytes png)`);

  const zip = zipSync(zipEntries, { level: 6 });
  writeFileSync(path.join(outDir, 'palimpsest-brand.zip'), zip);
  console.log(`wrote palimpsest-brand.zip (${zip.length} bytes)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
