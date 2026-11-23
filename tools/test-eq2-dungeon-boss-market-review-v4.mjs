// Hidden, source-only Equipment 2.0 regional dungeon + Market design contract.
// Run: node tools/test-eq2-dungeon-boss-market-review-v4.mjs
// Review data only; DOES NOT execute the game's server loot, mint, Market, combat or DB logic.
import fs from 'node:fs';
import assert from 'node:assert/strict';

const folder='docs/equipment-2-0/';
const read=(name)=>JSON.parse(fs.readFileSync(folder+name,'utf8'));
const global=read('regional-dungeon-boss-tradeable-premium-gear-review-v4.json');
const old=read('t5-catalogue-expansion-review-v3.json');
const next=read('t5-catalogue-expansion-review-v4.json');
const itemsOf=(d)=>[...d.armorSets.flatMap(s=>s.members),...d.classWeapons,...d.classOffhands];
const prevT5=[...old.standardSets.flatMap(s=>s.members),...old.proposedRareSets.flatMap(s=>s.members),...old.armaments.weapons,...old.armaments.offhands,...old.dungeonExclusiveSets.flatMap(s=>s.members),...old.twoPieceComboSets.flatMap(s=>s.members)];

assert.equal(global.releaseActivation,false);
assert.equal(global.status,'HIDDEN_REVIEW_ONLY_NOT_RUNTIME_LOOT_OR_MARKET_AUTHORITY');
assert.equal(next.releaseActivation,false);
assert.equal(global.summary.dungeonCount,4);
assert.equal(global.summary.newBossGearSets,12);
assert.equal(global.summary.newBossGearSetMembers,48);
assert.equal(global.summary.newClassWeapons,36);
assert.equal(global.summary.newOffhands,16);
assert.equal(global.summary.newItemIds,100);
assert.equal(global.summary.proposedTotalDungeonBossItemsAcrossAllFour,104);
assert.equal(next.summary.t5TotalItems,125);
assert.equal(next.summary.t5TotalSets,26);
assert.equal(prevT5.length,100);
const previousIds=new Set(prevT5.map(m=>m.itemId));
assert.equal(previousIds.size,100);
const all=global.dungeons.flatMap(itemsOf);
assert.equal(all.length,100);
assert.equal(new Set(all.map(m=>m.itemId)).size,100);
assert(all.every(m=>!previousIds.has(m.itemId)));
assert(all.every(m=>m.sourceStatus==='UNREGISTERED_REVIEW_ONLY'));
assert.deepEqual(global.dungeons.map(d=>d.dungeonId),['EXP_001','EXP_003','EXP_005','EXP_007']);
assert.deepEqual(global.dungeons.map(d=>d.tierCandidate),[2,4,5,7]);

const nine=['IRONWARDEN','BASTION','DREADGUARD','WAYFINDER','RAVAGER','HEXWEAVER','KNIFE_DANCER','DAWNKEEPER','STONECALLER'];
const offhandFour=['IRONWARDEN','BASTION','HEXWEAVER','DAWNKEEPER'];
const twoHandFive=['DREADGUARD','WAYFINDER','RAVAGER','KNIFE_DANCER','STONECALLER'];
const allowedClasses=new Set(nine);

