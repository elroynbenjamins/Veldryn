export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(v:boolean,m:string){if(!v)throw new Error(m)}
const read=(p:string)=>fs.readFileSync(p,'utf8');
const bestiary=read('src/screens/BestiaryScreen.tsx');
const mastery=read('src/components/MonsterMasteryPanel.tsx');

ok(bestiary.includes("import {ItemArtwork}"),'Bestiary must import real item artwork');
ok(bestiary.includes("<ItemArtwork itemId={drop.itemId}"),'Bestiary drop previews must render item art');
ok(bestiary.includes("itemDef(drop.itemId)"),'Bestiary must show canonical item names');
ok(bestiary.includes("dropStrip")&&bestiary.includes("dropChip"),'Bestiary drops must use compact visual chips');
ok(bestiary.includes("v33EquipmentMaterialLabel(drop.itemId)"),'Bestiary must identify monster materials that feed Equipment 2.0');

ok(mastery.includes("import {ItemArtwork}"),'Monster Mastery must import real item artwork');
ok(mastery.includes("<ItemArtwork itemId={d.itemId}"),'Known drops must render item art');
ok(mastery.includes("dropRow")&&mastery.includes("dropMeta"),'Mastery drop rows must keep chance/quantity context');
ok(mastery.includes("v33EquipmentMaterialLabel(d.itemId)"),'Mastery drop rows must identify Equipment 2.0 crafting materials');
ok(!mastery.includes("style={s.drop}>{itemDef(d.itemId).name}"),'Mastery must not regress to text-only drop rows');

console.log('PASS: Bestiary and Monster Mastery use unified drop artwork');
