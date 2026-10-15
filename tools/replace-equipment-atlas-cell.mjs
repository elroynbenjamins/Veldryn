import path from 'node:path';
import process from 'node:process';
import sharp from 'file:///C:/Users/elroy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/dist/index.cjs';

const [target, source, sourceCellRaw, targetCellRaw, destination] = process.argv.slice(2);
if (!target || !source || sourceCellRaw === undefined || targetCellRaw === undefined || !destination) {
  throw new Error('Usage: node tools/replace-equipment-atlas-cell.mjs <target.webp> <source.webp> <sourceCell> <targetCell> <destination.webp>');
}

const sourceCell = Number(sourceCellRaw);
const targetCell = Number(targetCellRaw);
if (![sourceCell, targetCell].every(Number.isInteger) || sourceCell < 0 || sourceCell > 9 || targetCell < 0 || targetCell > 9) {
  throw new Error('cell indices must be integers from 0 through 9');
}

const cell = 192;
const sourceLeft = (sourceCell % 5) * cell;
const sourceTop = Math.floor(sourceCell / 5) * cell;
const targetLeft = (targetCell % 5) * cell;
const targetTop = Math.floor(targetCell / 5) * cell;
const replacement = await sharp(path.resolve(source))
  .extract({ left: sourceLeft, top: sourceTop, width: cell, height: cell })
  .png()
  .toBuffer();

const targetImage = sharp(path.resolve(target));
const metadata = await targetImage.metadata();
if (metadata.width !== 960 || metadata.height !== 384) throw new Error('target_must_be_960x384');

await targetImage
  .composite([{ input: replacement, left: targetLeft, top: targetTop }])
  .webp({ quality: 76, alphaQuality: 96, smartSubsample: true })
  .toFile(path.resolve(destination));
