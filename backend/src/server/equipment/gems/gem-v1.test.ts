import {strict as assert} from 'node:assert';
import {EFFECT_GEMS_V1,STAT_GEMS_V1,validateGemCatalogV1} from './gem-catalog-v1';
import {combineGemV1,dismantleGemV1,gemCombineSuccessPercentV1,type GemWallet} from './gem-progression-v1';
import {applyStatGemsV1,summarizeGemLoadoutV1} from './gem-runtime-v1';
import {buildGemDropsForSourceV1,gemPoolForSourceV1,settleGemSourceV1,validateGemAcquisitionV1} from './gem-acquisition-v1';

assert.equal(STAT_GEMS_V1.length,12);
assert.equal(EFFECT_GEMS_V1.length,20);
assert.deepEqual(validateGemCatalogV1(),[]);
assert.deepEqual(validateGemAcquisitionV1(),[]);
for (const [sourceId,chance,pityAt] of [
 ['ZONE_006',.001875,undefined],
 ['ZONE_007',.00375,240],
 ['ZONE_008',.00375,240],
 ['ZONE_009',.00375,240],
 ['ZONE_010',.0075,100],
 ['COP_004',.045,32],
 ['COP_005',.045,32],
 ['COP_006',.045,32],
 ['COP_007',.045,32],
 ['COP_008',.045,32],
 ['COP_009',.045,32],
 ['PARTY_CONTRACT_WEEKLY',.0625,16],
] as const){
 const source=gemPoolForSourceV1(sourceId);
 assert.equal(source?.chance,chance,`${sourceId}: gem drop chance must be one quarter`);
 assert.equal(source?.pityAt,pityAt,`${sourceId}: pity must scale to match reduced drops`);
}
assert.equal(gemPoolForSourceV1('LIVE_COOP_RESONANCE_CACHE')?.chance,1,'Earned Live weekly cache stays guaranteed');
assert.ok(gemPoolForSourceV1('COP_004'));
assert.ok(buildGemDropsForSourceV1('COP_004').length>0);
const forcedPity=settleGemSourceV1('COP_004','forced-pity',{pityBySource:{COP_004:31},unlockedRecipeIds:[]});
assert.ok(forcedPity.gem,'Dungeon pity must settle one unrefined gem');
assert.ok(forcedPity.gem?.itemId.startsWith('raw_gem:'),'Gem acquisition must award an unrefined family gem');
assert.equal(forcedPity.gem?.pityTriggered,true);
assert.equal(forcedPity.pityBySource.COP_004,0);
const forcedElite=settleGemSourceV1('ZONE_007','forced-elite',{pityBySource:{ZONE_007:239},unlockedRecipeIds:[]});
assert.equal(forcedElite.gem?.grade,2,'Elite pity must preserve the configured Grade II raw gem');
assert.equal(forcedElite.pityBySource.ZONE_007,0);
const forcedRegionalBoss=settleGemSourceV1('ZONE_010','forced-regional-boss',{pityBySource:{ZONE_010:99},unlockedRecipeIds:[]});
assert.equal(forcedRegionalBoss.gem?.grade,3,'Regional boss pity must preserve the configured Grade III raw gem');
assert.equal(forcedRegionalBoss.pityBySource.ZONE_010,0);

