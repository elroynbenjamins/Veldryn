/** Hidden read model: display only; no command or route registration. */
import {SCOUT_ROUTES,scoutingAvailability,scoutingPrerequisiteMet,type ScoutState,type ScoutAuthority,type ScoutReceipt} from './exploration-scouting-review';
import {SCOUT_OPTIONAL_MISSIONS} from './exploration-scouting-missions-review';
import {scoutingCampOverview} from './exploration-scouting-economy-review';
import {explorationGatheringSpeedBonus,explorationScoutingSpeedMultiplier} from '../content/exploration';
import {explorationDiscoveryCollection} from './exploration-discovery-review';
import type {AccountExploration} from './exploration-account-review';
export const SCOUT_BOARD_RELEASED=false as const;
export function scoutingBoardReview(state:ScoutState,authority:ScoutAuthority,receipts:readonly ScoutReceipt[],pensLevel:number,now:number,account?:AccountExploration,claimedCollectionIds:readonly string[]=[]){
 const camp=scoutingCampOverview(state,authority,receipts,pensLevel,now);
 const routes=SCOUT_ROUTES.filter(r=>r.released).map(r=>{
  const discovered=state.discoveredRouteIds.includes(r.legacyId),retained=!discovered&&scoutingPrerequisiteMet(state,r.legacyId);
  const discovery=scoutingAvailability(state,r,'route'),practice=scoutingAvailability(state,r,'practice');
  return {id:r.id,name:r.name,region:r.zoneId,requiredLevel:r.requiredExplorationLevel,discovered,retained,discovery,practice,baseSeconds:r.seconds,xp:r.xp};
 });
 const missions=SCOUT_OPTIONAL_MISSIONS.map(m=>{
  const r=routes.find(r=>r.id===m.routeId);
  const mapped=r?.discovered===true;
  const requirement=!mapped?'discover_route_first':state.explorationLevel<m.requiredExplorationLevel?'exploration_level':pensLevel<m.minimumPenLevel?'camp_level':camp.free===0?'camp_full':'choose_team';
  return {id:m.missionId,name:m.name,region:r?.region??'',requiredLevel:m.requiredExplorationLevel,durationMs:m.durationMs,minimumCamp:m.minimumPenLevel,requirement,baseGold:m.base.costs.gold,baseEssence:m.base.baseRewards.companionEssence};
 });
 const active=receipts.filter(r=>r.accountId===state.accountId&&r.status==='active').map(r=>({id:r.requestId,name:routes.find(x=>x.id===r.routeId)?.name??r.routeId,remainingMs:Math.max(0,r.endsAt-now),claimable:r.endsAt<=now&&r.characterId===state.characterId,otherCharacter:r.characterId!==state.characterId,kind:'training' as const}));
 const campActive=(authority.campAssignments??[]).filter(a=>a.accountId===state.accountId&&a.status==='active').map(a=>({id:a.assignmentId,name:missions.find(m=>m.id===a.missionId)?.name??a.missionId,remainingMs:Math.max(0,a.endsAt-now),claimable:a.endsAt<=now&&a.characterId===state.characterId,otherCharacter:a.characterId!==state.characterId,kind:'camp' as const}));
 const collection=account?.accountId===state.accountId?explorationDiscoveryCollection(account,claimedCollectionIds):undefined;
 return {collection,released:SCOUT_BOARD_RELEASED,level:state.explorationLevel,xp:state.explorationXp,gatheringBonus:explorationGatheringSpeedBonus(state.explorationLevel),speedBonus:explorationScoutingSpeedMultiplier(state.explorationLevel)-1,camp,routes,missions,active:[...active,...campActive]};
}
export type ScoutingBoardReview=ReturnType<typeof scoutingBoardReview>;
