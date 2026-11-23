// Hidden, read-only catalogue invariants. Does not import server/runtime code.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const read = p => JSON.parse(fs.readFileSync(p,'utf8'));
const directory='docs/equipment-2-0/';
const proposed=read(directory+'t5-catalogue-expansion-review-v2.json');
const accepted=read(directory+'t5-rare-set-catalogue-review-v1.json');
const crosswalk=read(directory+'eq2-physical-subtype-catalogue-review-v1.json');
const flatten=a=>a.flatMap(x=>x.members);
const std=flatten(proposed.standardSets);
const extra=flatten(proposed.proposedRareSets);
const weapons=proposed.armaments.weapons;
const offhands=proposed.armaments.offhands;
const added=[...std,...extra,...weapons,...offhands];
const oldIds=new Set(crosswalk.entries.map(x=>x.itemId));
assert.equal(proposed.releaseActivation,false);
assert.equal(proposed.status,'HIDDEN_REVIEW_ONLY_NOT_ITEM_OR_COMBAT_AUTHORITY');
assert.equal(proposed.standardSets.length,12);
assert.equal(proposed.proposedRareSets.length,2);
assert.equal(std.length,51);
assert.equal(extra.length,10);
assert.equal(weapons.length,9);
assert.equal(offhands.length,4);
assert.equal(added.length,74);
assert.equal(proposed.summary.t5TotalSets,16);
assert.equal(proposed.summary.t5TotalItems,84);
assert.equal(crosswalk.entries.length,383);
assert.equal(proposed.summary.priorCrosswalk383PlusNewItems,457);
assert.equal(new Set(added.map(x=>x.itemId)).size,74);
assert(added.every(x=>!oldIds.has(x.itemId)));
assert(added.every(x=>x.sourceStatus==='UNREGISTERED_REVIEW_ONLY'));
assert(added.every(x=>x.artStatus==='NEEDS_OWNER_VISUAL_APPROVAL'));
assert.deepEqual(proposed.standardSets.reduce((a,s)=>(a[s.role]=(a[s.role]||0)+1,a),{}),{tank:4,damage:4,support:4});
for (const s of [...proposed.standardSets,...proposed.proposedRareSets]) {
  const n=s.members.length;
  const expected=n===3?[2,3]:n===4?[2,4]:[2,4,6];
  assert.deepEqual(s.bonuses.map(x=>x.pieces),expected);
  assert.equal(new Set(s.members.map(x=>x.slot)).size,n);
  assert.equal(s.art,'NOT_GENERATED_OR_APPROVED');
}
assert(std.every(m=>m.fixedInnatePercentageStats.length===0));
assert(extra.every(m=>m.innate.value>0&&m.innate.unit));
assert.deepEqual(accepted.sets.map(x=>x.setId),proposed.inheritedRareSetsUnchanged.map(x=>x.setId));
assert.deepEqual(accepted.sets.map(x=>x.members.length),[6,4]);
assert(accepted.sets.every(x=>x.members.every(m=>m.innate&&m.recipe)));
assert.equal(crosswalk.entries.filter(x=>x.tier===4&&/CITADEL|BLOODSTEEL/.test(x.itemId)).length,10);
assert.equal(crosswalk.entries.filter(x=>x.tier===4&&/BASTIONMAIL|ASHGUARD/.test(x.itemId)).length,0);
const arms=[...weapons,...offhands];
assert.deepEqual(weapons.map(x=>x.classId).sort(),['BASTION','DAWNKEEPER','DREADGUARD','HEXWEAVER','IRONWARDEN','KNIFE_DANCER','RAVAGER','STONECALLER','WAYFINDER'].sort());
assert.deepEqual(offhands.map(x=>x.classId).sort(),['BASTION','DAWNKEEPER','HEXWEAVER','IRONWARDEN'].sort());
for(const a of weapons){
 const weights=a.directPhysicalStrikeSubtypeWeightsPct;
 if(a.classId==='HEXWEAVER')assert.equal(weights,null);
 else assert.equal(Object.values(weights).reduce((x,y)=>x+y,0),100);
}
for(const m of added){
 const routes=m.craftingRoutes??m.recipeRoutes;
 for(const k of ['rimeboneShards','iceveinSigils','bindingResin','gold','queueSeconds']){
  assert(routes.foundation[k]>0,m.itemId+' '+k);
  assert.equal(routes.foundation[k],routes.alternate[k],m.itemId+' '+k+' alternate bypass');
 }
 assert.equal(routes.foundation.recipeFailureChance,0);
 assert.equal(routes.alternate.recipeFailureChance,0);
}
const bySlot=new Map(std.map(x=>[x.slot,x]));
for(const m of extra){
 const base=bySlot.get(m.slot).craftingRoutes.foundation;
 const f=m.craftingRoutes.foundation;
 assert.equal(f.rimeboneShards,Math.ceil(base.rimeboneShards*1.35));
 assert.equal(f.gold,Math.ceil(base.gold*1.45/100)*100);
 assert.equal(f.queueSeconds,Math.ceil(base.queueSeconds*1.35/10)*10);
}
assert.equal(proposed.craftRules.noCombatCraftGate,true);
assert.equal(proposed.craftRules.retiredT4IdsNeverReused,true);
console.log('PASS: T5 hidden catalogue, rare inheritance, 51+10+13 source candidates, 2-route scarcity parity, weapon profiles, crosswalk warnings');
