/** V64/V65 hidden loot/equipment fixtures: pure policy; no inventory or economy writes. */
import {assert} from './test-assert';
import {
  WORLD_BOSS_GATHERING_LOOT_V64_LIVE,
  WORLD_BOSS_GATHERING_CHEST_MAX_V65,
  WORLD_BOSS_GATHERING_CHEST_SOURCES_V65,
  WORLD_BOSS_GATHERING_COMMUNITY_HP_GOAL_BPS_V65,
  WORLD_BOSS_GATHERING_PIECES_V64,
  WORLD_BOSS_GATHERING_SETS_V64,
  WORLD_BOSS_GATHERING_SLOTS,
  WORLD_BOSS_GATHERING_RARITY_V65,
  planWorldBossGatheringLootV64,
  previewOpenWorldBossGatheringChestV64,
  previewOpenWorldBossGatheringChestV65,
  previewEquippedWorldBossGatheringStatsV65,
  previewWorldBossGatheringBonusV64,
  worldBossGatheringPiecesV64,
  eligibleWorldBossGatheringChestsV65,
  validateWorldBossGatheringRollV65,
  type WorldBossGatheringBossV64,
  type WorldBossGatheringChestEvidenceV65,
} from '../../../backend/online/world-boss-gathering-loot-v64';

function expectThrow(fn:()=>unknown,fragment:string){
 let error='';
 try{fn()}catch(e){error=String(e)}
 assert.ok(error.includes(fragment),'Expected '+fragment+' in '+error);
}
const EVENT='event_42',ACCOUNT='account_42';
assert.equal(WORLD_BOSS_GATHERING_LOOT_V64_LIVE,false);
assert.equal(WORLD_BOSS_GATHERING_CHEST_MAX_V65,3);
assert.equal(WORLD_BOSS_GATHERING_COMMUNITY_HP_GOAL_BPS_V65,3000);
assert.equal(WORLD_BOSS_GATHERING_CHEST_SOURCES_V65.length,3);
assert.equal(WORLD_BOSS_GATHERING_SETS_V64.length,3);
assert.equal(WORLD_BOSS_GATHERING_PIECES_V64.length,30);
assert.equal(new Set(WORLD_BOSS_GATHERING_PIECES_V64.map(p=>p.itemId)).size,30);
assert.equal(WORLD_BOSS_GATHERING_RARITY_V65.reduce((n,r)=>n+r.weightPerMillion,0),1_000_000);
const expected={
  hollowroot:{skill:'woodcutting',material:'IRONWOOD_LOG'},
  sunscar:{skill:'mining',material:'SUNSTONE_ORE'},
  frostmarch:{skill:'fishing',material:'ICEFIN'},
} as const;

