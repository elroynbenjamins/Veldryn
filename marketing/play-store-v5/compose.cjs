// VELDRYN feature graphic: show idle progression, current profile portraits, and co-op.
const fs = require('node:fs');
const path = require('node:path');
const runtime = process.env.VELDRYN_ART_NODE_MODULES || 'C:/Users/elroy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const {createCanvas, loadImage, GlobalFonts} = require(path.join(runtime, '@napi-rs/canvas'));
const sharp = require(path.join(runtime, 'sharp'));

const root = path.resolve(__dirname, '../..');
const asset = relative => path.join(root, 'apps/mobile/assets', relative);
const out = path.join(__dirname, 'exports');
GlobalFonts.registerFromPath('C:/Windows/Fonts/segoeuib.ttf', 'Veldryn Bold');
GlobalFonts.registerFromPath('C:/Windows/Fonts/segoeui.ttf', 'Veldryn Sans');

function rounded(c, x, y, w, h, r, fill, stroke) {
  c.beginPath(); c.roundRect(x, y, w, h, r);
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = 1.4; c.stroke(); }
}
function label(c, value, x, y, size, color, bold = false) {
  c.font = `${size}px "${bold ? 'Veldryn Bold' : 'Veldryn Sans'}"`;
  c.textAlign = 'left'; c.fillStyle = color; c.fillText(value, x, y);
}
function check(c, x, y) {
  c.strokeStyle = '#a6d9ba'; c.lineWidth = 2.4; c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(x, y + 6); c.lineTo(x + 5, y + 11); c.lineTo(x + 13, y); c.stroke();
}

async function render(width, height, filename) {
  const [forest, logo, wolf, ranger, priestess, spellcaster, shield, support, damage] = await Promise.all([
    asset('world/regions-v2/ironwood-forest-pixel-v1.jpg'),
    asset('events-startup-v1/branding/veldryn_logo@3x.webp'),
    asset('monsters/ironwood_wolf.webp'),
    asset('profile-icons-v1/hooded-ranger.webp'),
    asset('profile-icons-v1/dawn-priestess.webp'),
    asset('profile-icons-v1/masked-spellcaster.webp'),
    asset('classes/ironwarden.png'),
    asset('classes/dawnkeeper.png'),
    asset('classes/wayfinder.png'),
  ].map(loadImage));
  const canvas = createCanvas(width, height), c = canvas.getContext('2d');
  c.scale(width / 1024, height / 500);
  c.drawImage(forest, 0, 7.5, 1280, 625, 0, 0, 1024, 500);
  c.fillStyle = 'rgba(3, 13, 22, .53)'; c.fillRect(0, 0, 1024, 500);
  const left = c.createLinearGradient(0, 0, 445, 0);
  left.addColorStop(0, 'rgba(3, 12, 20, .75)'); left.addColorStop(1, 'rgba(3, 12, 20, 0)');
  c.fillStyle = left; c.fillRect(0, 0, 445, 500);
  const right = c.createLinearGradient(740, 0, 1024, 0);
  right.addColorStop(0, 'rgba(3, 12, 20, 0)'); right.addColorStop(1, 'rgba(3, 12, 20, .5)');
  c.fillStyle = right; c.fillRect(740, 0, 284, 500);

  // Current selectable profile portraits. They do not depict equipped armor.
  const portraits = [[ranger, 354, 121, '#92b7a1'], [priestess, 474, 101, '#d2b66d'], [spellcaster, 594, 121, '#a992ce']];
  label(c, 'PLAY WITH OTHERS', 409, 86, 15, '#f2d093', true);
  portraits.forEach(([portrait, x, y, border]) => {
    c.save(); c.shadowColor = '#000b'; c.shadowBlur = 20; c.shadowOffsetY = 9;
    rounded(c, x, y, 145, 193, 16, 'rgba(7, 14, 21, .95)', border);
    c.restore();
    c.save(); c.beginPath(); c.roundRect(x + 7, y + 7, 131, 178, 11); c.clip();
    c.drawImage(portrait, x + 2, y + 6, 141, 162);
    c.restore();
  });

  c.drawImage(logo, 44, 36, 294, 98);
  label(c, 'IDLE MMO RPG', 56, 175, 31, '#f2d093', true);
  label(c, 'Grow at your pace.', 56, 209, 20, '#f4eee3');
  label(c, 'Adventure together.', 56, 236, 20, '#f4eee3');

  // A compact representation of the real active hunt and reward loop.
  rounded(c, 39, 278, 301, 171, 16, 'rgba(8, 15, 22, .94)', 'rgba(188, 208, 204, .44)');
  label(c, 'HUNTING  ·  ACTIVE', 58, 309, 14, '#a9d9bd', true);
  c.drawImage(wolf, 58, 324, 69, 69);
  label(c, 'Ironwood Wolf', 137, 350, 20, '#f4eee3', true);
  label(c, 'Next encounter · 12s', 137, 374, 14, '#aebfc5');
  rounded(c, 58, 402, 263, 8, 4, '#111d23');
  rounded(c, 58, 402, 179, 8, 4, '#9bd5ae');
  label(c, 'Progress while you are away', 58, 434, 14, '#b8c9c7');

  // A compact representation of the game's four-role ready check.
  rounded(c, 767, 281, 231, 169, 16, 'rgba(8, 15, 22, .95)', 'rgba(188, 208, 204, .44)');
  label(c, 'CO-OP DUNGEON', 785, 311, 15, '#a8dbf0', true);
  label(c, 'Party ready  ·  3/4', 785, 339, 18, '#f4eee3', true);
  const row = [[shield, 'TANK', '#78c8f2'], [support, 'SUPPORT', '#ebcf80'], [damage, 'DAMAGE', '#9ed2aa']];
  row.forEach(([icon, name, color], i) => {
    const y = 350 + i * 30;
    c.drawImage(icon, 786, y, 24, 24);
    label(c, name, 817, y + 18, 13, color, true);
    check(c, 966, y + 5);
  });

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
