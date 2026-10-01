// Deterministic format/size exports from the ImageGen emblem; no artwork generation.
// Run from any directory: node tools/export-mobile-app-icons.cjs
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const deps = path.join(root, 'apps/mobile/node_modules/.pnpm');
function dependency(name) {
  const entry = fs.readdirSync(deps).find(p => p.startsWith(`${name}@`));
  if (!entry) throw new Error(`Install mobile pnpm dependencies first: missing ${name}`);
  return require(path.join(deps, entry, 'node_modules', name));
}
const Jimp = dependency('jimp-compact');
const { PNG } = dependency('pngjs');
const dir = path.join(root, 'apps/mobile/assets/app-icon-v1');
const navy = 0x101c2cff;
function save(image, name, opaque = false) {
  const png = PNG.sync.write({ ...image.bitmap, gamma: 0.45455 }, {
    colorType: opaque ? 2 : 6, inputColorType: 6, bitDepth: 8,
  });
  fs.writeFileSync(path.join(dir, name), png);
}
function radius(image) {
  let max = 0;
  image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, i) {
    if (this.bitmap.data[i + 3]) max = Math.max(max,
      Math.hypot(x + 0.5 - image.bitmap.width / 2, y + 0.5 - image.bitmap.height / 2));
  });
  return max;
}
function centered(source, scale, background) {
  const emblem = source.clone().resize(Math.round(source.bitmap.width * scale),
    Math.round(source.bitmap.height * scale), Jimp.RESIZE_BICUBIC);
  return new Jimp(1024, 1024, background).composite(emblem,
    Math.round((1024 - emblem.bitmap.width) / 2), Math.round((1024 - emblem.bitmap.height) / 2));
}
function masked(image, size, power) {
  const out = image.clone().resize(size, size, Jimp.RESIZE_BICUBIC);
  out.scan(0, 0, size, size, function(x, y, i) {
    if (Math.pow(Math.abs((x + 0.5) / size * 2 - 1), power) +
        Math.pow(Math.abs((y + 0.5) / size * 2 - 1), power) > 1) this.bitmap.data[i + 3] = 0;
  });
  return out;
}
async function main() {
  const source = await Jimp.read(path.join(dir, 'emblem-source.png'));
  if (!source.hasAlpha()) throw new Error('Source must have real transparency.');
  let left = source.bitmap.width, top = source.bitmap.height, right = 0, bottom = 0;
  source.scan(0, 0, source.bitmap.width, source.bitmap.height, function(x, y, i) {
    if (this.bitmap.data[i + 3]) {
      left = Math.min(left, x); top = Math.min(top, y);
      right = Math.max(right, x); bottom = Math.max(bottom, y);
    }
  });
  const emblem = source.clone().crop(left, top, right - left + 1, bottom - top + 1);
  const icon = centered(emblem, 780 / Math.max(emblem.bitmap.width, emblem.bitmap.height), navy);
  save(icon, 'icon-1024.png', true);
  save(icon.clone().resize(512, 512, Jimp.RESIZE_BICUBIC), 'google-play-512.png');
  // 108dp adaptive canvas, central 66dp safe circle; allow resampling headroom.
  const foreground = centered(emblem, 300 / radius(emblem), 0x00000000);
  const safeRadius = 1024 * 33 / 108;
  if (radius(foreground) > safeRadius) throw new Error('Adaptive artwork exceeds safe circle.');
  save(foreground, 'android-foreground-1024.png');
  const mono = foreground.clone();
  mono.scan(0, 0, 1024, 1024, function(x, y, i) {
    this.bitmap.data[i] = this.bitmap.data[i + 1] = this.bitmap.data[i + 2] = 255;
  });
  save(mono, 'android-monochrome-1024.png');
  // Simulate the 72dp visible viewport inside Android's 108dp adaptive canvas.
  const viewport = image => image.clone().crop(171, 171, 682, 682);
  const android = viewport(new Jimp(1024, 1024, navy).composite(foreground, 0, 0));
  const tint = mono.clone();
  tint.scan(0, 0, 1024, 1024, function(x, y, i) {
    this.bitmap.data[i] = 30; this.bitmap.data[i + 1] = 66; this.bitmap.data[i + 2] = 91;
  });
  const themed = viewport(new Jimp(1024, 1024, 0xa9d8eaff).composite(tint, 0, 0));
  const sheet = new Jimp(960, 300, 0x243448ff);
  const variants = [[icon, 5, 'iPhone'], [android, 2, 'Android circle'],
    [android, 5, 'Android squircle'], [themed, 2, 'Android themed']];
  variants.forEach(([image, power, label], index) => {
    const x = index * 240;
    sheet.composite(masked(image, 160, power), x + 40, 20);
    sheet.composite(masked(image, 60, power), x + 52, 214);
    sheet.composite(masked(image, 48, power), x + 142, 220);
  });
  save(sheet, 'launcher-preview.png');
  const report = { adaptiveArtworkRadius: +radius(foreground).toFixed(2), safeRadius: +safeRadius.toFixed(2), files: [] };
  for (const name of ['icon-1024.png', 'google-play-512.png', 'android-foreground-1024.png', 'android-monochrome-1024.png']) {
    const bytes = fs.readFileSync(path.join(dir, name));
    const png = PNG.sync.read(bytes);
    const expectedSize = name === 'google-play-512.png' ? 512 : 1024;
    if (png.width !== expectedSize || png.height !== expectedSize) throw new Error(`Wrong dimensions: ${name}`);
    if (name === 'icon-1024.png' && bytes[25] !== 2) throw new Error('iOS icon must be RGB without alpha.');
    if (name === 'google-play-512.png' && (bytes[25] !== 6 || bytes.length > 1024 * 1024)) throw new Error('Invalid Play Store format/size.');
    report.files.push({ name, width: png.width, height: png.height, pngColorType: bytes[25], bytes: bytes.length });
  }
  console.log(JSON.stringify(report, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
