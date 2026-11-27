import {CLASSES} from '../src/content/classes';
import {MONSTERS,ADVANCED_REGION_MONSTER_MULTIPLIER} from '../src/content/monsters';
import {NOVICE_RECIPES} from '../src/content/novice-sets';
import {EQUIPMENT_ITEMS_V33} from '../src/content/equipment-items-v33';
import {V33_EQUIPMENT_RECIPES,TIER_CHARACTER_LEVEL_FLOOR,T2_T4_EQUIPMENT_CRAFT_XP_MULTIPLIER,T2_ADDITIONAL_EQUIPMENT_CRAFT_XP_MULTIPLIER,T3_T4_ADDITIONAL_EQUIPMENT_CRAFT_XP_MULTIPLIER} from '../src/content/equipment-recipes-v33';
import {RECIPES} from '../src/content/skills';
import {combatSustainProjection,effectiveStats,startCombat,previewActivityReward} from '../src/core/game';
import {REGIONAL_COMBAT_FIXTURES,regionalCombatFixture} from '../src/core/regional-combat-fixtures';
import {characterTotalXpAtLevel} from '../src/core/progression';
import type {GameState} from '../src/core/types';

const check=(condition:unknown,message:string)=>{if(!condition)throw new Error(message);};
const near=(actual:number,expected:number,message:string)=>check(actual===expected,`${message}: expected ${expected}, got ${actual}`);
const regions=new Set(["King's Road",'Sunscar','Frostmarch','Ashlands']);
const baselines=[
  {id:'MOSS_RAT',zone:'Greenfields',hp:28,attack:5,defense:2,seconds:7},
  {id:'LANTERN_WRETCH',zone:"King's Road",hp:365,attack:35,defense:19,seconds:24},
  {id:'FALLEN_KNIGHT',zone:"King's Road",hp:180000,attack:68,defense:36,seconds:75},
  {id:'SUNSCAR_SCORPION',zone:'Sunscar',hp:625,attack:51,defense:32,seconds:32},
  {id:'FROSTWOLF',zone:'Frostmarch',hp:1390,attack:97,defense:63,seconds:45},
  {id:'BLACKGLASS_MIRELING',zone:'Ashlands',hp:2480,attack:154,defense:96,seconds:63},
];
near(ADVANCED_REGION_MONSTER_MULTIPLIER,1.20,'late-region target multiplier');
for(const base of baselines){
  const actual=MONSTERS.find(monster=>monster.id===base.id);
  check(actual&&actual.zone===base.zone,`${base.id} exists in expected region`);
  const multiplier=regions.has(base.zone)?1.2:1;
  near(actual!.hp,Math.ceil(base.hp*1.07*multiplier),base.id+' HP');
  near(actual!.attack,Math.ceil(base.attack*1.07*multiplier),base.id+' attack');
  near(actual!.defense,Math.ceil(base.defense*1.07*multiplier),base.id+' defense');
  near(actual!.secondsPerKill,Math.ceil(base.seconds*1.95*multiplier),base.id+' idle kill cycle');
}
for(const monster of MONSTERS.filter(m=>regions.has(m.zone)))
  check(monster.hp>0&&monster.attack>0&&monster.defense>0,'scaled late monster '+monster.id);

const slotXpWeight:Record<string,number>={helmet:.85,chest:1.2,gloves:.7,legs:1,boots:.75,weapon:1.35,offhand:1.15,cape:.85,amulet:.65,ring:.55};
const itemById=new Map(EQUIPMENT_ITEMS_V33.map(item=>[item.id,item]));
const baseXpByTier:Record<string,number>={T1:165,T2:290,T3:450,T4:700};
near(T2_ADDITIONAL_EQUIPMENT_CRAFT_XP_MULTIPLIER,1.20,'T2 additional XP multiplier');
near(T3_T4_ADDITIONAL_EQUIPMENT_CRAFT_XP_MULTIPLIER,1.20,'T3/T4 additional XP multiplier');
for(const recipe of V33_EQUIPMENT_RECIPES.filter(r=>r.v33EquipmentTier in baseXpByTier)){
  check(recipe.skillId==='smithing'||recipe.skillId==='tailoring',recipe.id+' supports both profession routes');
  const slot=itemById.get(recipe.output.itemId)?.slot;
  check(!!slot,recipe.id+' has an equipment slot');
  const tier=recipe.v33EquipmentTier;
  const tierBaseXp=Math.max(1,Math.round(baseXpByTier[tier]*slotXpWeight[slot!]))
    +(['T3','T4'].includes(tier)?20:0);
  const existingXp=['T2','T3','T4'].includes(tier)?Math.round(tierBaseXp*T2_T4_EQUIPMENT_CRAFT_XP_MULTIPLIER):tierBaseXp;
  const expectedXp=tier==='T2'?Math.round(existingXp*T2_ADDITIONAL_EQUIPMENT_CRAFT_XP_MULTIPLIER)
    :['T3','T4'].includes(tier)?Math.round(existingXp*T3_T4_ADDITIONAL_EQUIPMENT_CRAFT_XP_MULTIPLIER):existingXp;
  near(recipe.xp,expectedXp+5,recipe.id+' tier-specific crafting XP');
  near(RECIPES.find(r=>r.id===recipe.id)!.xp,expectedXp+5,recipe.id+' skill recipe XP');
}
check(NOVICE_RECIPES.every(r=>r.xp>=50),'novice Smithing/Tailoring crafts award boosted XP');
near(RECIPES.find(r=>r.id==='SMELT_COPPER_INGOT')!.xp,135,'starter Smithing training XP');
near(RECIPES.find(r=>r.id==='SMELT_ASTER_IRON_INGOT')!.xp,195,'intermediate Smithing training XP');
for(const fixture of REGIONAL_COMBAT_FIXTURES)
  check((TIER_CHARACTER_LEVEL_FLOOR[fixture.tier]??101)<=fixture.level,
    fixture.regionName+' fixture must use obtainable gear');