for(const boss of Object.keys(expected) as WorldBossGatheringBossV64[]){
  const set=WORLD_BOSS_GATHERING_SETS_V64.find(s=>s.bossId===boss)!;
  const pieces=worldBossGatheringPiecesV64(boss);
  assert.equal(set.skill,expected[boss].skill);
  assert.equal(set.primaryMaterial.itemId,expected[boss].material);
  assert.equal(pieces.length,10);
  assert.equal(new Set(pieces.map(p=>p.slot)).size,WORLD_BOSS_GATHERING_SLOTS.length);
  assert.ok(pieces.every(p=>p.setId===set.setId&&p.combatPowerBonus===0&&p.primaryStat==='gathering_speed'));

  const complete=planWorldBossGatheringLootV64({bossId:boss,outcome:'victory',nextInt:()=>0});
  assert.equal(complete.materials[0].itemId,expected[boss].material);
  assert.equal(complete.companionEssence,2);
  assert.equal(complete.materials[1].itemId,set.secondaryMaterial.itemId);
  assert.ok(!('chestId' in complete)); // No random raid chest; milestone-only award.
  const less=planWorldBossGatheringLootV64({bossId:boss,outcome:'victory',nextInt:max=>max-1});
  assert.equal(less.companionEssence,0);
  assert.equal(less.materials.length,1);
  const defeat=planWorldBossGatheringLootV64({bossId:boss,outcome:'defeat',nextInt:()=>0});
  assert.ok(defeat.gold<complete.gold);
  assert.ok(defeat.materials[0].quantity<complete.materials[0].quantity);
  assert.ok(!('chestId' in defeat));

  assert.equal(previewOpenWorldBossGatheringChestV64(set.chestId,()=>0).itemId,pieces[0].itemId);
  assert.equal(previewOpenWorldBossGatheringChestV64(set.chestId,max=>max-1).itemId,pieces[9].itemId);
  const first=previewOpenWorldBossGatheringChestV65(set.chestId,()=>0);
  const last=previewOpenWorldBossGatheringChestV65(set.chestId,max=>max-1);
  assert.equal(first.itemId,pieces[0].itemId);
  assert.equal(first.rarity,'mythic');
  assert.equal(first.quality,0);
  assert.equal(first.gatheringSpeedBasisPoints,120); // .8% x2 Mythic x .75 Q0
  assert.equal(first.bonusStats.length,2);
  assert.equal(first.bonusStats[0].stat,'gathering_xp');
  assert.equal(first.bonusStats[1].stat,'extra_yield');
  assert.equal(last.itemId,pieces[9].itemId);
  assert.equal(last.rarity,'common');
  assert.equal(last.quality,100);
  assert.equal(last.gatheringSpeedBasisPoints,100); // .8% x1 common x1.25 Q100
  assert.equal(last.bonusStats.length,1);
  assert.ok(validateWorldBossGatheringRollV65(first));
  assert.ok(validateWorldBossGatheringRollV65(last));
  assert.equal(first.combatPowerBonus,0);

  const evidence=(overrides:Partial<WorldBossGatheringChestEvidenceV65>={}):WorldBossGatheringChestEvidenceV65=>({
    eventId:EVENT,accountId:ACCOUNT,bossId:boss,
    committedDonations:2,warCampTracksAtLeastTier1:2,completedProvenAttempts:3,globalBossRemainingHpBps:3_000,
    alreadyAwardedSources:[],...overrides,
  });
  const eligible=eligibleWorldBossGatheringChestsV65(evidence());
  assert.equal(eligible.length,3);
  assert.deepEqual(eligible.map(e=>e.source),WORLD_BOSS_GATHERING_CHEST_SOURCES_V65);
  assert.equal(new Set(eligible.map(e=>e.rewardSourceKey)).size,3);
  assert.ok(eligible.every(e=>e.chestId===set.chestId&&e.bossId===boss));
  assert.equal(eligibleWorldBossGatheringChestsV65(evidence({committedDonations:0})).length,2);
  assert.equal(eligibleWorldBossGatheringChestsV65(evidence({warCampTracksAtLeastTier1:1})).length,2);
  assert.equal(eligibleWorldBossGatheringChestsV65(evidence({committedDonations:1})).length,3);
  assert.equal(eligibleWorldBossGatheringChestsV65(evidence({completedProvenAttempts:2})).length,2);
  assert.equal(eligibleWorldBossGatheringChestsV65(evidence({globalBossRemainingHpBps:3001})).length,2);
  assert.equal(eligibleWorldBossGatheringChestsV65(evidence({
    completedProvenAttempts:0,committedDonations:2,globalBossRemainingHpBps:0,
  })).length,1); // Donating alone must not qualify for community chest.
  assert.deepEqual(eligibleWorldBossGatheringChestsV65(evidence({
    alreadyAwardedSources:['donations','three_attempts','community_damage'],
  })),[]);
  assert.deepEqual(eligibleWorldBossGatheringChestsV65(evidence({
    alreadyAwardedSources:['donations','three_attempts'],
  })).map(e=>e.source),['community_damage']);
  assert.equal(eligibleWorldBossGatheringChestsV65(evidence({
    committedDonations:0,warCampTracksAtLeastTier1:0,
    completedProvenAttempts:0,globalBossRemainingHpBps:10_000,
  })).length,0);
  expectThrow(()=>eligibleWorldBossGatheringChestsV65(evidence({warCampTracksAtLeastTier1:4})),
    'invalid_proof_counts');
  expectThrow(()=>eligibleWorldBossGatheringChestsV65(evidence({committedDonations:3})),
    'invalid_proof_counts');
  expectThrow(()=>eligibleWorldBossGatheringChestsV65(evidence({globalBossRemainingHpBps:10_001})),
    'invalid_proof_counts');

  const equipped=pieces.map(piece=>piece.itemId);
  const zero=previewWorldBossGatheringBonusV64(set.skill,[]);
  const two=previewWorldBossGatheringBonusV64(set.skill,equipped.slice(0,2));
  const four=previewWorldBossGatheringBonusV64(set.skill,equipped.slice(0,4));
  const six=previewWorldBossGatheringBonusV64(set.skill,equipped.slice(0,6));
  const eight=previewWorldBossGatheringBonusV64(set.skill,equipped.slice(0,8));
  const ten=previewWorldBossGatheringBonusV64(set.skill,equipped);
  assert.equal(zero.xpBonusFraction,0);
  assert.equal(two.thresholds.length,1);
  assert.equal(two.xpBonusFraction,.03);
  assert.equal(four.yieldBonusFraction,.04);
  assert.equal(six.rareDropRelativeBonusFraction,.10);
  assert.equal(eight.actionTimeMultiplier,.96);
  assert.equal(ten.pieces,10);
  assert.equal(ten.thresholds.length,5);
  assert.ok(Math.abs(ten.xpBonusFraction-.08)<1e-10);
  assert.ok(Math.abs(ten.yieldBonusFraction-.07)<1e-10);
  assert.equal(previewWorldBossGatheringBonusV64(set.skill,[equipped[0],equipped[0]]).pieces,1);
  const foreignSkill=Object.values(expected).find(row=>row.skill!==set.skill)!.skill;
  assert.equal(previewWorldBossGatheringBonusV64(foreignSkill,equipped).pieces,0);
  const statTotals=previewEquippedWorldBossGatheringStatsV65(set.skill,[first,last,last]);
  assert.equal(statTotals.pieces,2);
  assert.equal(statTotals.gatheringSpeedBasisPoints,220);
  assert.equal(previewEquippedWorldBossGatheringStatsV65(foreignSkill,[first,last]).pieces,0);
  assert.equal(previewEquippedWorldBossGatheringStatsV65(set.skill,[{
    ...first,gatheringSpeedBasisPoints:999_999,
  }]).pieces,0); // Forged overpowered instance must not affect projection.
}

