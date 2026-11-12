/**
 * Veldryn character-sheet Combat Power calibration — TEST ONLY.
 *
 * Uses the ACTUAL mobile equipment catalog, Forge instance stats, socket bonuses,
 * set effects, character XP mapping, companion normalization and Combat Power
 * rating. This is a controlled equipment-build study, NOT production telemetry
 * and NOT a proof of boss/dungeon victory odds.
 *
 * Re-run after changing any gear, gem, rarity, set or CP formula:
 *   node tools/regional-gear-cp-benchmark.mjs > /tmp/veldryn-regional-cp.csv
 *
 * T6 remains unreleased. This utility never changes release flags or saved data.
 */
import {createCharacter,newGame} from '../apps/mobile/src/core/game';
import {combatPowerRating} from '../apps/mobile/src/core/combat-power';
import {characterTotalXpAtLevel} from '../apps/mobile/src/core/progression';
import {EQUIPMENT_SETS} from '../apps/mobile/src/content/equipment-sets';
import {EQUIPMENT_ITEMS_V33} from '../apps/mobile/src/content/equipment-items-v33';
import {draftCraftedGearInstance} from '../apps/mobile/src/core/crafted-gear-instances';
import {mobileGemItemIdV1,type MobileGemGradeV1} from '../apps/mobile/src/content/gems-v1';
import {equipCombatCompanion,unlockCombatCompanion} from '../apps/mobile/src/core/combat-companions';
import type {ClassId,CraftedGearInstance,GameState,GearSlot} from '../apps/mobile/src/core/types';
import type {ItemRarity} from '../apps/mobile/src/core/item-rarity';

type Tier = 'T1'|'T2'|'T3'|'T4'|'T5'|'T6';
type Path = 'Foundation'|'Alternate';
type Scenario = {
  id:string; pieces:7|10; rarity:ItemRarity; quality:number;
  enhancedPieces:number; enhancementRank:0|2|3; gemCount:number; gemGrade:MobileGemGradeV1;
};

export const CLASS_IDS:readonly ClassId[]=[
 'IRONWARDEN','BASTION','DREADGUARD','WAYFINDER','RAVAGER',
 'HEXWEAVER','KNIFE_DANCER','DAWNKEEPER','STONECALLER',
];
export const PATHS:readonly Path[]=['Foundation','Alternate'];
export const STAGES:readonly {tier:Tier;level:number;region:string;companionLevel:number;ascension:0|1|2;bond:number}[]=[
 {tier:'T1',level:12,region:'Asterfall',companionLevel:5,ascension:0,bond:1},
 {tier:'T2',level:25,region:'Asterfall',companionLevel:10,ascension:0,bond:2},
 {tier:'T3',level:26,region:'Sunscar',companionLevel:12,ascension:1,bond:3},
 {tier:'T3',level:37,region:'Sunscar',companionLevel:12,ascension:1,bond:3},
 {tier:'T4',level:38,region:'Sunscar',companionLevel:15,ascension:1,bond:4},
 {tier:'T4',level:50,region:'Sunscar',companionLevel:15,ascension:1,bond:4},
 {tier:'T5',level:51,region:'Frostmarch',companionLevel:20,ascension:1,bond:5},
 {tier:'T5',level:62,region:'Frostmarch',companionLevel:20,ascension:1,bond:5},
 {tier:'T6',level:63,region:'Frostmarch',companionLevel:25,ascension:2,bond:6},
 {tier:'T6',level:75,region:'Frostmarch',companionLevel:25,ascension:2,bond:6},
];
export const SCENARIOS:readonly Scenario[]=[
 {id:'mixed_7_of_10_common_q40',pieces:7,rarity:'common',quality:40,enhancedPieces:0,enhancementRank:0,gemCount:0,gemGrade:1},
 {id:'full_common_q50_plain',pieces:10,rarity:'common',quality:50,enhancedPieces:0,enhancementRank:0,gemCount:0,gemGrade:1},
 {id:'representative_common_q50',pieces:10,rarity:'common',quality:50,enhancedPieces:4,enhancementRank:2,gemCount:4,gemGrade:2},
 {id:'invested_uncommon_q60',pieces:10,rarity:'uncommon',quality:60,enhancedPieces:6,enhancementRank:2,gemCount:6,gemGrade:2},
 {id:'well_prepared_rare_q70',pieces:10,rarity:'rare',quality:70,enhancedPieces:10,enhancementRank:2,gemCount:8,gemGrade:3},
 {id:'aspirational_epic_q85',pieces:10,rarity:'epic',quality:85,enhancedPieces:10,enhancementRank:3,gemCount:10,gemGrade:4},
];
const SLOT_ORDER:readonly GearSlot[]=['helmet','chest','gloves','legs','boots','weapon','offhand','cape','amulet','ring'];
const GEM_FAMILIES=[
 'stat_might','stat_vitality','stat_iron','stat_ward','stat_precision',
 'stat_keen','stat_swift','stat_savage','stat_piercing','stat_resolute',
] as const;
const ITEMS_BY_ID=new Map(EQUIPMENT_ITEMS_V33.map(item=>[item.id,item]));

