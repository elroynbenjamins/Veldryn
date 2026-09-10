import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'file:///C:/Users/elroy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/dist/index.cjs';

const workspace = 'C:/Users/elroy/OneDrive/Documents/ChatGPT/Veldryn';
const outputDir = path.join(workspace, 'apps/mobile/art-review/event-sets-v1/harvestwake');

const concepts = [
  ['harvest-defender', 'Harvest Defender', 'IRONWARDEN', 'C:/Users/elroy/.codex/generated_images/01a081fc-9992-7b13-8fd8-684ef81b7f44/exec-4b8d2034-630d-400a-8538-4778582bf8a7.png'],
  ['granary-bastion', 'Granary Bastion', 'BASTION', 'C:/Users/elroy/.codex/generated_images/01a081fc-9992-7b13-8fd8-684ef81b7f44/exec-62482238-3e3c-4498-9362-efdc3d7c2784.png'],
  ['autumn-warden', 'Autumn Warden', 'DREADGUARD', 'C:/Users/elroy/.codex/generated_images/01a081fc-9992-7b13-8fd8-684ef81b7f44/exec-97306537-6a6c-4c2d-a8a1-1c99a2e0077a.png'],
  ['hearthkeeper', 'Hearthkeeper', 'DAWNKEEPER', 'C:/Users/elroy/.codex/generated_images/01a081fc-9992-7b13-8fd8-684ef81b7f44/exec-d17eb2d3-b596-41b0-9890-304dd2081e3d.png'],
  ['field-ranger', 'Field Ranger', 'WAYFINDER', 'C:/Users/elroy/.codex/generated_images/01a081fc-9992-7b13-8fd8-684ef81b7f44/exec-27b7ef6d-5640-49db-a169-4b5a96d1fb85.png'],
  ['reapers-guard', "Reaper's Guard", 'RAVAGER', 'C:/Users/elroy/.codex/generated_images/01a081fc-9992-7b13-8fd8-684ef81b7f44/exec-41509bd4-86f6-4525-8ec6-c99f9fe61c5b.png'],
  ['amber-brewer', 'Amber Brewer', 'HEXWEAVER', 'C:/Users/elroy/.codex/generated_images/01a081fc-9992-7b13-8fd8-684ef81b7f44/exec-df238809-b41c-40c2-8fe6-6799516c7200.png'],
  ['harvest-blade', 'Harvest Blade', 'KNIFE_DANCER', 'C:/Users/elroy/.codex/generated_images/01a081fc-9992-7b13-8fd8-684ef81b7f44/exec-cd99c318-04e3-4952-8780-bb49d0584831.png'],
  ['granary-keeper', 'Granary Keeper', 'STONECALLER', 'C:/Users/elroy/.codex/generated_images/01a081fc-9992-7b13-8fd8-684ef81b7f44/exec-8a07d08c-40c9-40e2-b506-de63dfb74f51.png'],
];

await fs.mkdir(outputDir, {recursive: true});

const tileWidth = 720;
const imageHeight = 480;
const labelHeight = 62;
const gap = 18;
const columns = 2;
const rows = Math.ceil(concepts.length / columns);
const composites = [];

for (let index = 0; index < concepts.length; index += 1) {
  const [slug, name, classId, source] = concepts[index];
  const destination = path.join(outputDir, `${slug}-concept-overview.png`);
  await fs.copyFile(source, destination);
  const thumb = await sharp(destination)
    .resize(tileWidth, imageHeight, {fit: 'cover', kernel: sharp.kernel.nearest})
    .png()
    .toBuffer();
  const label = Buffer.from(`<svg width="${tileWidth}" height="${labelHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#17110d"/><text x="22" y="27" fill="#f0d3a0" font-size="22" font-family="Arial" font-weight="700">${name}</text><text x="22" y="50" fill="#bca98d" font-size="16" font-family="Arial">${classId}</text></svg>`);
  const tile = await sharp({
    create: {width: tileWidth, height: imageHeight + labelHeight, channels: 4, background: '#17110d'},
  }).composite([{input: thumb, top: 0, left: 0}, {input: label, top: imageHeight, left: 0}]).png().toBuffer();
  composites.push({input: tile, left: (index % columns) * (tileWidth + gap), top: Math.floor(index / columns) * (imageHeight + labelHeight + gap)});
}

const sheetWidth = columns * tileWidth + (columns - 1) * gap;
const sheetHeight = rows * (imageHeight + labelHeight) + (rows - 1) * gap;
await sharp({create: {width: sheetWidth, height: sheetHeight, channels: 4, background: '#0d0a08'}})
  .composite(composites)
  .png()
  .toFile(path.join(outputDir, 'review-contact-sheet.png'));

