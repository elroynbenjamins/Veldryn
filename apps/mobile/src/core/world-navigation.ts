import {MONSTERS,MonsterDef} from '../content/monsters';
import {WORLD_ZONES,worldZoneInDevelopment} from '../content/world-map';
import {GATHERING} from '../content/skills';
import {HERB_NODES} from '../content/herbalism';
import {GameState} from './types';

export function nextRegionUnlock(level:number){
  return WORLD_ZONES.filter(zone=>!worldZoneInDevelopment(zone)&&zone.minLevel>level).sort((a,b)=>a.minLevel-b.minLevel)[0];
}
export function regionEncounters(state:GameState,zoneName:string,query:string,availableOnly:boolean){
  const search=query.trim().toLowerCase();
  return MONSTERS.filter(monster=>monster.zone===zoneName&&monster.name.toLowerCase().includes(search)&&(!availableOnly||encounterUnlocked(state,monster)));
}
export function encounterUnlocked(state:GameState,monster:MonsterDef){
  const region=WORLD_ZONES.find(zone=>zone.name===monster.zone);
  if(worldZoneInDevelopment(region??WORLD_ZONES[0]))return false;
  if(!state.character||state.character.level<(region?.minLevel??1))return false;
  if(monster.boss)return state.character.level>=monster.unlockLevel&&state.quests.find(q=>q.questId==='QST_014')?.status!=='locked';
  return state.unlockedMonsterIds.includes(monster.id);
}
export interface RegionActivitySummary{
  regionId:string;
  name:string;
  unlocked:boolean;
  combatReady:number;
  combatTotal:number;
  bossesReady:number;
  bossesTotal:number;
  gatheringReady:number;
  gatheringTotal:number;
  gatheringSkills:string[];
}
export function regionActivitySummary(state:GameState,regionId:string):RegionActivitySummary{
  const region=WORLD_ZONES.find(zone=>zone.id===regionId);
  if(!region)throw new Error('unknown_region');
  const released=!worldZoneInDevelopment(region);
  const unlocked=released&&!!state.character&&state.character.level>=region.minLevel;
  const monsters=MONSTERS.filter(monster=>monster.zone===region.name),regular=monsters.filter(monster=>!monster.boss),bosses=monsters.filter(monster=>monster.boss);
  const gathering=[...GATHERING,...HERB_NODES].filter(activity=>activity.zoneId===region.id);
  const skillLevel=(skillId:string)=>state.skills.find(skill=>skill.skillId===skillId)?.level??1;
  const gatheringReady=gathering.filter(activity=>unlocked&&skillLevel(activity.skillId)>=activity.unlockLevel).length;
  return {
    regionId:region.id,
    name:region.name,
    unlocked,
    combatReady:regular.filter(monster=>encounterUnlocked(state,monster)).length,
    combatTotal:regular.length,
    bossesReady:bosses.filter(monster=>encounterUnlocked(state,monster)).length,
    bossesTotal:bosses.length,
    gatheringReady,
    gatheringTotal:gathering.length,
    gatheringSkills:[...new Set(gathering.map(activity=>activity.skillId))].sort(),
  };
}
export function orderedTravelRegions(state:GameState,currentRegionId:string,goalRegionId?:string){
  const level=state.character?.level??1;
  return WORLD_ZONES.filter(zone=>zone.id!==currentRegionId).sort((a,b)=>{
    const aDevelopment=worldZoneInDevelopment(a),bDevelopment=worldZoneInDevelopment(b);
    if(aDevelopment!==bDevelopment)return Number(aDevelopment)-Number(bDevelopment);
    const goal=Number(b.id===goalRegionId)-Number(a.id===goalRegionId);if(goal)return goal;
    const aUnlocked=!aDevelopment&&level>=a.minLevel,bUnlocked=!bDevelopment&&level>=b.minLevel;
    if(aUnlocked!==bUnlocked)return Number(bUnlocked)-Number(aUnlocked);
    return aUnlocked?b.minLevel-a.minLevel:a.minLevel-b.minLevel;
  });
}
