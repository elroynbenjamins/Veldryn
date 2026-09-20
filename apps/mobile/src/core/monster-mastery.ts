import {MONSTERS} from '../content/monsters';
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
export function recordMonsterMastery(state:GameState,id:string,kills:number,xpMultiplier=1):GameState{
 if(!state.character||!MONSTERS.some(m=>m.id===id&&!m.boss)||!Number.isSafeInteger(kills)||kills<=0)return state;
 const multiplier=Number.isFinite(xpMultiplier)?Math.max(1,xpMultiplier):1;
 const remainderKey=`mastery:${id}`,rawGain=kills*multiplier+(state.rewardRemainders?.[remainderKey]??0),gained=Math.floor(rawGain+1e-9);
 const points=normalizeMonsterMastery(state.character.monsterMasteryPoints);points[id]=Math.min(750,(points[id]??0)+gained);
 const rewardRemainders={...(state.rewardRemainders??{}),[remainderKey]:points[id]>=750?0:Math.max(0,rawGain-gained)};
 const next={...state,rewardRemainders,character:{...state.character,monsterMasteryPoints:points}};
 const counters={...state.account.companionUnlockProgress};for(const [target,n] of Object.entries(points))counters[target]=Math.floor(n/25);
 counters.ASTERFALL_MASTERY_20_ALL=MONSTERS.filter(m=>!m.boss&&(points[m.id]??0)>=500).length;
 return {...next,account:{...next.account,companionUnlockProgress:counters}};
}
