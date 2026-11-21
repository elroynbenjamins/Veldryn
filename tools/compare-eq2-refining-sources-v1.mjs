#!/usr/bin/env node
/**
 * Review-only T4 cost sensitivity: new EQ2 review processing vs the existing
 * live-mobile Sunstone Ingot output recipe, including existing Alchemy binders.
 * No runtime imports, game-state writes or item ID migration.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {expandProcessingInputs,processingIndex} from './lib/eq2-drop-risk-v2.mjs';
import {existingAlchemyOutputs,existingSmelting} from './lib/eq2-source-introspection-v1.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const fail=reason=>{throw Error('EQ2 T4 source sensitivity blocked: '+reason);};
const config=JSON.parse(read('docs/equipment-2-0/t1-t4-economy-review-v1.json'));
const draft=JSON.parse(read('docs/equipment-2-0/t1-t4-economy-generated-recipes-v1.json'));
if(config.status!=='REVIEW_ONLY_NO_RUNTIME'||draft.status!=='REVIEW_ONLY_DO_NOT_IMPORT_TO_RUNTIME')
  fail('non-review input');
const literalArray=(file,name)=>{
  const source=read(file),p=source.indexOf(name),a=source.indexOf('=[',p),b=source.indexOf('];',a);
  if(p<0||a<0||b<a)fail('hidden catalogue missing '+name);
  return JSON.parse(source.slice(a+1,b+1));
};
const paths=[
 ['backend/src/server/equipment/equipment-crafting-v2-manifest.ts','V2_SERVER_CORE_PIECES'],
 ['backend/src/server/equipment/equipment-crafting-v2-expansion-manifest.ts','V2_SERVER_EXPANSION_PIECES'],
 ['backend/src/server/equipment/equipment-crafting-v2-armament-manifest.ts','V2_SERVER_ARMAMENT_PIECES']
];
const pieces=paths.flatMap(([file,name])=>literalArray(file,name));
const pieceById=new Map(pieces.map(piece=>[piece.id,piece]));
if(pieces.length!==169||pieceById.size!==pieces.length||draft.recipes.length!==338)fail('catalogue drift');
const tier=4,recipes=draft.recipes.filter(r=>r.tier===tier&&r.route==='foundation');
const slots=['helmet','chest','gloves','legs','boots','cape','amulet','ring','weapon','offhand'];
const loadout=slots.map(slot=>{
  const id=slot==='weapon'?'EQ2_WEAPON_T4_IRONWARDEN':slot==='offhand'?'EQ2_OFFHAND_T4_IRONWARDEN':null;
  const selected=recipes.find(r=>id?r.pieceId===id:(pieceById.get(r.pieceId)?.slot===slot&&pieceById.get(r.pieceId)?.role==='tank'));
  if(!selected)fail('missing tank slot '+slot);
  return selected;
});
if(new Set(loadout.map(r=>r.pieceId)).size!==10)fail('duplicate slots');
const allInputs=new Map();
for(const recipe of loadout){
  for(const {itemId,quantity} of recipe.inputs)
    allInputs.set(itemId,(allInputs.get(itemId)||0)+quantity);
}
const inputs=[...allInputs].map(([itemId,quantity])=>({itemId,quantity}));
const alchemy=existingAlchemyOutputs(read('apps/mobile/src/content/alchemy.ts'));
const binders=config.tierSpecs.map(t=>{
  const alternatives=alchemy.filter(r=>r.outputId===t.items.binder);
  const standard=alternatives.find(r=>r.id==='BREW_'+t.items.binder);
  if(!standard)fail('no standard alchemy binder recipe for '+t.items.binder);
  return {output:standard.outputId,quantity:standard.outputQuantity,
    inputs:Object.fromEntries(standard.inputs.map(x=>[x.itemId,x.quantity])),
    xp:standard.xp,seconds:standard.seconds,xpSkill:'alchemy'};
});
const baseProcessing=config.tierSpecs.flatMap(t=>t.processing);
const existing=existingSmelting(read('apps/mobile/src/content/skills.ts'))
  .find(r=>r.outputId==='SUNSTONE_INGOT');
if(!existing||existing.outputQuantity!==3||existing.inputs.length!==2)fail('current Sunstone processing changed');
const replacement={output:'SUNSTONE_INGOT',quantity:existing.outputQuantity,
  inputs:Object.fromEntries(existing.inputs.map(x=>[x.itemId,x.quantity])),
  xp:existing.xp,seconds:existing.seconds,xpSkill:'smithing'};
const proposed=expandProcessingInputs(inputs,processingIndex([
 {processing:baseProcessing},{processing:binders}
]));
const preservingCurrentIngot=expandProcessingInputs(inputs,processingIndex([
 {processing:baseProcessing.map(x=>x.output==='SUNSTONE_INGOT'?replacement:x)},
 {processing:binders}
]));
const delta=(field)=>preservingCurrentIngot.rawInputs[field]||0;
const proposedRaw=(field)=>proposed.rawInputs[field]||0;
console.log(JSON.stringify({
 status:'REVIEW_ONLY_NO_RUNTIME',
 selection:'Illustrative ten-slot T4 tank equipment, foundation route, one craft attempt per slot',
 assumptions:[
  'All refined ingredients are processed from scratch; stored ingots/binders change the bills',
  'Existing standard Alchemy binder recipes are selected, not optional bulk/alternate routes',
  'Comparison preserves existing SUNSTONE_INGOT ID but replaces only its reviewed processing expansion',
  'These are nominal queue seconds and awarded XP, not actual wall time nor live source grants'
 ],
 proposedV2SunstoneRecipe:{
   output:config.tierSpecs[2].processing.find(p=>p.output==='SUNSTONE_INGOT')
 },
 existingSunstoneRecipe:existing,
 commonAndScarce:{
   common:allInputs.get(config.tierSpecs[3].items.common)||0,
   scarce:allInputs.get(config.tierSpecs[3].items.rare)||0
 },
 proposedReview:{raw:proposed.rawInputs,processingXPBySkill:proposed.processingXPBySkill,nominalSeconds:proposed.processingSeconds},
 preservingExistingSunstone:{raw:preservingCurrentIngot.rawInputs,
   processingXPBySkill:preservingCurrentIngot.processingXPBySkill,
   nominalSeconds:preservingCurrentIngot.processingSeconds},
 sourceChoiceDelta:{
   sunstoneOre:delta('SUNSTONE_ORE')-proposedRaw('SUNSTONE_ORE'),
   dunewood:delta('DUNEWOOD')-proposedRaw('DUNEWOOD'),
   smithingXP:(preservingCurrentIngot.processingXPBySkill.smithing||0)-(proposed.processingXPBySkill.smithing||0),
   nominalSeconds:preservingCurrentIngot.processingSeconds-proposed.processingSeconds
 },
 decisionRequired:'Do not give the existing SUNSTONE_INGOT ID two incompatible processing recipes. Reuse canonical recipe or design versioned 2.0 material and migration after approval.'
},null,2));
