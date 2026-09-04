import {MONSTERS,MonsterDef} from '../content/monsters';
import {WORLD_ZONES} from '../content/world-map';
import {GameState} from './types';

export function nextRegionUnlock(level:number){
  return WORLD_ZONES.filter(zone=>zone.minLevel>level).sort((a,b)=>a.minLevel-b.minLevel)[0];
}
export function regionEncounters(state:GameState,zoneName:string,query:string,availableOnly:boolean){
  const search=query.trim().toLowerCase();
  return MONSTERS.filter(monster=>monster.zone===zoneName&&monster.name.toLowerCase().includes(search)&&(!availableOnly||encounterUnlocked(state,monster)));
}
export function encounterUnlocked(state:GameState,monster:MonsterDef){
  const region=WORLD_ZONES.find(zone=>zone.name===monster.zone);
  if(!state.character||state.character.level<(region?.minLevel??1))return false;
  if(monster.boss)return state.character.level>=monster.unlockLevel&&state.quests.find(q=>q.questId==='QST_014')?.status!=='locked';
  return state.unlockedMonsterIds.includes(monster.id);
}
