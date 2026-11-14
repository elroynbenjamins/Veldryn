import {equipmentSetDef,equippedSetPieceCount} from '../content/equipment-sets';
import {itemDef} from '../content/items';
import {isLiveSixPieceBonus} from './equipment-set-runtime';
import {effectiveStats} from './game';
import {equippedEffectGemBonuses} from './equipment-enhancement';
import type {GameState} from './types';

/** Fully derived from the runtime state on both sides of a potential equip.
 * Values are percentages in percentage points, not item-defined guesses.
 * Early-region 6pc stats are live; T5+ conditional triggers remain pending. */
export function equipmentComparison(state:GameState,projected:GameState){
 const before=effectiveStats(state),after=effectiveStats(projected);
 const effectBefore=equippedEffectGemBonuses(state),effectAfter=equippedEffectGemBonuses(projected);
 const otherStats=[
  {key:'critChance',label:'Crit chance',before:before.critChance,after:after.critChance},
  {key:'critMultiplier',label:'Crit damage multiplier',before:before.critMultiplier,after:after.critMultiplier},
  {key:'accuracy',label:'Accuracy',before:before.accuracy,after:after.accuracy},
  {key:'evasion',label:'Evasion',before:before.evasion,after:after.evasion},
  {key:'haste',label:'Haste',before:before.haste,after:after.haste},
  {key:'armor',label:'Armor bonus',before:before.armor,after:after.armor},
  {key:'ward',label:'Ward',before:before.ward,after:after.ward},
  {key:'tenacity',label:'Tenacity',before:before.tenacity,after:after.tenacity},
  {key:'potency',label:'Potency',before:before.potency,after:after.potency},
  {key:'penetration',label:'Penetration',before:before.penetration,after:after.penetration},
 ] as const;
 const combatEffects=[
  {key:'combat_speed',label:'Combat speed bonus',before:effectBefore.combat_speed,after:effectAfter.combat_speed},
  {key:'boss_power',label:'Boss power bonus',before:effectBefore.boss_power,after:effectAfter.boss_power},
  {key:'damage_reduction',label:'Damage reduction',before:effectBefore.damage_reduction,after:effectAfter.damage_reduction},
  {key:'recovery',label:'Recovery bonus',before:effectBefore.recovery,after:effectAfter.recovery},
 ] as const;
 const affectedSetIds=new Set<string>();
 for(const equipment of [state.character?.equipment,projected.character?.equipment]){
  for(const id of Object.values(equipment??{})){
   if(!id)continue;
   // Equipment item definitions define sets, not the equipped instance rarity.
   const setId=itemDef(id).equipmentSetId;
   if(setId)affectedSetIds.add(setId);
  }
 }
 const sets=[...affectedSetIds].flatMap(id=>{
  const set=equipmentSetDef(id);
  if(!set||!state.character||!projected.character)return [];
  const beforePieces=equippedSetPieceCount(state.character.equipment,set);
  const afterPieces=equippedSetPieceCount(projected.character.equipment,set);
  return [{id:set.id,name:set.name,tier:set.tier,before:beforePieces,after:afterPieces,
   milestones:[2,4,6,8,10].filter(threshold=>(beforePieces>=threshold)!==(afterPieces>=threshold)).map(threshold=>({
    threshold,status:threshold===6&&!isLiveSixPieceBonus(set)?'pending' as const:'active' as const,
    direction:afterPieces>=threshold?'gained' as const:'lost' as const,
   }))}];
 });
 return {before,after,
  secondary:otherStats.filter(row=>Math.abs(row.after-row.before)>1e-9),
  effects:combatEffects.filter(row=>Math.abs(row.after-row.before)>1e-9),
  sets:sets.filter(row=>row.before!==row.after)};
}