for(const d of global.dungeons){
 assert.equal(d.bosses.length,2);
 assert.equal(new Set(d.bosses).size,2);
 assert.equal(d.armorSets.length,3);
 assert.equal(d.classWeapons.length,9);
 assert.equal(d.classOffhands.length,4);
 assert.equal(itemsOf(d).length,25);
 assert.deepEqual(d.armorSets.map(s=>s.role),['tank','damage','support']);
 assert.deepEqual(d.classWeapons.map(w=>w.classId).sort(),[...nine].sort());
 assert.deepEqual(d.classOffhands.map(w=>w.classId).sort(),[...offhandFour].sort());
 assert(d.classWeapons.every(w=>allowedClasses.has(w.classId)));
 assert(twoHandFive.every(c=>!d.classOffhands.some(o=>o.classId===c)));
 assert(d.wearLevelCandidate===null ? d.region==='Ashlands' : d.region!=='Ashlands');
 const ids=new Set(itemsOf(d).map(x=>x.itemId));
 assert.equal(ids.size,25);
 for(const s of d.armorSets){
  assert.equal(s.members.length,4);
  assert.deepEqual(s.setBonuses.map(b=>b.pieces),[2,4]);
  assert(s.setBonuses[1].internalCooldownSeconds>=18);
  assert.equal(new Set(s.members.map(m=>m.slot)).size,4);
  assert.equal(s.members.filter(m=>m.bossSource.bossName===d.bosses[0]).length,2);
  assert.equal(s.members.filter(m=>m.bossSource.bossName===d.bosses[1]).length,2);
 }
 for(const m of itemsOf(d)){
  assert(m.innateStat && m.innateStat.value>0 && m.innateStat.unit);
  assert.equal(m.category,'dungeon_boss_drop_only');
  assert.equal(m.bossSource.dungeonId,d.dungeonId);
  assert(d.bosses.includes(m.bossSource.bossName));
  assert.equal(m.craftable,false);
  assert.equal(m.shopsAllowed,false);
  assert.equal(m.craftingRoutes.length,0);
  assert.equal(m.marketPolicy.marketEligibilityCandidate,true);
  assert.equal(m.marketPolicy.marketEnabled,false);
  assert.equal(m.marketPolicy.canResellAfterPurchase,true);
  assert.equal(m.marketPolicy.originalAcquisitionNeverChangesAfterResale,true);
 }
 const allClassToRole=new Map(d.classWeapons.map(x=>[x.classId,x.role]));
 assert.equal([...allClassToRole.values()].filter(v=>v==='tank').length,3);
 assert.equal([...allClassToRole.values()].filter(v=>v==='damage').length,4);
 assert.equal([...allClassToRole.values()].filter(v=>v==='support').length,2);
 for(const weapon of d.classWeapons){
  const weights=weapon.weaponDamageSubtypeWeightsPct;
  if(weapon.classId==='HEXWEAVER')assert.equal(weights,null);
  else assert.equal(Object.values(weights).reduce((x,y)=>x+y,0),100);
 }
 assert.deepEqual(d.bossLootProbabilityCandidate.status,'PROPOSAL_NOT_ACTIVATED_REQUIRES_PRODUCTION_CLEARS_AND_MARKET_LIQUIDITY_TELEMETRY');
}

assert.deepEqual(next.standardSets,old.standardSets);
assert.deepEqual(next.proposedRareSets,old.proposedRareSets);
assert.deepEqual(next.twoPieceComboSets,old.twoPieceComboSets);
assert.deepEqual(next.armaments,old.armaments);
const oldBell=old.dungeonExclusiveSets[0],newBell=next.dungeonExclusiveSets[0];
assert.deepEqual(newBell.setBonuses,oldBell.setBonuses);
assert.deepEqual(newBell.dropReview.bossPools,oldBell.dropReview.bossPools);
assert.deepEqual(newBell.members.map(m=>m.itemId),oldBell.members.map(m=>m.itemId));
for(const m of newBell.members){
 assert.equal(m.playerMarketEligible,true);
 assert.equal(m.marketEligibilityCandidate,true);
 assert.equal(m.marketEnabled,false);
 assert.equal(m.tradeable,true);
 assert.equal(m.accountBoundCandidate,false);
 assert.equal(m.craftable,false);
 assert.equal(m.craftingRoutes.length,0);
 assert.equal(m.fixedInnatePercentageStats.length,1);
 assert(m.fixedInnatePercentageStats[0].value>0);
}
assert.equal(next.dungeonRegionalExpansion.additionalSetCount,3);
assert.equal(next.dungeonRegionalExpansion.additionalItemCount,25);
const frost=global.dungeons.find(d=>d.dungeonId==='EXP_005');
assert.deepEqual(next.dungeonRegionalExpansion.addedArmorSets,frost.armorSets);
assert.deepEqual(next.dungeonRegionalExpansion.addedClassWeapons,frost.classWeapons);
assert.deepEqual(next.dungeonRegionalExpansion.addedClassOffhands,frost.classOffhands);
assert.equal(next.dungeonMarketplacePolicyV4.legacy,false);
assert.equal(next.dungeonMarketplacePolicyV4.resale,true);
assert.equal(next.dungeonMarketplacePolicyV4.authoritativeActivation,false);
assert.equal(global.universalRules.legacyPre2EverEligible,false);
assert.equal(global.universalRules.bossDefeatRequired,true);
assert.equal(global.universalRules.marketActuallyEnabled,false);
assert.equal(global.universalRules.noMarksExchange,true);
assert.equal(global.universalRules.noCraftingAllowed,true);

console.log('PASS: 4 dungeons, 12 role sets/48 pieces, 36 class weapons, 16 legitimate offhands; boss-only proof and future Market resale; historical T5 retained, 125 T5 candidates.');
