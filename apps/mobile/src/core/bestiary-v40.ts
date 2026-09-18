import {MONSTERS,type MonsterDef} from '../content/monsters';
import type {GameState} from './types';
import {monsterMastery} from './monster-mastery';

export type BestiaryStatus='unknown'|'discovered'|'defeated';
export interface BestiaryDropProjection{itemId:string;chance:number;min:number;max:number}
export interface BestiaryEntryProjection{
 id:string;name:string;zone:string;level:number;boss:boolean;status:BestiaryStatus;
 masteryPoints:number;masteryTier:number;drops:BestiaryDropProjection[];
}
export interface BestiaryZoneProjection{zone:string;entries:BestiaryEntryProjection[];discovered:number;defeated:number;total:number;completionPercent:number}
export interface BestiaryProjection{entries:BestiaryEntryProjection[];zones:BestiaryZoneProjection[];discovered:number;defeated:number;total:number;completionPercent:number}

function masteryTier(points:number){return points>=500?5:points>=250?4:points>=100?3:points>=35?2:points>=10?1:0}
function statusFor(state:GameState,monster:MonsterDef):BestiaryStatus{
 if(monster.boss)return state.defeatedBossIds.includes(monster.id)?'defeated':state.character&&state.character.level>=monster.unlockLevel?'discovered':'unknown';
 return state.unlockedMonsterIds.includes(monster.id)?'discovered':'unknown';
}
export function bestiaryProjection(state:GameState):BestiaryProjection{
 const entries=MONSTERS.map(monster=>{const points=state.character?.monsterMasteryPoints?.[monster.id]??0,status=statusFor(state,monster);return{id:monster.id,name:monster.name,zone:monster.zone,level:monster.level,boss:!!monster.boss,status,masteryPoints:points,masteryTier:masteryTier(points),drops:status==='unknown'?[]:monster.drops.map(drop=>({...drop}))}});
 const byZone=new Map<string,BestiaryEntryProjection[]>();for(const entry of entries){const list=byZone.get(entry.zone)??[];list.push(entry);byZone.set(entry.zone,list)}
 const zones=[...byZone.entries()].map(([zone,rows])=>{const discovered=rows.filter(row=>row.status!=='unknown').length,defeated=rows.filter(row=>row.status==='defeated'||(!row.boss&&row.masteryPoints>0)).length,total=rows.length;return{zone,entries:rows,discovered,defeated,total,completionPercent:total?Math.round(discovered/total*100):100}});
 const discovered=entries.filter(row=>row.status!=='unknown').length,defeated=entries.filter(row=>row.status==='defeated'||(!row.boss&&row.masteryPoints>0)).length,total=entries.length;
 return {entries,zones,discovered,defeated,total,completionPercent:total?Math.round(discovered/total*100):100};
}
/** Bestiary is a read model over canonical monster/mastery state; it owns no duplicate progress. */
export const BESTIARY_OWNS_PROGRESS=false;
