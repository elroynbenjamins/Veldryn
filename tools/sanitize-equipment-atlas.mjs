import path from 'node:path';
import process from 'node:process';
import fs from 'node:fs/promises';
import sharp from 'file:///C:/Users/elroy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/dist/index.cjs';

const [file] = process.argv.slice(2);
if (!file) throw new Error('Usage: node tools/sanitize-equipment-atlas.mjs <atlas.webp>');

const atlasPath = path.resolve(file);
const cell = 192;
const columns = 5;
const rows = 2;
const input = await fs.readFile(atlasPath);
const {data, info} = await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject: true});
if (info.width !== cell * columns || info.height !== cell * rows || info.channels !== 4) {
  throw new Error('atlas_requires_960x384_rgba');
}

let removed = 0;
for (let pixel = 0; pixel < info.width * info.height; pixel += 1) {
  if (data[pixel * 4 + 3] < 16) data[pixel * 4 + 3] = 0;
}
for (let row = 0; row < rows; row += 1) {
  for (let column = 0; column < columns; column += 1) {
    const seen = new Uint8Array(cell * cell);
    const components = [];
    const index = (x, y) => y * cell + x;
    const alphaAt = (x, y) => data[((row * cell + y) * info.width + column * cell + x) * 4 + 3];
    for (let y = 0; y < cell; y += 1) {
      for (let x = 0; x < cell; x += 1) {
        const start = index(x, y);
        if (seen[start] || alphaAt(x, y) < 64) continue;
        const pixels = [];
        const stack = [start];
        seen[start] = 1;
        while (stack.length) {
          const current = stack.pop();
          pixels.push(current);
          const cx = current % cell;
          const cy = Math.floor(current / cell);
          for (let oy = -1; oy <= 1; oy += 1) {
            for (let ox = -1; ox <= 1; ox += 1) {
              const nx = cx + ox;
              const ny = cy + oy;
              if (nx < 0 || ny < 0 || nx >= cell || ny >= cell) continue;
              const next = index(nx, ny);
              if (!seen[next] && alphaAt(nx, ny) >= 64) {
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
      for (const pixel of component) {
        const x = pixel % cell;
        const y = Math.floor(pixel / cell);
        const outputIndex = ((row * cell + y) * info.width + column * cell + x) * 4;
        data[outputIndex + 3] = 0;
      }
      removed += component.length;
    }
  }
}

const temporary = `${atlasPath}.tmp.webp`;
await sharp(data, {raw: {width: info.width, height: info.height, channels: info.channels}})
  .webp({quality: 76, alphaQuality: 96, smartSubsample: true})
  .toFile(temporary);
await fs.unlink(atlasPath);
await fs.rename(temporary, atlasPath);
console.log(`SANITIZED: ${path.basename(atlasPath)} removed ${removed} detached pixels`);
