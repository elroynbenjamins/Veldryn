import {MONSTERS} from '../content/monsters';
import {enemyFamilyForMonster} from '../content/enemy-families';
import {enemyFamilyMastery,recordEnemyFamilyMastery} from './enemy-family-mastery';
import {masteryRewardBonuses} from './mastery-rewards';
import type {GameState} from './types';
/** 30 progressively harder ranks, finishing at exactly 1,500 kills.
 * Rank 1 takes 20 kills; each successive rank gets harder until the final
 * rank takes 80 kills. Old kill counts are preserved without doubling them.
 */
export const MONSTER_MASTERY_MAX_RANK=30;
export const MONSTER_MASTERY_MAX_KILLS=1_500;
export function monsterMasteryKillsForRank(rank:number):number{
 const r=Number.isFinite(rank)?Math.max(0,Math.min(MONSTER_MASTERY_MAX_RANK,Math.floor(rank))):0;
 return Math.round(20*r+900*r*(r-1)/(30*29));
}
export function monsterMasteryRankFromKills(kills:number):number{
 const points=Number.isFinite(kills)?Math.max(0,Math.floor(kills)):0;
 let rank=0;
 while(rank<MONSTER_MASTERY_MAX_RANK&&points>=monsterMasteryKillsForRank(rank+1))rank++;
 return rank;
}
export function normalizeMonsterMastery(raw:unknown):Record<string,number>{
 const input=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw as Record<string,unknown>:{};
 return Object.fromEntries(MONSTERS.filter(m=>!m.boss).flatMap(m=>{
  const n=input[m.id];
  return typeof n==='number'&&Number.isFinite(n)&&Number.isSafeInteger(n)&&n>0
   ?[[m.id,Math.min(MONSTER_MASTERY_MAX_KILLS,n)]]:[];
 }));
}
export function monsterMastery(state:GameState,id:string){
 const monster=MONSTERS.find(m=>m.id===id);
 const points=monster&&!monster.boss?normalizeMonsterMastery(state.character?.monsterMasteryPoints)[id]??0:0;
 const rank=monsterMasteryRankFromKills(points);
 const reward=masteryRewardBonuses(rank);
 return {points,rank,
  nextRankPoints:monsterMasteryKillsForRank(Math.min(MONSTER_MASTERY_MAX_RANK,rank+1)),
  ...reward,
  dropKnowledge:rank>=10,eliteKnowledge:rank>=20,badgeUnlocked:rank>=25};
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
 const points=normalizeMonsterMastery(state.character.monsterMasteryPoints);points[id]=Math.min(MONSTER_MASTERY_MAX_KILLS,(points[id]??0)+kills);
 // The family's progress is independent: it can keep advancing even when
 // the species has already capped at 1,500 kills.
 const next=recordEnemyFamilyMastery({...state,character:{...state.character,monsterMasteryPoints:points}},id,kills);
 const counters={...next.account.companionUnlockProgress};
 // Companion requirements are permanent achievements. Never revoke a
 // previously reached Rank-20 companion unlock after the curve rebalance.
 for(const [target,n] of Object.entries(points))
  counters[target]=Math.max(counters[target]??0,monsterMasteryRankFromKills(n));
 const rank20Count=MONSTERS.filter(m=>!m.boss&&monsterMasteryRankFromKills(points[m.id]??0)>=20).length;
 counters.ASTERFALL_MASTERY_20_ALL=Math.max(counters.ASTERFALL_MASTERY_20_ALL??0,rank20Count);
 return {...next,account:{...next.account,companionUnlockProgress:counters}};
}
