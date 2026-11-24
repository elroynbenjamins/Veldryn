/** Hidden Exploration 2.0 review. No live command, wallet, XP or unlock mutation. */
import {EXPLORATION_ROUTES,explorationGatheringSpeedBonus,explorationScoutingSpeedMultiplier} from '../content/exploration';
import {REGIONAL_AREAS} from '../content/regional-areas';
import {WORLD_ZONES,worldZoneInDevelopment} from '../content/world-map';
import {companionServerDefinition} from '../../../../backend/src/server/companions/content';
import {busyCompanionIds,rolloverCompanionAssignmentStatuses} from '../../../../backend/src/server/companions/assignments';
import type {CompanionAssignment,OwnedCompanionSnapshot} from '../../../../backend/src/server/companions/domain';

export const EXPLORATION_2_RELEASED=false as const;
export const SCOUT_POLICY_VERSION='exploration-2-review-v1';
export type ScoutKind='route'|'practice'|'survey';
export const SCOUT_TRAINING_MINUTES=[5,15,30,60,120,240,480] as const;
export type ScoutTrainingMinutes=typeof SCOUT_TRAINING_MINUTES[number];
export function scoutingTrainingMinutes(kind:ScoutKind,minutes?:number){
 if(kind==='route'){if(minutes!==undefined)throw Error('invalid_duration');return undefined;}
 const value=minutes??(kind==='practice'?5:120);
 if(!(SCOUT_TRAINING_MINUTES as readonly number[]).includes(value))throw Error('invalid_duration');
 // Short practice remains free, including overnight guide training; survey requires a companion.
 return value as ScoutTrainingMinutes;
}
export type ScoutRoute={id:string;legacyId:string;zoneId:string;name:string;areaId?:string;requiredExplorationLevel:number;legacyCharacterLevel:number;prerequisite?:string;targetRegion?:string;monsterId?:string;seconds:number;xp:number;released:boolean};
export const SCOUT_ROUTES:readonly ScoutRoute[]=[...EXPLORATION_ROUTES.map(r=>({
 id:'scout2:'+r.id,legacyId:r.id,zoneId:r.zoneId,name:r.name,areaId:r.areaId??(r.id==='SCOUT_FROSTMARCH'?'ZONE_011':undefined),requiredExplorationLevel:r.requiredExplorationLevel,legacyCharacterLevel:r.requiredLevel,
 prerequisite:r.prerequisiteRouteId??({SCOUT_SILVERBROOK:'SCOUT_GREENFIELDS',SCOUT_IRONWOOD:'SCOUT_SILVERBROOK',SCOUT_OLD_MINES:'SCOUT_IRONWOOD',SCOUT_KINGS_ROAD:'SCOUT_OLD_MINES',SCOUT_SUNSCAR:'SCOUT_KINGS_ROAD',SCOUT_FROSTMARCH:'SCOUT_SUNSCAR'} as Record<string,string>)[r.id],
 targetRegion:r.unlockZoneId,monsterId:r.unlockMonsterId,seconds:r.seconds,xp:r.xp,
 released:WORLD_ZONES.some(z=>z.id===r.zoneId&&!worldZoneInDevelopment(z))
})),
 ...([
  {legacyId:'SCOUT2_FROST_WHITEPINE',areaId:'ZONE_012',prerequisite:'SCOUT_FROSTMARCH',requiredExplorationLevel:13,seconds:252,xp:530},
  {legacyId:'SCOUT2_FROST_SHIVERLAKE',areaId:'ZONE_013',prerequisite:'SCOUT2_FROST_WHITEPINE',requiredExplorationLevel:14,seconds:264,xp:590},
  {legacyId:'SCOUT2_FROST_WYRMSPINE',areaId:'ZONE_015',prerequisite:'SCOUT2_FROST_SHIVERLAKE',requiredExplorationLevel:15,seconds:276,xp:650},
 ] as const).map(r=>{
  const area=REGIONAL_AREAS.find(a=>a.regionId==='FROSTMARCH'&&a.id===r.areaId)!;
  return {...r,id:'scout2:'+r.legacyId,zoneId:area.regionId,name:'Survey '+area.name,legacyCharacterLevel:area.minLevel,released:true};
 })
];
export type ScoutState={accountId:string;characterId:string;explorationLevel:number;explorationXp:number;discoveredRouteIds:readonly string[];visitedZoneIds:readonly string[];retainedPrerequisiteRouteIds?:readonly string[]};
export type ScoutReceipt={accountId:string;characterId:string;requestId:string;routeId:string;kind:ScoutKind;companionIds:readonly string[];loanedGuide:boolean;trainingMinutes?:ScoutTrainingMinutes;startedAt:number;endsAt:number;xp:number;policyVersion:string;status:'active'|'claimed';discovery:boolean};
export type ScoutCampAssignment={accountId:string;characterId:string;assignmentId:string;missionId:string;companionIds:readonly string[];endsAt:number;status:'active'|'claimed';explorationXp:number};
export type ScoutAuthority={owned:Record<string,OwnedCompanionSnapshot>;legacyAssignments:CompanionAssignment[];campAssignments?:readonly ScoutCampAssignment[];equipped:ReadonlySet<string>;trialLocked:ReadonlySet<string>;unavailable:ReadonlySet<string>};
const fail=(why:string):never=>{throw Error(why)};
const regionOrigin=(zone:string)=>zone==='SUNSCAR'?'REG_SUNSCAR':zone==='FROSTMARCH'?'REG_FROSTMARCH':'REG_001';
/** Historical progress is never reset. Discoveries are evidence, not grants to unreleased travel or combat. */
export function scoutingMigrationPreview(state:ScoutState){
 return {explorationXp:state.explorationXp,explorationLevel:state.explorationLevel,
  discoveredRouteIds:[...new Set(state.discoveredRouteIds)],visitedZoneIds:[...new Set(state.visitedZoneIds)],retainedPrerequisiteRouteIds:[...new Set(state.retainedPrerequisiteRouteIds??[])],
  gatheringBonus:explorationGatheringSpeedBonus(state.explorationLevel),scoutingSpeed:explorationScoutingSpeedMultiplier(state.explorationLevel)};
}
/** Previously accessible routes may satisfy prerequisites without inventing completed discoveries. */
export const scoutingPrerequisiteMet=(state:ScoutState,id:string)=>state.discoveredRouteIds.includes(id)||(state.retainedPrerequisiteRouteIds??[]).includes(id);
export function scoutingAvailability(state:ScoutState,route:ScoutRoute,kind:ScoutKind){
 if(!route.released)return 'unreleased';
 if(state.explorationLevel<route.requiredExplorationLevel)return 'exploration_level';
 const known=state.discoveredRouteIds.includes(route.legacyId);
 if(kind==='route'&&known)return 'already_discovered';
 if(kind==='practice'&&!scoutingPrerequisiteMet(state,route.legacyId))return 'discover_first';
 if(kind==='survey'&&!known)return 'discover_first';
 if(!known&&route.prerequisite&&!scoutingPrerequisiteMet(state,route.prerequisite))return 'prerequisite';
 // Frontier route discovery may be performed remotely once the route chain opens.
 // Independent gathering/crafting access and combat story gates are separate policy.
 return 'available';
}
/** Candidate affinity identity: every affinity has a niche; no rarity gate. */
export function scoutingPreferredAffinities(route:ScoutRoute):readonly string[]{
 if(route.zoneId==='SUNSCAR')return ['primal','radiant'];
 if(route.zoneId==='FROSTMARCH')return ['arcane','construct'];
 if(route.zoneId==='OLD_MINES')return ['construct','umbral'];
 if(route.zoneId==='KINGS_ROAD')return ['radiant','umbral'];
 if(route.zoneId==='SILVERBROOK')return ['arcane','primal'];
 return ['wild','primal'];
}
export function scoutingTeamBreakdown(route:ScoutRoute,ids:readonly string[],authority:ScoutAuthority){
 if(ids.length>3||new Set(ids).size!==ids.length)return fail('invalid_team');
 const affinityList=scoutingPreferredAffinities(route);
 const scouts=ids.map(id=>{const owned=authority.owned[id],d=companionServerDefinition(id);if(!owned||!d)return fail('not_owned');
  return {id,levelBonus:Math.min(.04,Math.max(0,owned.level)*.001),bondBonus:Math.min(.02,Math.max(0,owned.bondLevel)*.002),originBonus:d.originId===regionOrigin(route.zoneId)?.04:0,affinityBonus:affinityList.includes(d.affinity)?.03:0};});
 const raw=scouts.reduce((sum,s)=>sum+s.levelBonus+s.bondBonus+s.originBonus+s.affinityBonus,0);
 return {scouts,raw,total:Math.min(.20,raw),cap:.20,preferredAffinities:affinityList};
}
export function scoutingTeamBonus(route:ScoutRoute,ids:readonly string[],authority:ScoutAuthority){
 return scoutingTeamBreakdown(route,ids,authority).total;
}
/** Immutable account-scoped reservation. Production needs transactional custody
 * shared with existing expeditions/trials/equip, and a trusted server clock. */
