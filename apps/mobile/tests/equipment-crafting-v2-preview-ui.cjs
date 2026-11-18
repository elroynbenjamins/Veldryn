const fs=require('node:fs');
const assert=require('node:assert/strict');
const path=require('node:path');
const app=path.join(__dirname,'..');
const read=(relative)=>fs.readFileSync(path.join(app,relative),'utf8');
const ui=read('src/components/EquipmentCraftingV2Preview.tsx');
const flags=read('src/core/release-flags.ts');
const economy=read('src/core/equipment-crafting-v2-economy.ts');
const source=read('src/core/equipment-crafting-v2-screen.ts');
assert.match(ui,/INTERNAL DESIGN PREVIEW/,'Internal-only UX must be explicitly labeled');
assert.match(ui,/minHeight:44/,'Variant and tab controls need accessible tap targets');
assert.match(ui,/accessibilityRole="tab"/,'Potential results and materials need semantic tabs');
assert.match(ui,/CRAFT TIME/,'Crafting details must show how long it will take');
assert.match(ui,/ASSEMBLY GOLD/,'Gold assembly fee must be visible');
assert.match(ui,/BASE XP/,'Base profession XP must be visible');
assert.match(ui,/Owned \/ Required/,'Material quantities need a clear format');
assert.match(ui,/Rarity/i,'Crafted rarity must remain discoverable');
assert.match(ui,/not released/,'Hidden preview must explain no live actions are available');
assert.doesNotMatch(ui,/startEquipmentCraft|claimEquipmentCraft|executeGameCommand|onCraft\s*:/,
 'Read-only preview must not gain write commands');
assert.match(flags,/EQUIPMENT_CRAFTING_V2_RELEASED=false/,'Joint V2 release flag must remain disabled');
assert.match(source,/const canCraftNow=EQUIPMENT_CRAFTING_V2_RELEASED&&/,
 'The craft action must never become active before the shared flag');
assert.match(economy,/marketReleased=false/,'Market sourcing must fail closed by default');
console.log('PASS: hidden crafting 2.0 native UI preview retains accessible controls, costing detail and no public writes');