console.log(JSON.stringify({outputDir, concepts: concepts.length, contactSheet: path.join(outputDir, 'review-contact-sheet.png')}, null, 2));

const liveOpsOutputDir = path.join(workspace, 'apps/mobile/art-review/event-sets-v1/liveops-catalog');
const liveOpsConcepts = [
  ['echo-surge', 'Echo Surge', 'Veilglass Echo', 'C:/Users/elroy/.codex/generated_images/01a081fc-9992-7b13-8fd8-684ef81b7f44/exec-5963b8cd-6c91-4411-b397-773ba23a5a2e.png'],
  ['gatherers-week', "Gatherer's Week", 'Greenhand Jubilee', 'C:/Users/elroy/.codex/generated_images/01a081fc-9992-7b13-8fd8-684ef81b7f44/exec-17fd2668-095c-42be-8d0d-facd749020c6.png'],
  ['guild-rally', 'Guild Rally', 'Bannerbound Oath', 'C:/Users/elroy/.codex/generated_images/01a081fc-9992-7b13-8fd8-684ef81b7f44/exec-dd05f208-3ab1-4886-a7a2-c601f7bcd8fa.png'],
  ['monster-hunt', 'Monster Hunt', 'Trophyfang Pursuit', 'C:/Users/elroy/.codex/generated_images/01a081fc-9992-7b13-8fd8-684ef81b7f44/exec-c95e7d1c-75ed-4547-b2ca-d06c51a6cf06.png'],
  ['coop-festival', 'Co-op Festival', 'Concord Lantern', 'C:/Users/elroy/.codex/generated_images/01a081fc-9992-7b13-8fd8-684ef81b7f44/exec-395cdb9d-3cab-4a86-a080-3ca3923e895b.png'],
  ['market-fair', 'Market Fair', 'Giltroad Finery', 'C:/Users/elroy/.codex/generated_images/01a081fc-9992-7b13-8fd8-684ef81b7f44/exec-4058e87a-2dab-4517-a11c-6c23df72bef7.png'],
  ['anniversary-of-veldryn', 'Anniversary of Veldryn', 'Firstlight Legacy', 'C:/Users/elroy/.codex/generated_images/01a081fc-9992-7b13-8fd8-684ef81b7f44/exec-c1e91c4f-16b6-47ed-9f9a-3cc039f9ef68.png'],
  ['winters-bell', "Winter's Bell", 'Bellfrost Vigil', 'C:/Users/elroy/.codex/generated_images/01a081fc-9992-7b13-8fd8-684ef81b7f44/exec-9249515a-7b81-447c-a009-b21eaf8d7868.png'],
];

await fs.mkdir(liveOpsOutputDir, {recursive: true});
const liveOpsComposites = [];
for (let index = 0; index < liveOpsConcepts.length; index += 1) {
  const [slug, eventName, setName, source] = liveOpsConcepts[index];
  const destination = path.join(liveOpsOutputDir, `${slug}-concept-overview.png`);
  await fs.copyFile(source, destination);
  const thumb = await sharp(destination).resize(tileWidth, imageHeight, {fit: 'cover', kernel: sharp.kernel.nearest}).png().toBuffer();
  const label = Buffer.from(`<svg width="${tileWidth}" height="${labelHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#10131a"/><text x="22" y="27" fill="#d9e5ef" font-size="22" font-family="Arial" font-weight="700">${eventName}</text><text x="22" y="50" fill="#9facbd" font-size="16" font-family="Arial">${setName}</text></svg>`);
  const tile = await sharp({create: {width: tileWidth, height: imageHeight + labelHeight, channels: 4, background: '#10131a'}})
    .composite([{input: thumb, top: 0, left: 0}, {input: label, top: imageHeight, left: 0}]).png().toBuffer();
  liveOpsComposites.push({input: tile, left: (index % columns) * (tileWidth + gap), top: Math.floor(index / columns) * (imageHeight + labelHeight + gap)});
}
const liveOpsRows = Math.ceil(liveOpsConcepts.length / columns);
const liveOpsSheetHeight = liveOpsRows * (imageHeight + labelHeight) + (liveOpsRows - 1) * gap;
await sharp({create: {width: sheetWidth, height: liveOpsSheetHeight, channels: 4, background: '#090c12'}})
  .composite(liveOpsComposites)
  .png()
  .toFile(path.join(liveOpsOutputDir, 'review-contact-sheet.png'));

console.log(JSON.stringify({outputDir: liveOpsOutputDir, concepts: liveOpsConcepts.length, contactSheet: path.join(liveOpsOutputDir, 'review-contact-sheet.png')}, null, 2));
