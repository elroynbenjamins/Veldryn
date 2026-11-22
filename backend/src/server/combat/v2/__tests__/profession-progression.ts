import {strict as assert} from 'node:assert';
import {
  PROFESSIONS_V2,PROFESSION_LEVEL_CAP_V2,PROFESSION_TIER_LEVELS_V2,
  PROFESSION_MILESTONES_V2,FOCUS_BONUSES_V2,
  minimumLevelForTierV2,professionTierAtLevelV2,
  mayWorkProfessionTierV2,mayEquipCombatGearV2,
  projectTrustedProgressionV2,validateTrustedProgressionV2,
  xpForNextProfessionLevelV2,cappedProfessionActionSpeedBpsV2,
  type ProfessionIdV2,type TrustedProgressionV2,
} from '../profession-progression';
import {talentPointsAtLevelV2} from '../build-contract';

const character=(override:Partial<TrustedProgressionV2>={}):TrustedProgressionV2=>({
  combatLevel:1,professionLevels:{},primaryFocus:null,...override,
});
assert.equal(Object.keys(PROFESSIONS_V2).length,12);
assert.equal(PROFESSION_LEVEL_CAP_V2,100);
assert.deepEqual(PROFESSION_TIER_LEVELS_V2,[1,10,22,35,45,55,65,75,90]);
const tiered=(Object.keys(PROFESSIONS_V2) as ProfessionIdV2[])
  .filter(id=>PROFESSIONS_V2[id]==='gathering'&&id!=='exploration'||
    PROFESSIONS_V2[id]==='crafting');
assert.equal(tiered.length,9);
for(let tier=1;tier<=9;tier++){
  const requirement=minimumLevelForTierV2(tier);
  assert.equal(professionTierAtLevelV2(requirement),tier);
  assert.equal(professionTierAtLevelV2(requirement-1),tier-1);
  for(const id of tiered){
    // Even an otherwise untrained level-1 character can independently reach T9
    // in any one skill, without a single XP point in combat or other professions.
    const onlyThisOne=character({professionLevels:{[id]:requirement}});
    assert.equal(mayWorkProfessionTierV2(onlyThisOne,id,tier),true,id+' T'+tier);
    for(const other of tiered.filter(x=>x!==id))
      assert.equal(mayWorkProfessionTierV2(onlyThisOne,other,tier),false,
        other+' must not borrow '+id+' progression');
    if(requirement>1){
      assert.equal(mayWorkProfessionTierV2(
        character({professionLevels:{[id]:requirement-1}}),id,tier),false);
    }
  }
}
const masterSmith=character({professionLevels:{smithing:90}});
assert.equal(mayWorkProfessionTierV2(masterSmith,'smithing',9),true);
assert.equal(mayEquipCombatGearV2(masterSmith,2),false);
assert.equal(mayEquipCombatGearV2(masterSmith,50),false);
assert.equal(talentPointsAtLevelV2(masterSmith.combatLevel),0,
  'professions cannot mint combat talent points');
const combatVeteran=character({combatLevel:75,professionLevels:{smithing:1}});
assert.equal(mayEquipCombatGearV2(combatVeteran,50),true);
assert.equal(mayWorkProfessionTierV2(combatVeteran,'smithing',9),false);
assert.equal(projectTrustedProgressionV2(combatVeteran).characterLevel,75);
assert.equal(projectTrustedProgressionV2(masterSmith).characterLevel,1,
  'character level must not be a sum, average or max of trained professions');
assert.equal(projectTrustedProgressionV2(masterSmith).professionMasteryTotal,90);
assert.equal(mayWorkProfessionTierV2(masterSmith,'forge',1),false,
  'Forge mastery must not turn into a second mandatory crafting tier license');
assert.equal(mayWorkProfessionTierV2(masterSmith,'faith',1),false);
assert.equal(mayWorkProfessionTierV2(masterSmith,'exploration',1),false);
assert.equal(mayWorkProfessionTierV2(masterSmith,'smithing',0),false);
assert.equal(mayWorkProfessionTierV2(masterSmith,'smithing',10),false);
assert.equal(mayEquipCombatGearV2(combatVeteran,0),false);