export function reserveScout(input:{state:ScoutState;authority:ScoutAuthority;receipts:readonly ScoutReceipt[];routeId:string;kind:ScoutKind;companionIds:readonly string[];requestId:string;now:number;trainingMinutes?:ScoutTrainingMinutes}):ScoutReceipt{
 const {state,authority,receipts,routeId,kind,companionIds,requestId,now}=input;
 if(!state.accountId||!state.characterId||!Number.isSafeInteger(now)||now<0||!/^[A-Za-z0-9_-]{8,128}$/.test(requestId)||!['route','practice','survey'].includes(kind))return fail('invalid_request');
 const minutes=scoutingTrainingMinutes(kind,input.trainingMinutes);
 const previous=receipts.find(r=>r.accountId===state.accountId&&r.requestId===requestId);
 if(previous){if(previous.characterId!==state.characterId||previous.routeId!==routeId||previous.kind!==kind||scoutingTrainingMinutes(previous.kind,previous.trainingMinutes)!==minutes||JSON.stringify(previous.companionIds)!==JSON.stringify(companionIds))return fail('nonce_conflict');return previous;}
 if(receipts.some(r=>r.accountId===state.accountId&&r.status==='active')||(authority.campAssignments??[]).some(r=>r.accountId===state.accountId&&r.status==='active'&&r.explorationXp>0))return fail('scout_slot_busy');
 const route=SCOUT_ROUTES.find(r=>r.id===routeId);if(!route)return fail('unknown_route');
 const available=scoutingAvailability(state,route,kind);if(available!=='available')return fail(available);
 if(companionIds.length>3||new Set(companionIds).size!==companionIds.length)return fail('invalid_team');
 // Loaned non-collectible guide means basic discovery never requires a rare companion or paid slot.
 if(kind==='survey'&&companionIds.length===0)return fail('companion_required');
 const busy=busyCompanionIds(rolloverCompanionAssignmentStatuses(authority.legacyAssignments,now));
 for(const a of authority.campAssignments??[])if(a.accountId===state.accountId&&a.status==='active'&&a.endsAt>now)for(const id of a.companionIds)busy.add(id);
 for(const id of companionIds){
  if(!authority.owned[id]||!companionServerDefinition(id))return fail('not_owned');
  if(busy.has(id)||authority.equipped.has(id)||authority.trialLocked.has(id)||authority.unavailable.has(id))return fail('companion_unavailable');
 }
 const bonus=scoutingTeamBonus(route,companionIds,authority),loanedGuide=companionIds.length===0;
 const baseMs=kind==='route'?route.seconds*1000:minutes!*60000;
 const duration=Math.max(30000,Math.round(baseMs*(loanedGuide?1.25:1)/(explorationScoutingSpeedMultiplier(state.explorationLevel)*(1+bonus))));
 // Survey XP uses the authored route rate, capped at one XP-earning team/account.
 // Parallel training economy and optional material payouts require calibration.
 const xp=kind==='route'?route.xp:Math.floor(route.xp/route.seconds*minutes!*60);
 return {accountId:state.accountId,characterId:state.characterId,requestId,routeId,kind,companionIds:[...companionIds],loanedGuide,trainingMinutes:minutes,startedAt:now,endsAt:now+duration,xp,policyVersion:SCOUT_POLICY_VERSION,status:'active',discovery:kind==='route'};
}
export function scoutClaimPreview(receipt:ScoutReceipt,state:ScoutState,now:number){
 if(receipt.accountId!==state.accountId||receipt.characterId!==state.characterId)return fail('owner_mismatch');
 if(receipt.status==='claimed')return fail('already_claimed');
 if(receipt.policyVersion!==SCOUT_POLICY_VERSION||!Number.isSafeInteger(now)||now<receipt.endsAt)return fail('not_ready');
 const route=SCOUT_ROUTES.find(r=>r.id===receipt.routeId);if(!route?.released)return fail('route_unavailable');
 const newlyDiscovered=receipt.discovery&&!state.discoveredRouteIds.includes(route.legacyId);
 return {receipt:{...receipt,status:'claimed' as const},explorationXp:receipt.discovery&&!newlyDiscovered?0:receipt.xp,newDiscovery:newlyDiscovered?route.legacyId:null,
  discoveredRouteIds:[...new Set([...state.discoveredRouteIds,...(newlyDiscovered?[route.legacyId]:[])])],
  // Deliberately no travel, monster, resource, companion or wallet grant.
  travelUnlocked:false as const,rewardsGranted:false as const,releaseEnabled:EXPLORATION_2_RELEASED};
}