function assert(value:unknown,message:string):asserts value {
 if(!value)throw new Error('regional_cp_calibration: '+message);
}
function currentSet(classId:ClassId,tier:Tier,path:Path){
 const set=EQUIPMENT_SETS.find(s=>s.classId===classId&&s.tier===tier&&s.path===path);
 assert(set,`missing set for ${classId} ${tier} ${path}`);
 assert(set.itemIds.length===10,'set should contain exactly 10 items: '+set.id);
 const bySlot=new Map<GearSlot,string>();
 for(const id of set.itemIds){
  const item=ITEMS_BY_ID.get(id);
  assert(item&&item.slot&&item.classRestriction===classId,'invalid equipment item: '+id);
  assert(!bySlot.has(item.slot),'duplicate gear slot for '+set.id);
  bySlot.set(item.slot,id);
 }
 assert(bySlot.size===10,'set is missing equipment slots: '+set.id);
 return bySlot;
}
function legalCompanionId(classId:ClassId,tier:Tier):string {
 const damage=['WAYFINDER','RAVAGER','HEXWEAVER','KNIFE_DANCER'].includes(classId);
 const rare=Number(tier.slice(1))>=5;
 // Characters cannot equip companions matching their own combat role.
 return damage?(rare?'UNIT_005':'UNIT_002'):(rare?'UNIT_004':'UNIT_001');
}
export function makeCharacter(
 classId:ClassId,path:Path,
 stage:typeof STAGES[number],scenario:Scenario
):GameState{
 let state=createCharacter(newGame(0),classId,'Calibrator');
 const character=state.character!;
 const higher=currentSet(classId,stage.tier,path);
 const previousNum=Number(stage.tier.slice(1))-1;
 const previous=previousNum>=1?currentSet(classId,('T'+previousNum) as Tier,path):undefined;
 const equipment:Partial<Record<GearSlot,string>>={};
 const equipmentInstanceIds:Partial<Record<GearSlot,string>>={};
 const instances:CraftedGearInstance[]=[];
 for(let i=0;i<SLOT_ORDER.length;i++){
  const slot=SLOT_ORDER[i];
  const useHigher=i<scenario.pieces;
  const itemId=useHigher?higher.get(slot):previous?.get(slot);
  if(!itemId)continue;
  const item=ITEMS_BY_ID.get(itemId);
  assert(item,'missing catalog item '+itemId);
  assert((item.requiredLevel??1)<=stage.level,'equipment level > fixture level: '+itemId);
  equipment[slot]=itemId;
  // Mixed sets contain prior-tier Common, Q40, unenhanced gear in their last 3 slots.
  const thisRarity=useHigher?scenario.rarity:'common';
  const quality=useHigher?scenario.quality:40;
  const rank=useHigher&&i<scenario.enhancedPieces?scenario.enhancementRank:0;
  const gem=useHigher&&i<scenario.gemCount
    ?mobileGemItemIdV1(GEM_FAMILIES[i],scenario.gemGrade):undefined;
  const instance=draftCraftedGearInstance({
    itemId,ownerCharacterId:character.id,jobId:`calibration:${classId}:${path}:${stage.tier}:${slot}`,
    createdAtMs:0,roll:.5,
  });
  const normalized:CraftedGearInstance={...instance,rarity:thisRarity,quality,
    enhancement:{rank,failures:0,gemIds:gem?[gem]:[],statGemId:gem,statGemRollPercent:gem?100:undefined}};
  instances.push(normalized);
  equipmentInstanceIds[slot]=normalized.id;
 }
 assert(Object.keys(equipment).length===10||(stage.tier==='T1'&&scenario.pieces===7),'equipment slot coverage missing');
 state={...state,character:{...character,level:stage.level,xp:characterTotalXpAtLevel(stage.level),
    equipment,equipmentInstanceIds},
   account:{...state.account,craftedGearInstances:instances}};
 const id=legalCompanionId(classId,stage.tier);
 state=equipCombatCompanion(unlockCombatCompanion(state,id,0),id);
 const old=state.account.combatCompanionProgress?.[id];
 assert(old,'companion progress missing');
 state={...state,account:{...state.account,combatCompanionProgress:{
  ...state.account.combatCompanionProgress,
  [id]:{...old,level:stage.companionLevel,ascensionTier:stage.ascension,bondLevel:stage.bond},
 }}};
 return state;
}
function quantile(sorted:number[],fraction:number):number {
 const offset=(sorted.length-1)*fraction,base=Math.floor(offset),next=Math.min(sorted.length-1,base+1);
 return Math.round(sorted[base]+(sorted[next]-sorted[base])*(offset-base));
}
if(process.env.VELDRYN_REGIONAL_CP_FIXTURES_ONLY!=='1'){
const rows:Record<string,string|number>[]=[];
for(const stage of STAGES){
 for(const scenario of SCENARIOS){
  const results:{power:number;player:number;companion:number;build:number;classId:string;path:string}[]=[];
  for(const classId of CLASS_IDS)for(const path of PATHS){
   const state=makeCharacter(classId,path,stage,scenario);
   const power=combatPowerRating(state);
   assert(power.player+power.companion===power.total,'power split mismatch');
   assert(power.rows.reduce((sum,row)=>sum+row.value,0)===power.total,'power rows fail to reconcile');
   assert(power.total>0,'nonpositive character Combat Power');
   results.push({power:power.total,player:power.player,companion:power.companion,
    build:power.rows.find(row=>row.id==='build')?.value??0,classId,path});
  }
  const powers=results.map(row=>row.power).sort((a,b)=>a-b);
  const avg=(field:'power'|'player'|'companion'|'build')=>
     Math.round(results.reduce((sum,row)=>sum+row[field],0)/results.length);
  rows.push({
   region:stage.region,tier:stage.tier,character_level:stage.level,
   scenario:scenario.id,rarity:scenario.rarity,quality:scenario.quality,
   current_tier_pieces:scenario.pieces,enhanced_pieces:scenario.enhancedPieces,
   enhancement_rank:scenario.enhancementRank,stat_gem_count:scenario.gemCount,
   stat_gem_grade:scenario.gemGrade,companion_level:stage.companionLevel,
   companion_ascension:stage.ascension,companion_bond:stage.bond,
   distinct_classes:CLASS_IDS.length,set_paths:PATHS.length,loadouts:results.length,
   cp_mean:avg('power'),cp_median:quantile(powers,.5),
   cp_min:powers[0],cp_p10:quantile(powers,.1),cp_p90:quantile(powers,.9),
   cp_max:powers[powers.length-1],cp_personal_mean:avg('player'),
   cp_companion_mean:avg('companion'),cp_gear_set_gems_mean:avg('build'),
   tier_released:stage.tier==='T6'?'no':'yes',
  });
 }
}
const columns=Object.keys(rows[0]);
console.log(columns.join(','));
for(const row of rows)console.log(columns.map(col=>String(row[col])).join(','));
console.error(`calibration complete: ${rows.length} cohort rows; ${rows.length*CLASS_IDS.length*PATHS.length} actual mobile Combat Power calls; no gameplay mutations`);

}
