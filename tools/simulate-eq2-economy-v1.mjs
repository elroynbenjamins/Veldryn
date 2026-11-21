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
const sources=[
 ['backend/src/server/equipment/equipment-crafting-v2-manifest.ts',/'"id":"(EQ2_[^"]+)"/g]
]; // Item metadata is inferred by canonical IDs only for 10-slot illustration.
const projected=(common,rare,speed,dropCommon,dropRare)=>({
  sharedEligibleHours:+(Math.max(common/dropCommon,rare/dropRare)/speed).toFixed(2),
  separatePoolsHours:+((common/dropCommon+rare/dropRare)/speed).toFixed(2)
});
const tierStats=config.tierSpecs.map(t=>{
  const recipes=foundation.filter(r=>r.tier===t.tier);
  const qty=(r,id)=>r.inputs.find(i=>i.itemId===id)?.quantity||0;
  const chest=recipes.find(r=>r.pieceId.includes('GUARD_CHEST')||r.pieceId.includes('SENTINEL_CHEST')||r.pieceId.includes('BREAKSTEEL_CHEST')||r.pieceId.includes('BULWARK_CHEST'));
  if(!chest)throw Error('Missing chest tier '+t.tier);
  // Illustrative build uses role-neutral slot costs, not a claim of valid 10-piece set bonuses.
  const gear=[];
  for(const slot of allSlots){
    const isWeapon=slot==='weapon',isOffhand=slot==='offhand';
    const options=recipes.filter(r=>isWeapon?r.pieceId.startsWith('EQ2_WEAPON_T'+t.tier+'_IRONWARDEN'):isOffhand?r.pieceId.startsWith('EQ2_OFFHAND_T'+t.tier+'_IRONWARDEN'):true);
    const chosen=(isWeapon||isOffhand)?options[0]:options.find(r=>{
      // Uses canonical recipe IDs as reference; no new game item is constructed.
      const token=r.pieceId;
      const containsSlot=(slot==='chest'?/CHEST|VEST|ROBES|CARAPACE/.test(token):slot==='helmet'?/HELMET|HELM|HOOD|COWL|IRONCAP/.test(token):slot==='gloves'?/GLOVES|GRIPS|WRAPS|GAUNTLETS/.test(token):slot==='legs'?/LEGS|GREAVES|TROUSERS|LEGGINGS|LEGWRAPS/.test(token):slot==='boots'?/BOOTS/.test(token):slot==='cape'?/CAPE|MANTLE|CLOAK/.test(token):slot==='amulet'?/AMULET|PENDANT|CHARM|TALISMAN/.test(token):/RING|SIGNET|BAND/.test(token));
      return containsSlot;
    });
    if(!chosen)throw Error('Illustrative coverage missing at '+t.tier+' '+slot);
    gear.push(chosen);
  }
  const totals=rs=>rs.reduce((a,r)=>({common:a.common+qty(r,t.items.common),rare:a.rare+qty(r,t.items.rare)}),{common:0,rare:0});
  const c=totals([chest]),full=totals(gear);
  return {tier:t.tier,chest:{recipe:chest.id,common:c.common,rare:c.rare,at300:projected(c.common,c.rare,300,t.drops.commonKill,t.drops.scarceKill),at900:projected(c.common,c.rare,900,t.drops.commonKill,t.drops.scarceKill)},
    illustrativeTenItems:{common:full.common,rare:full.rare,at300:projected(full.common,full.rare,300,t.drops.commonKill,t.drops.scarceKill),at900:projected(full.common,full.rare,900,t.drops.commonKill,t.drops.scarceKill)},
    fullTierCatalog:{items:recipes.length,common:totals(recipes).common,rare:totals(recipes).rare}
  };
});
console.log(JSON.stringify({disclaimer:'Expected kills / hour are illustrative, not actual Veldryn telemetry. All kills must be eligible; drops may overlap. All equipment XP/Gold/Forge times remain unchanged.',tiers:tierStats},null,2));
