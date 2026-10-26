// Build the evergreen Play feature graphic from VELDRYN key art and its real wordmark.
const fs = require('node:fs');
const path = require('node:path');
const runtime = process.env.VELDRYN_ART_NODE_MODULES || 'C:/Users/elroy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const {createCanvas, loadImage} = require(path.join(runtime, '@napi-rs/canvas'));
const sharp = require(path.join(runtime, 'sharp'));

const root = path.resolve(__dirname, '../..');
const artPath = path.join(__dirname, 'source/forest-dungeon-key-art.png');
const logoPath = path.join(root, 'apps/mobile/assets/events-startup-v1/branding/veldryn_logo@3x.webp');
const out = path.join(__dirname, 'exports');

async function render(width, height, filename) {
  const art = await loadImage(artPath);
  const logo = await loadImage(logoPath);
  const canvas = createCanvas(width, height);
  const c = canvas.getContext('2d');
  const scale = width / 1024;
  c.scale(scale, scale);

  const cover = Math.max(1024 / art.width, 500 / art.height);
  const sourceWidth = 1024 / cover;
  const sourceHeight = 500 / cover;
  c.drawImage(art, (art.width - sourceWidth) / 2, (art.height - sourceHeight) / 2,
    sourceWidth, sourceHeight, 0, 0, 1024, 500);

  // Keep the wordmark readable without hiding the heroine or her companion.
  const shade = c.createLinearGradient(0, 0, 540, 0);
  shade.addColorStop(0, 'rgba(4, 22, 31, 0.67)');
  shade.addColorStop(0.64, 'rgba(4, 22, 31, 0.31)');
  shade.addColorStop(1, 'rgba(4, 22, 31, 0)');
  c.fillStyle = shade;
  c.fillRect(0, 0, 540, 500);
  c.drawImage(logo, 111, 180, 360, 120);

  fs.mkdirSync(out, {recursive: true});
  const target = path.join(out, filename);
  await sharp(canvas.toBuffer('image/png')).flatten({background: '#0b1721'})
    .removeAlpha().png({compressionLevel: 9}).toFile(target);
  const metadata = await sharp(target).metadata();
  if (metadata.width !== width || metadata.height !== height || metadata.channels !== 3 || metadata.hasAlpha) {
    throw new Error(`Invalid export: ${filename}`);
  }
  console.log(`${filename}: ${metadata.width}x${metadata.height}, 24-bit RGB`);
}

(async () => {
  await render(1024, 500, 'feature-graphic-1024x500.png');
  await render(2048, 1000, 'promotional-banner-2048x1000.png');
})().catch(error => {console.error(error); process.exitCode = 1;});
