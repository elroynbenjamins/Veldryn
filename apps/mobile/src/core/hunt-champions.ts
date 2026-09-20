import {random01} from './rng';

export const CHAMPION_ENCOUNTER_CHANCE=.006;
export const CHAMPION_DAMAGE_MULTIPLIER=1.45;
export const CHAMPION_BONUS_XP_MULTIPLIER=3;
export const CHAMPION_BONUS_GOLD_MULTIPLIER=4;

export function huntChampionSeed(characterId:string,lastClaimAtMs:number,monsterId:string){
 return `${characterId}:${lastClaimAtMs}:${monsterId}:CHAMPION`;
}
export function isChampionEncounter(characterId:string,lastClaimAtMs:number,monsterId:string,index:number){
 if(index<0||!Number.isSafeInteger(index))return false;
 return random01(huntChampionSeed(characterId,lastClaimAtMs,monsterId),index)<CHAMPION_ENCOUNTER_CHANCE;
}
export function championBonus(baseXp:number,baseGold:number,count:number){
 const n=Math.max(0,Math.floor(count));
 return {
  xp:Math.max(0,Math.floor(baseXp*CHAMPION_BONUS_XP_MULTIPLIER*n)),
  gold:Math.max(0,Math.floor(baseGold*CHAMPION_BONUS_GOLD_MULTIPLIER*n)),
 };
}
