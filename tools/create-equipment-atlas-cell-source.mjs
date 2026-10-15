import process from 'node:process';
import sharp from 'file:///C:/Users/elroy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/dist/index.cjs';

const [input, cellRaw, output] = process.argv.slice(2);
if (!input || cellRaw === undefined || !output) {
  throw new Error('Usage: node tools/create-equipment-atlas-cell-source.mjs <input.png> <cell:0-9> <output.webp>');
}

const cell = Number(cellRaw);
if (!Number.isInteger(cell) || cell < 0 || cell > 9) throw new Error('cell_must_be_0_to_9');

const source = sharp(input).ensureAlpha();
const {data, info} = await source.raw().toBuffer({resolveWithObject:true});
let left = info.width, right = -1, top = info.height, bottom = -1;
for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
  if (data[(y * info.width + x) * info.channels + 3] > 16) {
    left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
  }
}
if (right < left || bottom < top) throw new Error('input_has_no_visible_alpha');

const object = await sharp(input)
  .extract({left, top, width:right - left + 1, height:bottom - top + 1})
  .resize(146, 146, {fit:'contain', withoutEnlargement:false})
  .png()
  .toBuffer();
const leftOffset = (cell % 5) * 192 + 23;
const topOffset = Math.floor(cell / 5) * 192 + 23;
await sharp({create:{width:960, height:384, channels:4, background:{r:0,g:0,b:0,alpha:0}}})
  .composite([{input:object, left:leftOffset, top:topOffset}])
  .webp({quality:76, alphaQuality:96, smartSubsample:true})
  .toFile(output);
