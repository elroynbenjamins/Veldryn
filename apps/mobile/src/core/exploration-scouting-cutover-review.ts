/** Hidden cutover contract. Snapshot pre-2.0 verified character state before
 * any rule changes. Never derive ownership from a client-provided region list.
 * This is a reference adapter only; production persistence and issuance are absent. */
import {WORLD_ZONES,worldZoneInDevelopment,type WorldZoneDef} from '../content/world-map';
import {REGIONAL_AREAS,areaLevelUnlocked,regionalArea} from '../content/regional-areas';
import {MONSTERS} from '../content/monsters';
import {regionTravelAvailability,encounterUnlocked} from './world-navigation';
import type {GameState} from './types';
import {SCOUT_ROUTES,type ScoutState} from './exploration-scouting-review';

export const SCOUT_CUTOVER_RELEASED=false as const;
export const SCOUT_CUTOVER_VERSION='scouting-2-legacy-access-v1';
const ENTRY_ROUTE:Readonly<Record<string,string>>={OLD_MINES:'SCOUT_IRONWOOD',KINGS_ROAD:'SCOUT_OLD_MINES',SUNSCAR:'SCOUT_KINGS_ROAD',FROSTMARCH:'SCOUT_SUNSCAR'};
const releasedRegions=WORLD_ZONES.filter(z=>!worldZoneInDevelopment(z));
const orderedUnique=(ids:readonly string[])=>[...new Set(ids)].sort();
export type LegacyScoutingAccess={version:typeof SCOUT_CUTOVER_VERSION;accountId:string;characterId:string;capturedAtMs:number;
 regionIds:readonly string[];areaIds:readonly string[];regularEncounterIds:readonly string[];
 prerequisiteRouteIds:readonly string[];completedRouteIds:readonly string[];explorationXp:number;explorationLevel:number};
function inheritedPrerequisites(regionIds:readonly string[]){
 const result=new Set<string>();
 for(const region of regionIds){
  let id:string|undefined=ENTRY_ROUTE[region];
  while(id&&!result.has(id)){
   const route=SCOUT_ROUTES.find(r=>r.legacyId===id&&r.released);if(!route)break;
   result.add(id);id=route.prerequisite;
  }
 }
 return orderedUnique([...result]);
}
export function captureLegacyScoutingAccess(accountId:string,state:GameState,capturedAtMs:number):LegacyScoutingAccess{
 if(!accountId||!state.character?.id||!Number.isSafeInteger(capturedAtMs)||capturedAtMs<0)throw Error('invalid_cutover_owner');
 // Never widen access through furthest combat zone, raw unlock flags or other characters.
 const regionIds=releasedRegions.filter(z=>regionTravelAvailability(state,z)==='available').map(z=>z.id);
 const areaIds=REGIONAL_AREAS.filter(a=>regionIds.includes(a.regionId)&&areaLevelUnlocked(a.regionId,a.id,state.character!.level)).map(a=>a.id);
 const regularEncounterIds=MONSTERS.filter(m=>!m.boss&&releasedRegions.some(z=>z.name===m.zone)&&encounterUnlocked(state,m)).map(m=>m.id);
 const skill=state.skills.find(s=>s.skillId==='exploration');
 return {version:SCOUT_CUTOVER_VERSION,accountId,characterId:state.character.id,capturedAtMs,regionIds:orderedUnique(regionIds),areaIds:orderedUnique(areaIds),
  regularEncounterIds:orderedUnique(regularEncounterIds),prerequisiteRouteIds:inheritedPrerequisites(regionIds),
  completedRouteIds:orderedUnique(state.exploredRouteIds??[]),explorationXp:skill?.xp??0,explorationLevel:skill?.level??1};
}
/** Parked character saves must be projected independently; do not inherit
 * active character skills, region, quest, boss, route or monster flags. */
export function captureLegacyScoutingRoster(accountId:string,state:GameState,capturedAtMs:number):LegacyScoutingAccess[]{
 const rows:LegacyScoutingAccess[]=[];
 if(state.character)rows.push(captureLegacyScoutingAccess(accountId,state,capturedAtMs));
 for(const parked of state.otherCharacters??[]){
  if(rows.some(r=>r.characterId===parked.character.id))throw Error('duplicate_character');
  rows.push(captureLegacyScoutingAccess(accountId,{...state,character:parked.character,inventory:parked.inventory,overflow:parked.overflow,activity:parked.activity,skills:parked.skills,quests:parked.quests,currentRegionId:parked.currentRegionId,unlockedMonsterIds:parked.unlockedMonsterIds??[],exploredRouteIds:parked.exploredRouteIds??[],defeatedBossIds:parked.defeatedBossIds??[],otherCharacters:[]},capturedAtMs));
 }
 return rows;
}
function ownedSnapshot(state:Pick<ScoutState,'accountId'|'characterId'>,snapshot:LegacyScoutingAccess|undefined){
 return snapshot?.version===SCOUT_CUTOVER_VERSION&&snapshot.accountId===state.accountId&&snapshot.characterId===state.characterId?snapshot:undefined;
}
/** Apply only a trusted persisted cutover snapshot. Preserve current XP and
 * discoveries (including post-cutover progress); no retroactive XP or rewards. */
export function retainLegacyScoutingProgress(state:ScoutState,snapshot:LegacyScoutingAccess|undefined):ScoutState{
 const s=ownedSnapshot(state,snapshot);
 if(!s)return state;
 return {...state,explorationXp:Math.max(state.explorationXp,s.explorationXp),explorationLevel:Math.max(state.explorationLevel,s.explorationLevel),
  discoveredRouteIds:orderedUnique([...state.discoveredRouteIds,...s.completedRouteIds]),
  retainedPrerequisiteRouteIds:orderedUnique([...(state.retainedPrerequisiteRouteIds??[]),...s.prerequisiteRouteIds])};
}
export function retainedRegionAccess(state:ScoutState,zone:WorldZoneDef,snapshot:LegacyScoutingAccess|undefined,newRulesAllow:boolean){
 if(worldZoneInDevelopment(zone)||!releasedRegions.some(z=>z.id===zone.id))return false;
 return newRulesAllow||ownedSnapshot(state,snapshot)?.regionIds.includes(zone.id)===true;
}
export function retainedAreaAccess(state:ScoutState,regionId:string,areaId:string,snapshot:LegacyScoutingAccess|undefined,newRulesAllow:boolean){
 const area=regionalArea(regionId,areaId);
 if(!area||!releasedRegions.some(z=>z.id===regionId))return false;
 const s=ownedSnapshot(state,snapshot);
 return newRulesAllow||Boolean(s?.regionIds.includes(regionId)&&s.areaIds.includes(area.id));
}
/** Legacy normal hunt access is independent of travel and never grants a boss.
 * New encounters, story bosses and unreleased content still require live rules. */
export function retainedRegularEncounterAccess(state:ScoutState,monsterId:string,snapshot:LegacyScoutingAccess|undefined,newRulesAllow:boolean){
 const monster=MONSTERS.find(m=>m.id===monsterId);
 if(!monster||!releasedRegions.some(z=>z.name===monster.zone))return false;
 return newRulesAllow||(!monster.boss&&ownedSnapshot(state,snapshot)?.regularEncounterIds.includes(monsterId)===true);
}