// Fix the character level when comparing T1 and T2, so gear—not levels—
// determines the combat efficiency difference. Neither build has gems.
function atLevel(state:GameState,level:number):GameState{
  const updated={...state,character:{...state.character!,level,xp:characterTotalXpAtLevel(level)}};
  updated.character.currentHp=effectiveStats(updated).hp;
  return updated;
}
function withFood(state:GameState,monsterId:string){
  return {...state,unlockedMonsterIds:[...new Set([...state.unlockedMonsterIds,monsterId])],
    inventory:{...state.inventory,stacks:[...state.inventory.stacks.filter(s=>s.itemId!=='ROASTED_CROWN_CARP'),{itemId:'ROASTED_CROWN_CARP',quantity:5000}]}};
}
const kingsRoad=REGIONAL_COMBAT_FIXTURES.find(f=>f.regionId==='KINGS_ROAD')!;
for(const classDef of CLASSES){
  const t1=atLevel(regionalCombatFixture(kingsRoad,'underprepared',classDef.id),25);
  const t2=atLevel(regionalCombatFixture(kingsRoad,'prepared',classDef.id),25);
  const t1Gear=Object.values(t1.character!.equipment).filter(id=>/^T1P_/.test(id??''));
  const t2Gear=Object.values(t2.character!.equipment).filter(id=>/^T2P_/.test(id??''));
  const mixed={...t1,character:{...t1.character!,equipment:{...t1.character!.equipment,weapon:t2.character!.equipment.weapon}}};
  check(t1Gear.length>=5&&t2Gear.length>=5,classDef.id+' must have real T1/T2 gear');
  check(!t1.character!.gearEnhancements&&!t2.character!.gearEnhancements,classDef.id+' test builds are unenhanced');
  check(effectiveStats(t2).power>effectiveStats(t1).power,classDef.id+' T2 improves power');
  for(const monsterId of ['LANTERN_WRETCH','OATHGLASS_REVENANT']){
    const t1Projection=combatSustainProjection(t1,monsterId)!;
    const t2Projection=combatSustainProjection(t2,monsterId)!;
    const mixedProjection=combatSustainProjection(mixed,monsterId)!;
    check(t2Projection.killsPerHour>mixedProjection.killsPerHour,classDef.id+' one T2 item must not bypass tier readiness');
    check(t2Projection.killsPerHour>t1Projection.killsPerHour,classDef.id+' '+monsterId+' T2 must farm faster');
    const hour=3_600_000,now=1_000_000;
    const t1Reward=previewActivityReward(startCombat(withFood(t1,monsterId),monsterId,now),now+hour);
    const t2Reward=previewActivityReward(startCombat(withFood(t2,monsterId),monsterId,now),now+hour);
    check(t2Reward.kills>t1Reward.kills,classDef.id+' '+monsterId+' T2 must win more sustained encounters');
  }
  const upgraded={...t2,character:{...t2.character!,
    gearEnhancements:Object.fromEntries(t2Gear.map(id=>[id!,{rank:2,failures:0,gemIds:[]}]))}};
  check(effectiveStats(upgraded).power>effectiveStats(t2).power,classDef.id+' enhancements must raise combat power');
}
console.log('PASS late-region +20% monster strength and all nine class T1/T2 equipment checks');
