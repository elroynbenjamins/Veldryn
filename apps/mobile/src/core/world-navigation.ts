import {MONSTERS,MonsterDef} from '../content/monsters';
import {WORLD_ZONES,type WorldZoneDef,worldZoneInDevelopment} from '../content/world-map';
import {GATHERING} from '../content/skills';
import {HERB_NODES} from '../content/herbalism';
import {GameState} from './types';
import {ITEMS} from '../content/items';

export type RegionTravelAvailability='available'|'locked'|'inDevelopment';
export function regionTravelAvailability(state:GameState,zone:WorldZoneDef):RegionTravelAvailability{
  if(worldZoneInDevelopment(zone))return 'inDevelopment';
  return (state.character?.level??1)>=zone.minLevel?'available':'locked';
}
export function nextRegionUnlock(level:number){
  return WORLD_ZONES.filter(zone=>!worldZoneInDevelopment(zone)&&zone.minLevel>level).sort((a,b)=>a.minLevel-b.minLevel)[0];
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
  const unlocked=released&&regionTravelAvailability(state,region)==='available';
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
    const goal=Number(b.id===goalRegionId)-Number(a.id===goalRegionId);if(goal)return goal;
    const order:Record<RegionTravelAvailability,number>={available:0,locked:1,inDevelopment:2};
    const aState=regionTravelAvailability(state,a),bState=regionTravelAvailability(state,b);
    if(aState!==bState)return order[aState]-order[bState];
    return aState==='available'?b.minLevel-a.minLevel:a.minLevel-b.minLevel;
  });
}


export interface RegionTravelPreview{
  enemies:{id:string;name:string;boss:boolean}[];
  drops:{itemId:string;name:string}[];
  activities:string[];
}
export function regionTravelPreview(state:GameState,regionId:string):RegionTravelPreview{
  const region=WORLD_ZONES.find(zone=>zone.id===regionId);
  if(!region)throw new Error('unknown_region');
  const monsters=MONSTERS.filter(monster=>monster.zone===region.name);
  const enemies=monsters.slice().sort((a,b)=>Number(a.boss)-Number(b.boss)||a.level-b.level).slice(0,4).map(monster=>({id:monster.id,name:monster.name,boss:!!monster.boss}));
  const drops=[] as RegionTravelPreview['drops'];
  const seen=new Set<string>();
  for(const monster of monsters){
    for(const drop of monster.drops){
      if(seen.has(drop.itemId))continue;
      const item=ITEMS.find(candidate=>candidate.id===drop.itemId);
      if(!item||item.type==='gear'||item.type==='gem')continue;
      seen.add(drop.itemId);drops.push({itemId:drop.itemId,name:item.name});
      if(drops.length>=6)break;
    }
    if(drops.length>=6)break;
  }
  const summary=regionActivitySummary(state,regionId);
  const activities=['Combat',...summary.gatheringSkills.map(skill=>skill.replace(/_/g,' ').replace(/\b\w/g,letter=>letter.toUpperCase()))];
  return {enemies,drops,activities:[...new Set(activities)]};
}
