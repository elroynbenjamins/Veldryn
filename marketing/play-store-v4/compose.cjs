// Screenshot-led Play feature graphic. Every depicted game element is from VELDRYN.
const fs = require('node:fs');
const path = require('node:path');
const runtime = process.env.VELDRYN_ART_NODE_MODULES || 'C:/Users/elroy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const {createCanvas, loadImage, GlobalFonts} = require(path.join(runtime, '@napi-rs/canvas'));
const sharp = require(path.join(runtime, 'sharp'));

const root = path.resolve(__dirname, '../..');
const forestPath = path.join(root, 'apps/mobile/assets/world/regions-v2/ironwood-forest-pixel-v1.jpg');
const combatPath = path.join(root, 'marketing/play-store-v2/captures/battle.jpg');
const logoPath = path.join(root, 'apps/mobile/assets/events-startup-v1/branding/veldryn_logo@3x.webp');
const out = path.join(__dirname, 'exports');
GlobalFonts.registerFromPath('C:/Windows/Fonts/segoeui.ttf', 'Veldryn Sans');

async function render(width, height, filename) {
  const [forest, combat, logo] = await Promise.all([forestPath, combatPath, logoPath].map(loadImage));
  const canvas = createCanvas(width, height);
  const c = canvas.getContext('2d');
  c.scale(width / 1024, height / 500);

  // The exact Ironwood Forest environment used by the World screen.
  c.drawImage(forest, 0, 7.5, 1280, 625, 0, 0, 1024, 500);
  c.fillStyle = 'rgba(3, 14, 20, .28)';
  c.fillRect(0, 0, 1024, 500);
  const shade = c.createLinearGradient(0, 0, 550, 0);
  shade.addColorStop(0, 'rgba(3, 15, 23, .82)');
  shade.addColorStop(.72, 'rgba(3, 15, 23, .60)');
  shade.addColorStop(1, 'rgba(3, 15, 23, 0)');
  c.fillStyle = shade;
  c.fillRect(0, 0, 550, 500);

  // An unmodified crop of the real Combat Preview component.
  const x = 470, y = 78, w = 518, h = 340, radius = 15;
  c.save();
  c.shadowColor = 'rgba(0, 0, 0, .72)';
  c.shadowBlur = 28;
  c.shadowOffsetY = 11;
  c.fillStyle = '#090d11';
  c.beginPath(); c.roundRect(x, y, w, h, radius); c.fill();
  c.restore();
  c.save();
  c.beginPath(); c.roundRect(x, y, w, h, radius); c.clip();
  c.drawImage(combat, 30, 30, 1020, 670, x, y, w, h);
  c.restore();
  c.strokeStyle = 'rgba(220, 230, 225, .42)';
  c.lineWidth = 1.5;
  c.beginPath(); c.roundRect(x, y, w, h, radius); c.stroke();

  c.drawImage(logo, 72, 171, 355, 118);
  c.fillStyle = '#f3e6cb';
  c.font = '21px "Veldryn Sans"';
  c.textAlign = 'center';
  c.fillText('Your adventure. Your pace.', 249, 325);

  fs.mkdirSync(out, {recursive: true});
  const target = path.join(out, filename);
  await sharp(canvas.toBuffer('image/png')).flatten({background: '#08131c'})
    .removeAlpha().png({compressionLevel: 9}).toFile(target);
  const metadata = await sharp(target).metadata();
  if (metadata.width !== width || metadata.height !== height || metadata.channels !== 3 || metadata.hasAlpha) {
    throw new Error(`Invalid Play export: ${filename}`);
  }
  console.log(`${filename}: ${width}x${height}, 24-bit RGB`);
}

(async () => {
  await render(1024, 500, 'feature-graphic-1024x500.png');
  await render(2048, 1000, 'promotional-banner-2048x1000.png');
})().catch(error => {console.error(error); process.exitCode = 1;});