const focused=character({professionLevels:{smithing:100,mining:35},primaryFocus:'smithing'});
const view=projectTrustedProgressionV2(focused);
assert.equal(view.characterLevel,1);
assert.equal(view.primaryFocus,'smithing');
assert.equal(view.professionMasteryTotal,135);
assert.equal(view.professions.find(s=>s.id==='smithing')?.tier,9);
assert.equal(view.professions.find(s=>s.id==='smithing')?.nextTierLevel,null);
assert.equal(view.professions.find(s=>s.id==='mining')?.tier,4);
assert.equal(view.professions.find(s=>s.id==='mining')?.focused,false);
assert.deepEqual(view.professions.find(s=>s.id==='smithing')?.focusBonuses,
  FOCUS_BONUSES_V2.map(b=>b.code));
assert.equal(view.professions.find(s=>s.id==='mining')?.focusBonuses.length,0);
assert.equal(PROFESSION_MILESTONES_V2.at(-1)?.level,100);
const untrained=projectTrustedProgressionV2(character());
assert.equal(untrained.professionMasteryTotal,0);
assert.equal(untrained.professions.find(s=>s.id==='smithing')?.tier,0);
assert.equal(untrained.professions.find(s=>s.id==='smithing')?.nextTierLevel,1);
assert.deepEqual(untrained.professions.find(s=>s.id==='smithing')?.milestones,[]);

assert.doesNotThrow(()=>validateTrustedProgressionV2(character()));
assert.throws(()=>validateTrustedProgressionV2(character({combatLevel:0})),/invalid_combat_level/);
assert.throws(()=>validateTrustedProgressionV2(character({combatLevel:1.5})),/invalid_combat_level/);
assert.throws(()=>validateTrustedProgressionV2(character({
  professionLevels:{smithing:101},
})),/invalid_profession_level/);
assert.throws(()=>validateTrustedProgressionV2(character({
  professionLevels:{smithing:-1},
})),/invalid_profession_level/);
assert.throws(()=>validateTrustedProgressionV2(character({
  professionLevels:{smithing:25.5},
})),/invalid_profession_level/);
assert.throws(()=>validateTrustedProgressionV2(character({
  professionLevels:{['v2:skill:ironwarden:rune_challenge']:100} as any,
})),/invalid_profession_level/);
assert.throws(()=>validateTrustedProgressionV2(character({
  professionLevels:{smithing:24},primaryFocus:'smithing',
})),/focus_locked/);
assert.throws(()=>validateTrustedProgressionV2(character({
  professionLevels:{smithing:25},primaryFocus:'forged_profession' as ProfessionIdV2,
})),/invalid_focus/);
assert.equal(projectTrustedProgressionV2(character({
  professionLevels:{smithing:25},primaryFocus:'smithing',
})).professions.find(s=>s.id==='smithing')?.focused,true);

// XP curve is purely additive to a single profession, is monotone,
// and does NOT reset or remap production XP in existing characters.
assert.equal(xpForNextProfessionLevelV2(1),120);
let previous=0;
for(let lv=1;lv<PROFESSION_LEVEL_CAP_V2;lv++){
  const xp=xpForNextProfessionLevelV2(lv);
  assert.ok(xp>previous,'monotonic requirement level '+lv);
  assert.equal(xp%10,0);
  previous=xp;
}
assert.equal(xpForNextProfessionLevelV2(100),0);
assert.throws(()=>xpForNextProfessionLevelV2(0),/invalid_profession_level/);
assert.throws(()=>minimumLevelForTierV2(0),/invalid_tier/);

// Cumulative profession+Forge action speed must never exceed the shared 10% cap.
assert.equal(cappedProfessionActionSpeedBpsV2(100,200,300),600);
assert.equal(cappedProfessionActionSpeedBpsV2(900,200),1000);
assert.throws(()=>cappedProfessionActionSpeedBpsV2(-1),/invalid_speed_source/);
assert.throws(()=>cappedProfessionActionSpeedBpsV2(1001),/invalid_speed_source/);
console.log('PASS: independent T1-T9 professions, combat-only character level, focus milestones, monotone XP and capped bonuses');
