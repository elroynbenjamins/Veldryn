import process from 'node:process';
import sharp from 'file:///C:/Users/elroy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/dist/index.cjs';

const [output, ...entries] = process.argv.slice(2);
if (!output || !entries.length) throw new Error('Usage: node tools/build-equipment-tier-comparison.mjs <output.png> <label|path>...');

const width = 960;
const labelHeight = 48;
const margin = 18;
const rows = [];
for (const entry of entries) {
  const [label, input] = entry.split('|');
  if (!label || !input) throw new Error(`invalid_entry:${entry}`);
  const text = `<svg width="${width}" height="${labelHeight}"><rect width="100%" height="100%" fill="#f4f1e9"/><text x="18" y="31" font-family="Arial" font-size="24" font-weight="700" fill="#24211e">${label}</text></svg>`;
  rows.push({input:await sharp(input).flatten({background:'#f4f1e9'}).png().toBuffer(), label:Buffer.from(text)});
}
const height = rows.length * (384 + labelHeight) + margin * 2;
const composites = [];
for (let index = 0; index < rows.length; index++) {
  const top = margin + index * (384 + labelHeight);
  composites.push({input:rows[index].label, left:0, top});
  composites.push({input:rows[index].input, left:0, top:top + labelHeight});
}
await sharp({create:{width, height, channels:3, background:'#f4f1e9'}}).composite(composites).png().toFile(output);