const summary=summarizeGemLoadoutV1([
 {equipmentItemId:'a',sockets:{effect:{familyId:'effect_momentum',grade:5},stat:{familyId:'stat_might',grade:5}}},
 {equipmentItemId:'b',sockets:{effect:{familyId:'effect_momentum',grade:3}}},
 {equipmentItemId:'c',sockets:{effect:{familyId:'effect_momentum',grade:1}}},
]);
assert.equal(summary.effects[0]?.resonance,3);
assert.equal(summary.effects[0]?.copies,3);
assert.equal(summary.statPercent.attack,.035);
assert.equal(summary.statPercent.power,undefined,'Might cannot directly increase Power');
const combatBase={maxHp:500,power:400,armor:100,ward:0,accuracy:.8,evasion:.05,critRate:.05,critDamage:.5,haste:.1,tenacity:0,penetration:0,potency:0,attack:200};
const combatAfter=applyStatGemsV1(combatBase,summary);
assert.equal(combatAfter.attack,207,'G5 Might increases real Attack by 3.5%');
assert.equal(combatAfter.power,400,'Derived Power must not be changed by Might itself');
assert.deepEqual(STAT_GEMS_V1.find(g=>g.familyId==='stat_might')?.values,{1:.01,2:.015,3:.02,4:.0275,5:.035});
for(const family of STAT_GEMS_V1){
 const values=[1,2,3,4,5].map(grade=>family.values[grade as 1|2|3|4|5]);
 assert.ok(values.every((v,i)=>v>0&&(i===0||v>values[i-1])),`Gem family ${family.familyId} must strengthen every grade`);
}
const maxAttackFromTenPerfectG5=10*STAT_GEMS_V1.find(g=>g.familyId==='stat_might')!.values[5]*1.2;
assert.ok(maxAttackFromTenPerfectG5<=.45,'Ten perfected G5 ATK gems exceed the preview budget');

const wallet:GemWallet={gold:100000,dust:100,regionalCatalysts:2,radiantCatalysts:1,gems:[{familyId:'stat_might',grade:1,quantity:3}]};
assert.deepEqual([1,2,3,4,5,6,7].map(gemCombineSuccessPercentV1),[90,80,70,60,55,50,45]);
const combined=combineGemV1(wallet,'stat_might',1,.1);
assert.equal(combined.gems.find(v=>v.grade===2)?.quantity,1);
const failed=combineGemV1(wallet,'stat_might',1,.99);
assert.equal(failed.gems.find(v=>v.grade===1)?.quantity,2,'Failed merges lose just one gem');
assert.equal(failed.gems.some(v=>v.grade===2),false,'Failed merges never mint a higher gem');
assert.equal(failed.gold,wallet.gold-1800,'Failed merges still pay the current Forge Gold cost');
const radiantWallet:GemWallet={...wallet,gems:[{familyId:'stat_might',grade:4,quantity:3}]};
const radiantFailure=combineGemV1(radiantWallet,'stat_might',4,.99);
assert.equal(radiantFailure.gems.find(v=>v.grade===4)?.quantity,2,'A failed G4 merge must return 2 Flawless gems');
assert.equal(radiantFailure.gold,radiantWallet.gold-72000,'G4 merge must use the same 20%-increased Forge Gold cost');
assert.equal(radiantFailure.dust,radiantWallet.dust-40,'Failed G4 merge spends Gem Dust');
assert.equal(radiantFailure.radiantCatalysts,0,'Failed G4 merge consumes its Radiant Catalyst');
const radiantSuccess=combineGemV1(radiantWallet,'stat_might',4,.1);
assert.equal(radiantSuccess.gems.find(v=>v.grade===5)?.quantity,1,'Successful G4 merge must award 1 Radiant gem');
const dismantled=dismantleGemV1(combined,'stat_might',2,1);
assert.equal(dismantled.dust,103);

let resonanceCapBlocked=false;
try{
 summarizeGemLoadoutV1([
  {equipmentItemId:'1',sockets:{effect:{familyId:'effect_execution',grade:1}}},
  {equipmentItemId:'2',sockets:{effect:{familyId:'effect_execution',grade:1}}},
  {equipmentItemId:'3',sockets:{effect:{familyId:'effect_execution',grade:1}}},
  {equipmentItemId:'4',sockets:{effect:{familyId:'effect_execution',grade:1}}},
 ]);
}catch(error){resonanceCapBlocked=error instanceof Error&&error.message==='effect_gem_resonance_cap';}
assert.ok(resonanceCapBlocked,'Fourth matching Effect Gem must be rejected');

console.log('gem v1 tests passed');
