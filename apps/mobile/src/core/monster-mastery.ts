import {MONSTERS} from '../content/monsters';
import {enemyFamilyForMonster} from '../content/enemy-families';
import {enemyFamilyMastery,recordEnemyFamilyMastery} from './enemy-family-mastery';
import type {GameState} from './types';
/** The workbook specifies 30 ranks and one point per kill, but no rank curve.
 * This integration uses 25 kills per rank (500 kills for the rank-20 unlock). */
export const MASTERY_POINTS_PER_RANK=25,MONSTER_MASTERY_MAX_RANK=30;
export function normalizeMonsterMastery(raw:unknown):Record<string,number>{
 const input=raw&&typeof raw==='object'?raw as Record<string,unknown>:{};
 return Object.fromEntries(MONSTERS.filter(m=>!m.boss).flatMap(m=>{const n=input[m.id];return typeof n==='number'&&Number.isFinite(n)&&n>0?[[m.id,Math.min(750,Math.floor(n))]]:[];}));
}
export function monsterMastery(state:GameState,id:string){
 const monster=MONSTERS.find(m=>m.id===id);const points=monster&&!monster.boss?normalizeMonsterMastery(state.character?.monsterMasteryPoints)[id]??0:0;
 const rank=Math.min(30,Math.floor(points/MASTERY_POINTS_PER_RANK));
 return {points,rank,nextRankPoints:rank>=30?750:(rank+1)*MASTERY_POINTS_PER_RANK,damageBonus:rank>=30?.02:rank>=5?.01:0,materialBonus:rank>=30?.05:rank>=15?.03:0,dropKnowledge:rank>=10,eliteKnowledge:rank>=20,badgeUnlocked:rank>=25};
}
/** Species + type mastery stack on the same eligible ordinary enemy.
 * Damage multipliers stack multiplicatively; normal material bonuses add,
 * sharing one fractional-material remainder so tiny rewards are never lost.
 */
export function monsterMasteryCombatBonuses(state:GameState,id:string){
 const species=monsterMastery(state,id);
 const familyId=enemyFamilyForMonster(id)?.id;
 const family=familyId?enemyFamilyMastery(state,familyId):undefined;
 return {species,family,familyId,
  damageMultiplier:(1+species.damageBonus)*(1+(family?.damageBonus??0)),
  materialBonus:species.materialBonus+(family?.materialBonus??0)};
}
export function recordMonsterMastery(state:GameState,id:string,kills:number):GameState{
 if(!state.character||!MONSTERS.some(m=>m.id===id&&!m.boss)||!Number.isSafeInteger(kills)||kills<=0)return state;
 const points=normalizeMonsterMastery(state.character.monsterMasteryPoints);points[id]=Math.min(750,(points[id]??0)+kills);
 // The family's progress is independent: it can keep advancing even when
 // the species has already capped at 750 points.
 const next=recordEnemyFamilyMastery({...state,character:{...state.character,monsterMasteryPoints:points}},id,kills);
 const counters={...next.account.companionUnlockProgress};for(const [target,n] of Object.entries(points))counters[target]=Math.floor(n/25);
 counters.ASTERFALL_MASTERY_20_ALL=MONSTERS.filter(m=>!m.boss&&(points[m.id]??0)>=500).length;
 return {...next,account:{...next.account,companionUnlockProgress:counters}};
}
