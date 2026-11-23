// READ-ONLY hidden EQ2 T5 review contract. No imports into gameplay/runtime.
import assert from 'node:assert/strict';
import fs from 'node:fs';
const folder='docs/equipment-2-0/';
const read=name=>JSON.parse(fs.readFileSync(folder+name,'utf8'));
const v2=read('t5-catalogue-expansion-review-v2.json');
const v3=read('t5-catalogue-expansion-review-v3.json');
const rare=read('t5-rare-set-catalogue-review-v1.json');
const fullEntries=x=>[...x.standardSets.flatMap(s=>s.members),...x.proposedRareSets.flatMap(s=>s.members),...x.armaments.weapons,...x.armaments.offhands];
const base=fullEntries(v2);
const dungeon=v3.dungeonExclusiveSets[0];
const pairs=v3.twoPieceComboSets;
const extra=[...dungeon.members,...pairs.flatMap(s=>s.members)];
const all=[...base,...extra];
assert.equal(v2.releaseActivation,false);
assert.equal(v3.releaseActivation,false);
assert.equal(v3.schema,'eq2-t5-expanded-catalogue-review-v3-dungeon-and-two-piece-combos');
assert.deepEqual(v2.standardSets,v3.standardSets);
assert.deepEqual(v2.proposedRareSets,v3.proposedRareSets);
assert.deepEqual(v2.inheritedRareSetsUnchanged,v3.inheritedRareSetsUnchanged);
assert.deepEqual(v2.armaments,v3.armaments);
assert.deepEqual(rare.sets.map(s=>s.setId),v3.inheritedRareSetsUnchanged.map(s=>s.setId));
assert.equal(v2.summary.t5TotalSets,16);
assert.equal(v2.summary.t5TotalItems,84);
assert.equal(v3.summary.t5TotalSets,23);
assert.equal(v3.summary.t5TotalItems,100);
assert.equal(v3.summary.additiveProposedNewItems,90);
assert.equal(v3.summary.priorCrosswalk383PlusNewItems,473);
assert.equal(base.length,74);
assert.equal(extra.length,16);
assert.equal(all.length,90);
assert.equal(new Set(all.map(m=>m.itemId)).size,90);
assert(all.every(m=>m.sourceStatus==='UNREGISTERED_REVIEW_ONLY'));
assert.equal(dungeon.dungeonId,'EXP_005');
assert.equal(dungeon.retiredDungeonId,'EXP_006');
assert.equal(dungeon.dungeonPublished,false);
assert.equal(dungeon.category,'dungeon_exclusive_drop_set');
assert.equal(dungeon.craftingAllowed,false);
assert.deepEqual(dungeon.setBonuses.map(x=>x.pieces),[2,4]);
assert.equal(dungeon.setBonuses[1].internalCooldownSeconds,28);
assert.equal(dungeon.members.length,4);
assert.deepEqual(dungeon.members.map(m=>m.source.bossName).sort(),['Bellbeast','Bellbeast','Frozen Cantor','Frozen Cantor'].sort());
for(const member of dungeon.members){
 assert.equal(member.craftingRoutes.length,0);
 assert.equal(member.craftable,false);
 assert.equal(member.shopPurchasable,false);
 assert.equal(member.playerMarketEligible,false);
 assert.equal(member.tradeable,false);
 assert.equal(member.source.dungeonId,'EXP_005');
 assert.equal(member.source.kind,'terminal_boss_victory_chest_only');
 assert.equal(member.source.authenticatedCompletionReceiptRequired,true);
 assert.equal(member.source.uniqueRewardLegRequired,true);
 assert.equal(member.artStatus,'NEEDS_OWNER_VISUAL_APPROVAL');
}
const pool=dungeon.dropReview.bossPools;
const awards=Object.entries(pool).flatMap(([boss,ids])=>ids.map(id=>[boss,id]));
assert.equal(awards.length,4);
assert.equal(new Set(awards.map(p=>p[1])).size,4);
for(const [boss,id] of awards){
 const m=dungeon.members.find(x=>x.itemId===id);
 assert(m && m.source.bossName===boss,'boss pool mismatch '+id);
}
assert.equal(dungeon.dropReview.effectiveDropRates,'NOT_AUTHORED_PENDING_PRODUCTION_TELEMETRY');
assert.equal(pairs.length,6);
assert.equal(pairs.flatMap(s=>s.members).length,12);
assert.deepEqual(pairs.map(s=>s.role),['tank','tank','damage','damage','support','all_roles']);
const positiveKeys=['rimeboneShards','iceveinSigils','bindingResin','gold','queueSeconds'];
for(const pair of pairs){
 assert.equal(pair.pieceCount,2);
 assert.equal(pair.bonus.pieces,2);
 assert.equal(pair.members.length,2);
 assert.equal(new Set(pair.members.map(m=>m.slot)).size,2);
 assert(pair.bonus.internalCooldownSeconds>=14);
 for(const m of pair.members){
  assert.equal(m.profession,pair.profession);
  assert.equal(m.craftLevelCandidate,43);
  assert.equal(m.wearLevelCandidate,52);
  assert.deepEqual(m.fixedInnatePercentageStats,[]);
  assert.equal(m.artStatus,'NEEDS_OWNER_VISUAL_APPROVAL');
  const old=base.find(x=>x.itemId===m.sourceReferenceItemId);
  assert(old && old.slot===m.slot && old.profession===m.profession,'bad source reference '+m.itemId);
  const foundations=m.craftingRoutes.foundation,alternates=m.craftingRoutes.alternate;
  for(const k of positiveKeys){assert(foundations[k]>0);assert.equal(foundations[k],alternates[k],'scarcity bypass '+m.itemId+':'+k);}
  assert.equal(foundations.recipeFailureChance,0);
  assert.equal(alternates.recipeFailureChance,0);
  for(const key of ['foundation','alternate']){
   const orig=old.craftingRoutes[key],newr=m.craftingRoutes[key];
   for(const material of ['froststeelIngots','frostwoodPlanks','frostweaveCloth','hardenedFrostleather','smokeglassPlates','frostmailLinks','bloodtemperedSteel','rimeboneShards']){
    if(orig[material]!==undefined)assert.equal(newr[material],Math.ceil(orig[material]*1.1),m.itemId+' '+material);
   }
   assert.equal(newr.gold,Math.ceil(orig.gold*1.1/100)*100);
   assert.equal(newr.queueSeconds,Math.ceil(orig.queueSeconds*1.1/10)*10);
   assert.equal(newr.iceveinSigils,orig.iceveinSigils);
   assert.equal(newr.bindingResin,orig.bindingResin);
  }
 }
}
const slots=(items)=>new Set(items.map(m=>m.slot));
const noCollision=(parts)=>{const m=parts.flatMap(x=>x.members);return slots(m).size===m.length;};
assert(noCollision([rare.sets.find(s=>s.setId==='eq2_rare_t5_citadel'),pairs.find(s=>s.setId==='eq2_combo_t5_runeforge_link')]));
assert(noCollision([rare.sets.find(s=>s.setId==='eq2_rare_t5_bloodsteel'),pairs.find(s=>s.setId==='eq2_combo_t5_frostclasp_aegis'),pairs.find(s=>s.setId==='eq2_combo_t5_stonewinter_frame')]));
assert(noCollision([dungeon,pairs.find(s=>s.setId==='eq2_combo_t5_glacier_talons'),pairs.find(s=>s.setId==='eq2_combo_t5_dawnmender_chain')]));
console.log('PASS: T5 23 sets / 100 items; 16 new unique; legacy rare inheritance unchanged; source-locked Shiverlake boss reward; 6 exact 2p recipe/equip contracts');
