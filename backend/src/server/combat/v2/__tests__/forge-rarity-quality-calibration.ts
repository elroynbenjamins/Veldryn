/** Hidden actual Forge source audit: exact templates, no minted items or CP approval. */
import {strict as assert} from 'node:assert';
import {V2_SERVER_PIECES,V2_SERVER_RECIPES} from '../../../equipment/equipment-crafting-v2-manifest';
import {V2_SERVER_RARITY_BANDS,V2_SERVER_RARITY_BASE_MULTIPLIER,V2_SERVER_AFFIX_RANGES,
 draftEquipmentV2Outcome,type V2Rarity} from '../../../equipment/equipment-crafting-v2-rolls';
import {v2ServerBaseStatProjection,v2ServerCreateExactTemplate,v2ServerExactTemplateConsistent,
 v2ServerWeightedBaseBudget} from '../../../equipment/equipment-crafting-v2-instances';
const ascending=['common','uncommon','rare','epic','legendary','mythic'] as const;
const qualities=[0,50,100] as const;
const qualityDraw={0:0,50:580000,100:999999};
const starts=new Map<V2Rarity,number>();
let offset=0;
for(const band of V2_SERVER_RARITY_BANDS){starts.set(band.rarity,offset);offset+=band.buckets;}
assert.equal(offset,1000000);
const rows:{piece:string;tier:number;role:string;rarity:V2Rarity;quality:number;budget:number;affixes:number;potency:number}[]=[];
for(const piece of V2_SERVER_PIECES){
 const recipe=V2_SERVER_RECIPES.find(r=>r.pieceId===piece.id&&r.route==='foundation');
 assert.ok(recipe);
 for(const rarity of ascending)for(const quality of qualities){
  let index=0,state=12345+piece.tier;
  const roll=draftEquipmentV2Outcome({recipeId:recipe.id,pieceId:piece.id,tier:piece.tier,role:piece.role,slot:piece.slot},max=>{
   index++;
   if(index===1){assert.equal(max,1000000);return starts.get(rarity)!;}
   if(index===2){assert.equal(max,1000000);return qualityDraw[quality];}
   state=(Math.imul(state,1664525)+1013904223)>>>0;return state%max;
  });
  assert.equal(roll.rarity,rarity);assert.equal(roll.quality,quality);
  const exact=v2ServerCreateExactTemplate(piece,roll);
  assert.ok(v2ServerExactTemplateConsistent(exact));
  assert.deepEqual(exact.baseStats,v2ServerBaseStatProjection(piece,V2_SERVER_RARITY_BASE_MULTIPLIER[rarity]*(.75+quality*.005)));
  assert.equal(exact.affixes.length,new Set(exact.affixes.map(a=>a.stat)).size);
  assert.ok(exact.affixes.every(a=>a.percent>=V2_SERVER_AFFIX_RANGES[a.stat][piece.tier-1][0]-.011&&a.percent<=V2_SERVER_AFFIX_RANGES[a.stat][piece.tier-1][1]+.011));
  rows.push({piece:piece.id,tier:piece.tier,role:piece.role,rarity,quality,
   budget:v2ServerWeightedBaseBudget(exact.baseStats),affixes:exact.affixes.length,
   potency:exact.affixes.filter(a=>a.stat==='potency').length});
 }
}
assert.equal(rows.length,V2_SERVER_PIECES.length*18);
for(const piece of V2_SERVER_PIECES){
 const a=rows.filter(r=>r.piece===piece.id);
 for(const q of qualities)for(let i=1;i<ascending.length;i++)
  assert.ok(a.find(r=>r.quality===q&&r.rarity===ascending[i])!.budget>a.find(r=>r.quality===q&&r.rarity===ascending[i-1])!.budget);
 for(const rarity of ascending){
  const q=qualities.map(quality=>a.find(r=>r.rarity===rarity&&r.quality===quality)!.budget);
  assert.ok(q[0]<q[1]&&q[1]<q[2]);
 }
}
const overlap=ascending.slice(0,-1).map((rarity,i)=>{
 const next=ascending[i+1];
 return {lower:rarity,higher:next,lowerQ100:V2_SERVER_RARITY_BASE_MULTIPLIER[rarity]*1.25,
 higherQ0:V2_SERVER_RARITY_BASE_MULTIPLIER[next]*.75,
 lowerOutperformsHigherBase:V2_SERVER_PIECES.filter(p=>rows.find(r=>r.piece===p.id&&r.rarity===rarity&&r.quality===100)!.budget>
 rows.find(r=>r.piece===p.id&&r.rarity===next&&r.quality===0)!.budget).length};
});
console.log('FORGE_RARITY_QUALITY_CALIBRATION '+JSON.stringify({kind:'ACTUAL_DRAFT_FORGE_PROJECTION_NOT_CP',
 pieces:V2_SERVER_PIECES.length,exactTemplates:rows.length,qualities,
 bands:ascending.map(rarity=>({rarity,multiplier:V2_SERVER_RARITY_BASE_MULTIPLIER[rarity],
  q0:V2_SERVER_RARITY_BASE_MULTIPLIER[rarity]*.75,q50:V2_SERVER_RARITY_BASE_MULTIPLIER[rarity],q100:V2_SERVER_RARITY_BASE_MULTIPLIER[rarity]*1.25})),
 adjacentRarityOverlap:overlap,
 affixCountsByTierRarity:[1,2,3,4].flatMap(tier=>ascending.map(rarity=>{
  const a=rows.filter(r=>r.tier===tier&&r.rarity===rarity);return {tier,rarity,count:[...new Set(a.map(r=>r.affixes))],samples:a.length,potencySamples:a.reduce((n,r)=>n+r.potency,0)};
 })),
 caveat:'weighted base budget is Forge source allocation only, not Combat Power; potency remains unpriced and sample is stratified not frequency estimate'}));
