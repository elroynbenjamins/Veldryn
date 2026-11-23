#!/usr/bin/env node
/** Review-only economy estimate: never uses gameplay state or writes live data. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=name=>JSON.parse(fs.readFileSync(path.join(root,'docs/equipment-2-0',name),'utf8'));
const config=read('t1-t4-economy-review-v1.json');
const draft=read('t1-t4-economy-generated-recipes-v1.json');
if(config.status!=='REVIEW_ONLY_NO_RUNTIME'||draft.status!=='REVIEW_ONLY_DO_NOT_IMPORT_TO_RUNTIME')throw Error('Only review artifacts supported');
const foundation=draft.recipes.filter(r=>r.route==='foundation');
const allSlots=['helmet','chest','gloves','legs','boots','cape','amulet','ring','weapon','offhand'];
function literalArray(file,name){
  const source=fs.readFileSync(path.join(root,file),'utf8');
  const start=source.indexOf(name);
  const open=source.indexOf('=[',start);
  const close=source.indexOf('];',open);
  if(start<0||open<0||close<0)throw Error('Missing hidden catalogue '+name);
  return JSON.parse(source.slice(open+1,close+1));
}
const files=[
 ['backend/src/server/equipment/equipment-crafting-v2-manifest.ts','V2_SERVER_CORE_PIECES'],
 ['backend/src/server/equipment/equipment-crafting-v2-expansion-manifest.ts','V2_SERVER_EXPANSION_PIECES'],
 ['backend/src/server/equipment/equipment-crafting-v2-armament-manifest.ts','V2_SERVER_ARMAMENT_PIECES']
];
const byId=new Map(files.flatMap(([file,name])=>literalArray(file,name)).map(piece=>[piece.id,piece]));
if(byId.size!==config.expected.ordinaryPieces)throw Error('Catalogue count drift');
const projected=(common,rare,speed,dropCommon,dropRare)=>({
  sharedEligibleHours:+(Math.max(common/dropCommon,rare/dropRare)/speed).toFixed(2),
  separatePoolsHours:+((common/dropCommon+rare/dropRare)/speed).toFixed(2)
});
const tierStats=config.tierSpecs.map(t=>{
  const recipes=foundation.filter(r=>r.tier===t.tier);
  const qty=(r,id)=>r.inputs.find(i=>i.itemId===id)?.quantity||0;
  const chest=recipes.find(r=>byId.get(r.pieceId)?.slot==='chest'&&byId.get(r.pieceId)?.role==='tank');
  if(!chest)throw Error('Missing tank chest tier '+t.tier);
  // A valid illustrative tank loadout; compact sets themselves remain 2-4 pieces.
  const gear=allSlots.map(slot=>{
    const id=slot==='weapon'?'EQ2_WEAPON_T'+t.tier+'_IRONWARDEN':slot==='offhand'?'EQ2_OFFHAND_T'+t.tier+'_IRONWARDEN':null;
    const chosen=recipes.find(r=>id?r.pieceId===id:(byId.get(r.pieceId)?.slot===slot&&byId.get(r.pieceId)?.role==='tank'));
    if(!chosen)throw Error('Tank loadout coverage missing at '+t.tier+' '+slot);
    return chosen;
  });
  const totals=rs=>rs.reduce((a,r)=>({common:a.common+qty(r,t.items.common),rare:a.rare+qty(r,t.items.rare)}),{common:0,rare:0});
  const c=totals([chest]),full=totals(gear);
  return {tier:t.tier,chest:{recipe:chest.id,common:c.common,rare:c.rare,at300:projected(c.common,c.rare,300,t.drops.commonKill,t.drops.scarceKill),at900:projected(c.common,c.rare,900,t.drops.commonKill,t.drops.scarceKill)},
    illustrativeTenItems:{common:full.common,rare:full.rare,at300:projected(full.common,full.rare,300,t.drops.commonKill,t.drops.scarceKill),at900:projected(full.common,full.rare,900,t.drops.commonKill,t.drops.scarceKill)},
    fullTierCatalog:{items:recipes.length,common:totals(recipes).common,rare:totals(recipes).rare}
  };
});
console.log(JSON.stringify({disclaimer:'Expected kills / hour are illustrative, not actual Veldryn telemetry. All kills must be eligible; drops may overlap. All equipment XP/Gold/Forge times remain unchanged.',tiers:tierStats},null,2));