function rarityAt(bucket:number){
 const set=WORLD_BOSS_GATHERING_SETS_V64[0];
 let calls=0;
 return previewOpenWorldBossGatheringChestV65(set.chestId,max=>{
   calls++;
   return calls===2?bucket:0; // draw2 = 1,000,000 rarity bucket
 }).rarity;
}
assert.equal(rarityAt(999),'mythic');
assert.equal(rarityAt(1_000),'legendary');
assert.equal(rarityAt(2_999),'legendary');
assert.equal(rarityAt(3_000),'epic');
assert.equal(rarityAt(8_999),'epic');
assert.equal(rarityAt(9_000),'rare');
assert.equal(rarityAt(38_999),'rare');
assert.equal(rarityAt(39_000),'uncommon');
assert.equal(rarityAt(108_999),'uncommon');
assert.equal(rarityAt(109_000),'common');
assert.equal(rarityAt(999_999),'common');
for(const bad of [NaN,-1,1.5,10_000]){
  expectThrow(()=>planWorldBossGatheringLootV64({
    bossId:'sunscar',outcome:'victory',nextInt:()=>bad,
  }),'invalid_server_entropy');
}
expectThrow(()=>previewOpenWorldBossGatheringChestV65('forged',()=>0),'unknown_chest');
expectThrow(()=>planWorldBossGatheringLootV64({
  bossId:'forged' as WorldBossGatheringBossV64,outcome:'victory',nextInt:()=>0,
}),'unknown_boss');
console.log('World Boss V64/V65 hidden gathering loot and chest milestones passed');
