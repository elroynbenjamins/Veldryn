import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  reviewDungeonPoolV5, previewItemOddsV5, previewExpectedGearV5,
  inspectProposedMarketProofShapeV5, previewSyntheticBossRollV5
} from './lib/eq2-dungeon-loot-market-preview-v5.mjs';

const read=name=>JSON.parse(fs.readFileSync('docs/equipment-2-0/'+name,'utf8'));
const old=read('regional-dungeon-boss-tradeable-premium-gear-review-v4.json');
const next=read('regional-dungeon-boss-loot-and-market-review-v5.json');
const frostV4=read('t5-catalogue-expansion-review-v4.json');

assert.equal(next.status,'REVIEW_ONLY_NO_LIVE_CATALOGUE_SOURCE_OR_LOOT_MARKET_AUTHORITY');
assert.equal(next.published,false);
assert.equal(next.serverRegistration,false);
assert.equal(next.dropServiceRegistered,false);
assert.equal(next.marketRegistered,false);
assert.equal(next.rarityBalance.recommendedFirstSimulationPct,8);
assert.equal(next.rarityBalance.finalAllowedLiveRatePct,null);
assert.equal(next.bossPools.length,4);
assert.equal(next.offhandSignatureReview.length,16);
assert.equal(next.classAndSpecReconciliation.damageSetCorrections.length,2);
assert(next.classAndSpecReconciliation.damageSetCorrections.every(x=>x.newVersion.includes('direct class ability damage')));
assert(next.sourceBalanceAndV2Gates.marketMinLevelConflict.includes('wear level candidate42'));
assert(next.sourceBalanceAndV2Gates.liveMarketState.includes('NO positive EQ2'));

const expectedAll=[];
for(const dungeon of old.dungeons) {
  const p=next.bossPools.find(x=>x.dungeonId===dungeon.dungeonId);
  assert(p,'missing dungeon '+dungeon.dungeonId);
  assert.equal(p.registered,false);
  assert.equal(p.bosses.length,2);
  assert.deepEqual(p.bosses.map(x=>x.bossName),dungeon.bosses);
  const authoritativeCandidates=[
    ...dungeon.armorSets.flatMap(x=>x.members),
    ...dungeon.classWeapons, ...dungeon.classOffhands
  ];
  const b= dungeon.dungeonId==='EXP_005' ? frostV4.dungeonExclusiveSets[0].members : [];
  const expectedIds=new Set([...authoritativeCandidates,...b].map(x=>x.itemId));
  const observedIds=new Set();
  let entireRunPct=0;
  for(const boss of p.bosses) {
    const reviewed=reviewDungeonPoolV5(next,dungeon.dungeonId,boss.bossName);
    assert.equal(reviewed.poolSize,dungeon.dungeonId==='EXP_005'?(boss===p.bosses[0]?15:14):(boss===p.bosses[0]?13:12));
    assert.equal(boss.categoryWeights.reduce((sum,category)=>sum+category.weightPct,0),100);
    const listedInSource=authoritativeCandidates.filter(x=>x.bossSource.bossName===boss.bossName).map(x=>x.itemId);
    const bellListed=b.filter(x=>x.source.bossName===boss.bossName).map(x=>x.itemId);
    assert.deepEqual(new Set(reviewed.entries.map(x=>x.itemId)),new Set([...listedInSource,...bellListed]));
    for(const entry of reviewed.entries){
      assert(!observedIds.has(entry.itemId));
      observedIds.add(entry.itemId);
      assert(expectedIds.has(entry.itemId));
      assert(entry.categoryWeightPct>0);
    }
    for(const rate of [3,5,8,10]) {
      const odds=previewItemOddsV5(next,dungeon.dungeonId,boss.bossName,rate);
      const conditional=odds.reduce((s,x)=>s+x.conditionalGivenThisBossPct,0);
      const perHalf=odds.reduce((s,x)=>s+x.perEligibleRunForFrozen50_50BossPct,0);
      assert(Math.abs(conditional-rate)<1e-9,'boss pool does not sum to source rate');
      assert(Math.abs(perHalf-rate/2)<1e-9,'50/50 effective boss rate not half');
    }
    entireRunPct+=previewItemOddsV5(next,dungeon.dungeonId,boss.bossName,8).reduce((s,x)=>s+x.perEligibleRunForFrozen50_50BossPct,0);
    if(boss.bossName==='Bellbeast') assert.equal(boss.categoryWeights.find(x=>x.type==='signature_armor')?.itemIds.length,2);
  }
  assert.equal(observedIds.size,expectedIds.size);
  expectedAll.push(...observedIds);
  assert(Math.abs(entireRunPct-8)<1e-9);
  assert.throws(()=>reviewDungeonPoolV5(next,dungeon.dungeonId,'client-swapped-boss'),/wrong frozen boss variant/);
}
assert.equal(expectedAll.length,104);
assert.equal(new Set(expectedAll).size,104);
assert.throws(()=>reviewDungeonPoolV5(next,'EXP_002','Retired Boss'),/dungeon not a gated preview/);
assert.throws(()=>previewItemOddsV5(next,'EXP_001','Rootbound Heart',-1),/invalid drop percentage/);
assert.throws(()=>previewItemOddsV5(next,'EXP_001','Rootbound Heart',101),/invalid drop percentage/);
assert.equal(previewExpectedGearV5(313,8),25.04);
assert.equal(previewExpectedGearV5(4,8),0.32);
assert.equal(previewExpectedGearV5(313,3),9.39);
assert.equal(previewExpectedGearV5(4,5),0.2);
assert.throws(()=>previewExpectedGearV5(-1,8));
assert.throws(()=>previewExpectedGearV5(2.5,8));

