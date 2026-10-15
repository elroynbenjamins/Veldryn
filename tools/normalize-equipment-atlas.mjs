import path from 'node:path';
import process from 'node:process';
import sharp from 'file:///C:/Users/elroy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/dist/index.cjs';

const [source, destination] = process.argv.slice(2);
if (!source || !destination) {
  throw new Error('Usage: node tools/normalize-equipment-atlas.mjs <source.png> <destination.webp>');
}

const columns = 5;
const rows = 2;
const cell = 192;
const edgePadding = 23;
const contentCell = cell - edgePadding * 2;
const metadata = await sharp(path.resolve(source)).metadata();
if (!metadata.width || !metadata.height) throw new Error('source_has_no_dimensions');
const layers = [];

// Image generation occasionally leaves tiny, disconnected fragments beside an
// otherwise complete icon. Keep the meaningful connected components (such as
// both boots or both gloves) and remove only the small isolated specks before
// fitting a source cell into the runtime atlas.
const removeDisconnectedSpecks = async buffer => {
  const image = sharp(buffer).ensureAlpha();
  const {data, info} = await image.raw().toBuffer({resolveWithObject: true});
  const {width, height, channels} = info;
  const seen = new Uint8Array(width * height);
  const components = [];
  const at = (x, y) => y * width + x;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const start = at(x, y);
      if (seen[start] || data[start * channels + 3] < 24) continue;
      const pixels = [];
      const stack = [start];
      seen[start] = 1;
      while (stack.length) {
        const current = stack.pop();
        pixels.push(current);
        const cx = current % width;
        const cy = Math.floor(current / width);
        for (let oy = -1; oy <= 1; oy += 1) {
          for (let ox = -1; ox <= 1; ox += 1) {
            const nx = cx + ox;
            const ny = cy + oy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
            const next = at(nx, ny);
            if (!seen[next] && data[next * channels + 3] >= 24) {
              seen[next] = 1;
              stack.push(next);
            }
          }
        }
      }
      components.push(pixels);
    }
  }

  const largest = Math.max(0, ...components.map(component => component.length));
  const minimum = Math.max(24, Math.floor(largest * 0.04));
  for (const component of components) {
    if (component.length >= minimum) continue;
    for (const pixel of component) data[pixel * channels + 3] = 0;
  }
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    if (data[pixel * channels + 3] < 16) data[pixel * channels + 3] = 0;
  }
  return sharp(data, {raw: {width, height, channels}}).png().toBuffer();
};

// Retain the original cell composition, then fit each source cell into the
// fixed safe area of its corresponding runtime cell.
for (let row = 0; row < rows; row += 1) {
  for (let column = 0; column < columns; column += 1) {
    const left = Math.round((column * metadata.width) / columns);
    const top = Math.round((row * metadata.height) / rows);
    const right = Math.round(((column + 1) * metadata.width) / columns);
    const bottom = Math.round(((row + 1) * metadata.height) / rows);
    const sourceInset = Math.max(1, Math.floor(Math.min(right - left, bottom - top) * 0.06));
    const extracted = await sharp(path.resolve(source))
      .ensureAlpha()
      // Generated cells are specified with generous padding. Reading only the
      // inner area prevents a neighbouring cell's overhang from leaking into
      // this icon when the original sheet ignored its gutters.
      .extract({
        left: left + sourceInset,
        top: top + sourceInset,
        width: right - left - sourceInset * 2,
        height: bottom - top - sourceInset * 2,
      })
      .png()
      .toBuffer();
    const icon = await sharp(await removeDisconnectedSpecks(extracted))
      .resize(contentCell, contentCell, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
      .png()
      .toBuffer();
    layers.push({ input: icon, left: column * cell + edgePadding, top: row * cell + edgePadding });
  }
}

await sharp({
  create: { width: cell * columns, height: cell * rows, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
})
  .composite(layers)
  .webp({ quality: 76, alphaQuality: 96, smartSubsample: true })
  .toFile(path.resolve(destination));
