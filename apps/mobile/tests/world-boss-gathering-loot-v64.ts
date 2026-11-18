/** V64 focused hidden loot/set fixtures: pure policy, never writes inventory. */
import {assert} from './test-assert';
import {
  WORLD_BOSS_GATHERING_LOOT_V64_LIVE,
  WORLD_BOSS_GATHERING_CHEST_CHANCE_BPS,
  WORLD_BOSS_GATHERING_PIECES_V64,
  WORLD_BOSS_GATHERING_SETS_V64,
  WORLD_BOSS_GATHERING_SLOTS,
  planWorldBossGatheringLootV64,
  previewOpenWorldBossGatheringChestV64,
  previewWorldBossGatheringBonusV64,
  worldBossGatheringPiecesV64,
  type WorldBossGatheringBossV64,
} from '../../../backend/online/world-boss-gathering-loot-v64';

assert.equal(WORLD_BOSS_GATHERING_LOOT_V64_LIVE,false);
assert.equal(WORLD_BOSS_GATHERING_CHEST_CHANCE_BPS,100);
assert.equal(WORLD_BOSS_GATHERING_SETS_V64.length,3);
assert.equal(WORLD_BOSS_GATHERING_PIECES_V64.length,30);
assert.equal(new Set(WORLD_BOSS_GATHERING_PIECES_V64.map(p=>p.itemId)).size,30);
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
  assert.ok(pieces.every(p=>p.setId===set.setId&&p.combatPowerBonus===0&&p.rarity==='epic'));
  const best=planWorldBossGatheringLootV64({
    bossId:boss,outcome:'victory',nextInt:()=>0,
  });
  assert.equal(best.chestId,set.chestId);
  assert.equal(best.materials[0].itemId,expected[boss].material);
  assert.equal(best.companionEssence,2);
  assert.equal(best.materials[1].itemId,set.secondaryMaterial.itemId);
  const first=previewOpenWorldBossGatheringChestV64(set.chestId,()=>0);
  const last=previewOpenWorldBossGatheringChestV64(set.chestId,max=>max-1);
  assert.equal(first.itemId,pieces[0].itemId);
  assert.equal(last.itemId,pieces[9].itemId);
  const notChest=planWorldBossGatheringLootV64({
    bossId:boss,outcome:'victory',nextInt:max=>max-1,
  });
  assert.equal(notChest.chestId,undefined);
  assert.equal(notChest.companionEssence,0);
  assert.equal(notChest.materials.length,1);
  const defeat=planWorldBossGatheringLootV64({
    bossId:boss,outcome:'defeat',nextInt:()=>0,
  });
  assert.equal(defeat.chestId,undefined);
  assert.ok(defeat.gold<best.gold);
  assert.ok(defeat.materials[0].quantity<best.materials[0].quantity);
  const equipped=pieces.map(piece=>piece.itemId);
  const zero=previewWorldBossGatheringBonusV64(set.skill,[]);
  const two=previewWorldBossGatheringBonusV64(set.skill,equipped.slice(0,2));
  const four=previewWorldBossGatheringBonusV64(set.skill,equipped.slice(0,4));
  const six=previewWorldBossGatheringBonusV64(set.skill,equipped.slice(0,6));
  const eight=previewWorldBossGatheringBonusV64(set.skill,equipped.slice(0,8));
  const ten=previewWorldBossGatheringBonusV64(set.skill,equipped);
  assert.equal(zero.xpBonusFraction,0);
  assert.equal(two.thresholds.length,1);
  assert.equal(four.yieldBonusFraction,.04);
  assert.equal(six.rareDropRelativeBonusFraction,.10);
  assert.equal(eight.actionTimeMultiplier,.96);
  assert.equal(ten.pieces,10);
  assert.equal(ten.thresholds.length,5);
  assert.ok(Math.abs(ten.xpBonusFraction-.13)<1e-10);
  assert.ok(Math.abs(ten.yieldBonusFraction-.07)<1e-10);
  assert.equal(previewWorldBossGatheringBonusV64(set.skill,[equipped[0],equipped[0]]).pieces,1);
  const foreignSkill=Object.values(expected).find(row=>row.skill!==set.skill)!.skill;
  assert.equal(previewWorldBossGatheringBonusV64(foreignSkill,equipped).pieces,0);
}
const lucky=planWorldBossGatheringLootV64({
  bossId:'sunscar',outcome:'victory',
  nextInt:max=>max===10_000?99:max-1,
});
assert.equal(lucky.chestId,'WB64_SUNFORGED_CACHE');
const unlucky=planWorldBossGatheringLootV64({
  bossId:'sunscar',outcome:'victory',
  nextInt:max=>max===10_000?100:max-1,
});
assert.equal(unlucky.chestId,undefined);
for(const bad of [NaN,-1,1.5,10_000]){
  assert.throws(()=>planWorldBossGatheringLootV64({
    bossId:'sunscar',outcome:'victory',nextInt:()=>bad,
  }),/invalid_server_entropy/);
}
assert.throws(()=>previewOpenWorldBossGatheringChestV64('forged',()=>0),/unknown_chest/);
assert.throws(()=>planWorldBossGatheringLootV64({
  bossId:'forged' as WorldBossGatheringBossV64,outcome:'victory',nextInt:()=>0,
}),/unknown_boss/);
console.log('World Boss V64 hidden gathering loot contract passed');
