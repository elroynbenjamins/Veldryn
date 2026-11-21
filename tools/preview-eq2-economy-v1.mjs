#!/usr/bin/env node
/**
 * REVIEW ONLY: Generates an in-memory (or --write) proposed material rebalance
 * for the hidden T1-T4 Equipment 2.0 catalog. NEVER imports or mutates runtime,
 * production recipes, gameplay drops, SQL or live market offers.
 *
 * Usage:
 *   node tools/preview-eq2-economy-v1.mjs
 *   node tools/preview-eq2-economy-v1.mjs --write
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const config=JSON.parse(fs.readFileSync(path.join(root,'docs/equipment-2-0/t1-t4-economy-review-v1.json'),'utf8'));
if(config.status!=='REVIEW_ONLY_NO_RUNTIME')throw Error('Economy preview must stay review-only');

function literalArray(file,name){
  const source=fs.readFileSync(path.join(root,file),'utf8');
  const declaration=source.indexOf(name);
  if(declaration<0)throw Error('Missing '+name+' in '+file);
  const open=source.indexOf('=[',declaration);
  if(open<0)throw Error('Missing literal array for '+name);
  const close=source.indexOf('];',open);
  if(close<0)throw Error('Unterminated '+name);
  return JSON.parse(source.slice(open+1,close+1));
}
const modulePaths=[
 ['backend/src/server/equipment/equipment-crafting-v2-manifest.ts','V2_SERVER_CORE_PIECES','V2_SERVER_CORE_RECIPES'],
 ['backend/src/server/equipment/equipment-crafting-v2-expansion-manifest.ts','V2_SERVER_EXPANSION_PIECES','V2_SERVER_EXPANSION_RECIPES'],
 ['backend/src/server/equipment/equipment-crafting-v2-armament-manifest.ts','V2_SERVER_ARMAMENT_PIECES','V2_SERVER_ARMAMENT_RECIPES']
];
const pieces=modulePaths.flatMap(([file,name])=>literalArray(file,name));
const originals=modulePaths.flatMap(([file,,name])=>literalArray(file,name));
const fail=message=>{throw Error('EQ2 review invalid: '+message)};
if(pieces.length!==config.expected.ordinaryPieces||originals.length!==config.expected.recipeRoutes)fail('catalogue counts drift');
if(new Set(pieces.map(p=>p.id)).size!==pieces.length)fail('duplicate canonical item');
if(new Set(originals.map(r=>r.id)).size!==originals.length)fail('duplicate canonical recipe');
const pieceById=new Map(pieces.map(p=>[p.id,p]));
const tierById=new Map(config.tierSpecs.map(t=>[t.tier,t]));
const weight=config.slotWeight;
const positiveInt=(value,label)=>{
  if(!Number.isInteger(value)||value<1)fail('bad '+label+': '+value);
  return value;
};
function construct(recipe){
  const piece=pieceById.get(recipe.pieceId);
  if(!piece||piece.tier!==recipe.tier)fail('unresolved or mismatched '+recipe.id);
  if(!['foundation','alternate'].includes(recipe.route))fail('unrecognized route '+recipe.id);
  const tier=tierById.get(piece.tier);
  if(!tier)fail('unknown tier');
  const slotWeight=weight[piece.slot];
  if(!slotWeight||slotWeight<=0)fail('unmapped slot '+piece.slot);
  const plan=(piece.slot==='weapon'?config.weaponPlans[piece.material]:null)||config.materialPlans[piece.material];
  if(!plan)fail('unmapped material '+piece.material);
  const alternate=recipe.route==='alternate';
  const ratios=alternate?config.alternateRoute:{primaryMultiplier:1,secondaryMultiplier:1,trimMultiplier:1};
  const scaled=(entry,ratio,key)=>{
    const [kind,multiplier]=entry;
    const id=tier.items[kind];
    if(!id||!tier.amounts[kind])fail('unmapped '+key+' for '+piece.id);
    return [id,positiveInt(Math.max(1,Math.ceil(tier.amounts[kind]*multiplier*slotWeight*ratio)),key)];
  };
  const parts=[
    scaled(plan.primary,ratios.primaryMultiplier,'primary'),
    scaled(plan.secondary,ratios.secondaryMultiplier,'secondary'),
    scaled(plan.trim,ratios.trimMultiplier,'trim')
  ];
  const common=positiveInt(Math.max(2,Math.ceil(tier.amounts.common*slotWeight)),'common');
  parts.push([tier.items.common,common,'common']);
  const scarce=tier.rareBySlot[piece.slot]||0;
  if(scarce)parts.push([tier.items.rare,positiveInt(scarce,'scarce'),'scarce']);
  parts.push([tier.items.binder,1,'binder']);
  if(new Set(parts.map(p=>p[0])).size!==parts.length)fail('duplicate ingredient for '+recipe.id);
  return {
    id:recipe.id,pieceId:recipe.pieceId,tier:recipe.tier,route:recipe.route,
    profession:recipe.profession,inputs:parts.map(([itemId,quantity])=>({itemId,quantity})),
    gold:recipe.gold,xp:recipe.xp,seconds:recipe.seconds,
    characterLevel:recipe.characterLevel,professionLevel:recipe.professionLevel,
    reviewOnly:true
  };
}
const reviewRecipes=originals.map(construct);
const byPiece=new Map();
for(const r of reviewRecipes){
  const list=byPiece.get(r.pieceId)||[];
  list.push(r);byPiece.set(r.pieceId,list);
}
for(const [id,rs] of byPiece){
  if(rs.length!==2||rs[0].route===rs[1].route)fail('routes missing '+id);
  const spec=tierById.get(rs[0].tier);
  for(const key of ['common','rare','binder']){
    const material=spec.items[key];
    const get=r=>r.inputs.find(x=>x.itemId===material)?.quantity||0;
    if(get(rs[0])!==get(rs[1]))fail('alternate bypassed '+key+' at '+id);
  }
  for(const key of ['gold','xp','seconds','characterLevel','professionLevel'])
    if(rs[0][key]!==rs[1][key])fail('alternate changed '+key+' at '+id);
}
if(byPiece.size!==pieces.length)fail('items without routes');
const itemsByTier=config.tierSpecs.map(t=>{
  const tierRecipes=reviewRecipes.filter(r=>r.tier===t.tier&&r.route==='foundation');
  const commonTotal=tierRecipes.reduce((a,r)=>a+(r.inputs.find(x=>x.itemId===t.items.common)?.quantity||0),0);
  const scarceTotal=tierRecipes.reduce((a,r)=>a+(r.inputs.find(x=>x.itemId===t.items.rare)?.quantity||0),0);
  return {tier:t.tier,items:tierRecipes.length,commonTotal,scarceTotal,
    chestAt300KillsPerHour:(()=>{
      const chest=tierRecipes.find(r=>pieceById.get(r.pieceId)?.slot==='chest');
      const common=chest.inputs.find(x=>x.itemId===t.items.common)?.quantity||0;
      const scarce=chest.inputs.find(x=>x.itemId===t.items.rare)?.quantity||0;
      return Number(((common/t.drops.commonKill+scarce/t.drops.scarceKill)/300).toFixed(2));
    })()
  };
});
const generated={
  schema:'eq2-review-only-generated-recipes-v1',
  status:'REVIEW_ONLY_DO_NOT_IMPORT_TO_RUNTIME',
  warning:'These are NOT deployed recipes, crafting permissions, loot drops, Market listings or new item IDs.',
  source:'hidden server-owned 169-piece catalogue and 338 established recipes',
  unchangedFields:['item ID','profession','Gold','XP','crafting time','level gates','set membership','stat profile'],
  summary:{items:pieces.length,recipes:reviewRecipes.length,tiers:itemsByTier},
  recipes:reviewRecipes
};
if(process.argv.includes('--write')){
  const output=path.join(root,'docs/equipment-2-0/t1-t4-economy-generated-recipes-v1.json');
  fs.writeFileSync(output,JSON.stringify(generated,null,2)+'\n','utf8');
  console.log('Wrote design-only '+output);
}
console.log(JSON.stringify(generated.summary,null,2));
