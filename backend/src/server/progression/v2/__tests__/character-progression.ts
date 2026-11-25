const assert = {
  equal(actual: unknown, expected: unknown, message = 'values differ'): void {
    if (actual !== expected) throw new Error(message+': expected '+String(expected)+', received '+String(actual));
  },
  throws(run: () => unknown, expected: RegExp): void {
    try { run(); } catch (error) {
      if (expected.test(String(error))) return;
      throw new Error('Expected '+String(expected)+', received '+String(error));
    }
    throw new Error('Expected throw: '+String(expected));
  },
};
import {
  overallXpForNextLevelV2,professionXpForNextLevelV2,overallLevelFromXpV2,professionLevelFromXpV2,
  overallTotalXpForLevelV2,professionTotalXpForLevelV2,projectCharacterProgressionV2,
  mayEquipCombatGearV2,mayWorkProfessionTierV2,proposeTrustedActivityXpV2,PROFESSION_IDS_V2,
} from '../character-progression';
import {professionBonusesV2,specializationRankV2,cappedCombinedSpeedBasisPointsV2,rareFindChancePartsPerMillionV2} from '../profession-mastery';

assert.equal(overallXpForNextLevelV2(100),0);
assert.equal(professionXpForNextLevelV2(100),0);
for (const [level,overall,profession] of [[1,0,0],[10,5475,5655],[25,44300,56300],[50,273175,385875],[75,842675,1238575],[90,1412875,2105295],[96,1698600,2542010],[100,1909050,2864400]]) {
  assert.equal(overallTotalXpForLevelV2(level),overall);
  assert.equal(professionTotalXpForLevelV2(level),profession);
  assert.equal(overallLevelFromXpV2(overall),level);
  assert.equal(professionLevelFromXpV2(profession),level);
  if (level > 1) {
    assert.equal(overallLevelFromXpV2(overall-1),level-1);
    assert.equal(professionLevelFromXpV2(profession-1),level-1);
  }
}
const pureSmith = {combatLevel:1,overallCharacterXp:overallTotalXpForLevelV2(90),professionXp:{smithing:professionTotalXpForLevelV2(96)}} as const;
const p=projectCharacterProgressionV2(pureSmith);
assert.equal(p.overallCharacterLevel,90);
assert.equal(p.combatLevel,1);
assert.equal(p.professionLevels.smithing,96);
assert.equal(mayWorkProfessionTierV2(pureSmith,'smithing',9),true);
assert.equal(mayWorkProfessionTierV2(pureSmith,'tailoring',1),false);
assert.equal(mayEquipCombatGearV2(pureSmith,2),false);
assert.equal(mayEquipCombatGearV2(pureSmith,1),true);
for (const profession of PROFESSION_IDS_V2) {
  const owner = {combatLevel:1,overallCharacterXp:0,professionXp:{[profession]:professionTotalXpForLevelV2(100)}};
  assert.equal(projectCharacterProgressionV2(owner).combatLevel,1);
  const tiered = !['exploration','faith','forge'].includes(profession);
  assert.equal(mayWorkProfessionTierV2(owner,profession,9),tiered);
}
assert.throws(()=>projectCharacterProgressionV2({combatLevel:1,overallCharacterXp:0,professionXp:{fake:999} as any}),/invalid_profession/);
assert.throws(()=>overallLevelFromXpV2(-1),/invalid_xp/);
assert.throws(()=>professionLevelFromXpV2(Number.NaN),/invalid_xp/);
const event = proposeTrustedActivityXpV2({settlementId:'craft:1234',kind:'profession',professionId:'smithing',baseEffortSeconds:240,difficultyBasisPoints:10000});
assert.equal(event.overallCharacterXp,120);
assert.equal(event.professionXp,240);
assert.equal(event.combatXp,0);
assert.equal(proposeTrustedActivityXpV2({settlementId:'combat:1234',kind:'combat',baseEffortSeconds:240,difficultyBasisPoints:5000}).overallCharacterXp,60);
assert.throws(()=>proposeTrustedActivityXpV2({settlementId:'craft:1234',kind:'combat',professionId:'smithing',baseEffortSeconds:240,difficultyBasisPoints:10000}),/invalid_activity/);
assert.throws(()=>proposeTrustedActivityXpV2({settlementId:'craft:1234',kind:'profession',professionId:'fake' as any,baseEffortSeconds:240,difficultyBasisPoints:10000}),/invalid_activity/);
assert.throws(()=>proposeTrustedActivityXpV2({settlementId:'craft:1234',kind:'profession',professionId:'smithing',baseEffortSeconds:-1,difficultyBasisPoints:10000}),/invalid_settlement/);
for (const [level,rank] of [[1,0],[24,0],[25,1],[49,1],[50,2],[74,2],[75,3],[99,3],[100,4]]) assert.equal(specializationRankV2(level),rank);
const production = professionBonusesV2({professionId:'smithing',level:100,specialization:'production'});
assert.equal(production.speedBasisPoints,1800);
assert.equal(production.commonRecoveryBasisPoints,500);
assert.equal(production.qualityPoints,2);
assert.equal(professionBonusesV2({professionId:'smithing',level:100,specialization:'efficiency'}).commonRecoveryBasisPoints,900);
assert.equal(professionBonusesV2({professionId:'smithing',level:100,specialization:'precision'}).qualityPoints,4);
assert.equal(professionBonusesV2({professionId:'mining',level:100,specialization:'prospecting'}).relativeRareFindBasisPoints,800);
assert.equal(rareFindChancePartsPerMillionV2(1000,800),1080);
assert.equal(cappedCombinedSpeedBasisPointsV2(1800,1000),2000);
assert.throws(()=>professionBonusesV2({professionId:'smithing',level:24,specialization:'efficiency'}),/locked_specialization/);
assert.throws(()=>professionBonusesV2({professionId:'mining',level:50,specialization:'precision'}),/invalid_specialization/);
assert.throws(()=>professionBonusesV2({professionId:'forge',level:50,specialization:'production'}),/unsupported_specialization/);
assert.throws(()=>professionBonusesV2({professionId:'unknown' as any,level:50,specialization:null}),/invalid_profession/);
console.log('PASS: isolated V2 three-track progression, profession independence, XP and mastery boundaries');
