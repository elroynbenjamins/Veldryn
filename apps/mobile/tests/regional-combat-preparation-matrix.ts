import {assert} from './test-assert';
import {combatSustainProjection,REGIONAL_FOOD_SUSTAIN_TARGETS} from '../src/core/game';
import {REGIONAL_COMBAT_FIXTURES,regionalCombatFixture} from '../src/core/regional-combat-fixtures';
import {COLLECTIBLES} from '../src/content/collectibles';
import {COMPANION_RARITY_CONFIG,combatCompanionDef} from '../src/content/combat-companions';
import {equipCombatCompanion,unlockCombatCompanion} from '../src/core/combat-companions';
import {totalXpAtLevel} from '../src/core/progression';
import type {GameState} from '../src/core/types';

function cappedLateGameBonuses(input:GameState):GameState{
 let state=unlockCombatCompanion(input,'UNIT_007',0),def=combatCompanionDef('UNIT_007')!;
 state=equipCombatCompanion(state,'UNIT_007');
 const progress=state.account.combatCompanionProgress!.UNIT_007;
 const byKind=(kind:'pet'|'background'|'border')=>COLLECTIBLES.filter(row=>row.kind===kind).map(row=>row.id);
 const selected=(kind:'pet'|'background'|'border')=>COLLECTIBLES.find(row=>row.kind===kind&&row.target==='attack')?.id;
 const faithXp=totalXpAtLevel(100),maxLevel=COMPANION_RARITY_CONFIG[def.rarity].maxLevel;
 return {...state,
  skills:state.skills.map(skill=>skill.skillId==='faith'?{...skill,level:100,xp:faithXp}:skill),
  character:{...state.character!,ownedBoostIds:['boost:combat_focus'],faith:{xp:faithXp,selectedBlessingId:'DAWN_COVENANT',favoriteBlessingIds:state.character!.faith?.favoriteBlessingIds??[],hideWeakerBlessings:state.character!.faith?.hideWeakerBlessings??true},selectedCosmeticPetId:selected('pet'),profileBackgroundId:selected('background'),profileBorderId:selected('border')},
  account:{...state.account,unlockedCosmeticPetIds:byKind('pet'),unlockedProfileBackgroundIds:byKind('background'),unlockedProfileBorderIds:byKind('border'),companionMasteryXp:1_000_000_000,
   combatCompanionProgress:{...state.account.combatCompanionProgress,UNIT_007:{...progress,level:maxLevel,xp:Number.MAX_SAFE_INTEGER,ascensionTier:3,bondLevel:10,bondXp:Number.MAX_SAFE_INTEGER,bondTraitUnlocked:true,mastered:true}}},
 };
}

for(const def of REGIONAL_COMBAT_FIXTURES){
 const under=combatSustainProjection(regionalCombatFixture(def,'underprepared'),def.monsterId)!;
 const prepared=combatSustainProjection(regionalCombatFixture(def,'prepared'),def.monsterId)!;
 const optimized=combatSustainProjection(regionalCombatFixture(def,'optimized'),def.monsterId)!;
 const target=REGIONAL_FOOD_SUSTAIN_TARGETS[def.regionName];
 assert.ok(target,def.regionName+' must have a sustain target');
 assert.ok(Number.isFinite(prepared.foodPerHour)&&prepared.killsPerHour>0);
 assert.ok(prepared.foodPerHour>=target.foodPerHourMin&&prepared.foodPerHour<=target.foodPerHourMax,def.regionName+' prepared local-food sustain is outside its authored band: '+prepared.foodPerHour.toFixed(2)+'/hr');
 // Better preparation should not materially worsen sustain.
 assert.ok(optimized.foodPerHour<=prepared.foodPerHour*1.15+0.25,def.regionName+' optimized sustain regressed');
 // Underprepared farming should not be substantially cheaper than prepared farming.
 assert.ok(under.foodPerHour+0.5>=prepared.foodPerHour*.65,def.regionName+' underprepared build is implausibly efficient');
 // Greenfields may be food-neutral; established regions should carry positive pressure before healing/recovery.
 if(def.regionName!=='Greenfields')assert.ok(prepared.damagePerKill>prepared.recoveryPerKill||prepared.foodPerHour>0,def.regionName+' has no meaningful sustain pressure');
}
for(const def of REGIONAL_COMBAT_FIXTURES.filter(row=>row.regionName==='Frostmarch'||row.regionName==='Ashlands')){
 const prepared=combatSustainProjection(regionalCombatFixture(def,'prepared'),def.monsterId)!;
 const capped=combatSustainProjection(cappedLateGameBonuses(regionalCombatFixture(def,'prepared')),def.monsterId)!;
 const target=REGIONAL_FOOD_SUSTAIN_TARGETS[def.regionName];
 assert.ok(capped.killsPerHour>prepared.killsPerHour,def.regionName+' capped bonuses should provide visible progression');
 assert.ok(capped.killsPerHour<=prepared.killsPerHour*1.35,def.regionName+' capped pets/buffs must not explode the late-region kill rate');
 assert.ok(capped.foodPerHour>=target.foodPerHourMin*.45,def.regionName+' capped pets/buffs must not erase late-region provisioning pressure');
}
console.log('PASS prepared/optimized/underprepared regional combat sustain matrix');