const allOdds=next.bossPools.flatMap(d=>d.bosses.flatMap(b=>previewItemOddsV5(next,d.dungeonId,b.bossName,8).map(x=>x.perEligibleRunForFrozen50_50BossPct)));
const min=Math.min(...allOdds),max=Math.max(...allOdds);
assert.equal(Number(min.toFixed(4)),0.2);
assert.equal(Number(max.toFixed(4)),0.3667);
assert.equal(next.rarityBalance.itemOddsPreviewAt8PctRange.minPct,0.2);
assert.equal(next.rarityBalance.itemOddsPreviewAt8PctRange.maxPct,0.3667);
const offhandIds=new Set(next.offhandSignatureReview.map(x=>x.itemId));
assert.equal(offhandIds.size,16);
for(const d of old.dungeons)for(const item of d.classOffhands)assert(offhandIds.has(item.itemId));
assert(next.offhandSignatureReview.every(x=>x.internalCooldownSeconds>=20 && x.status==='PROPOSED_NOT_COMBAT_2_0_REGISTERED'));
assert(next.marketPositiveBridgeContract.existingMarketGates.warning.includes('Sunscar'));
assert(next.marketPositiveBridgeContract.currentMarketFlagsReleased===false);
assert(next.authoritativeGrantContract.noAccountWeeklyCapAdded===true);
assert(next.authoritativeGrantContract.noDepthMultiplierAdded===true);
assert(next.universalRules===undefined); // inheritance via v4; do not silently mount a second runtime catalogue
assert.deepEqual(next.frozenSources.retiredIdsForbidden,['EXP_002','EXP_004','EXP_006','EXP_008']);
const fakeComplete={
 mintGeneration:'equipment_2_0',originalBossClaimReceiptId:'forged',originalDungeonId:'EXP_001',
 originalBossId:'Rootbound Heart',physicalInstanceId:'forged',canonicalTemplateId:'EQ2_DUNGEON_FAKE',
 originalOwnerId:'forged',currentOwnerId:'forged',equipmentRollSnapshotId:'forged',custodyRevision:1,
 marketListingLock:'forged',originalMintSource:'authenticated_dungeon_boss_victory'
};
const inspected=inspectProposedMarketProofShapeV5(fakeComplete);
assert.equal(inspected.appearsStructurallyComplete,true);
assert.equal(inspected.marketAuthorized,false,'never treat client-shaped proof as server authorization');
assert.equal(inspectProposedMarketProofShapeV5({originalMintSource:'client_tag'}).marketAuthorized,false);
assert.equal(inspectProposedMarketProofShapeV5(null).marketAuthorized,false);
assert(next.marketPositiveBridgeContract.proof.some(x=>x.includes('original server-authorized boss victory claim')));
assert(next.productionObservation.observations.find(x=>x.dungeonId==='EXP_001').uniqueAccounts===7);

// Exhaustively hit every exact authored boss-source item through deterministic
// fixture-only percentages; never authorize actual gear or Market custody.
for (const dungeon of next.bossPools) {
  for (const boss of dungeon.bosses) {
    const noDrop=previewSyntheticBossRollV5(next,dungeon.dungeonId,boss.bossName,8,0.5,0.3,0.2);
    assert.equal(noDrop.candidateItemId,null);
    assert.equal(noDrop.mayMint,false);
    let previousWeight=0;
    for (const category of boss.categoryWeights) {
      const categoryCenter=(previousWeight+category.weightPct/2)/100;
      for(let i=0;i<category.itemIds.length;i++) {
        const chosen=previewSyntheticBossRollV5(
          next,dungeon.dungeonId,boss.bossName,8,0.01,
          categoryCenter,(i+0.5)/category.itemIds.length
        );
        assert.equal(chosen.candidateItemId,category.itemIds[i]);
        assert.equal(chosen.category,category.type);
        assert.equal(chosen.sourceBoss,boss.bossName);
        assert.equal(chosen.sourceDungeon,dungeon.dungeonId);
        assert.equal(chosen.previewOnly,true);
        assert.equal(chosen.mayMint,false);
        assert.equal(chosen.marketAuthorized,false);
        assert.equal(typeof chosen.note,'string');
      }
      previousWeight+=category.weightPct;
    }
    assert.equal(previousWeight,100);
  }
}
assert.throws(()=>previewSyntheticBossRollV5(next,'EXP_002','Retired',8,0,0,0),/dungeon not a gated preview/);
assert.throws(()=>previewSyntheticBossRollV5(next,'EXP_001','Rootbound Heart',8,0,1,0),/invalid synthetic categoryRoll/);
assert.throws(()=>previewSyntheticBossRollV5(next,'EXP_001','Rootbound Heart',8,NaN,0,0),/invalid synthetic gearRoll/);
assert.throws(()=>previewSyntheticBossRollV5(next,'EXP_001','Rootbound Heart',8,0,0,-1),/invalid synthetic itemRoll/);
assert.throws(()=>previewSyntheticBossRollV5(next,'EXP_001','Rootbound Heart',101,0,0,0),/invalid drop percentage/);

console.log('PASS source-only: 4 frozen boss pairs, 104 distinct pool IDs, all normalized 3/5/8/10% distributions, 16 offhand hooks, 2 magic-role corrections, market remains unauthorized');
