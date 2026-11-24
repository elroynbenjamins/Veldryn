/** Hidden setup/read model. No commands, no navigation registration. */
import {COMBAT_COMPANIONS} from '../content/combat-companions';
import {companionServerDefinition} from '../../../../backend/src/server/companions/content';
import {validateCompanionMissionTeam,rolloverCompanionAssignmentStatuses,busyCompanionIds} from '../../../../backend/src/server/companions/assignments';
import {SCOUT_OPTIONAL_MISSIONS,scoutingMissionQuote} from './exploration-scouting-missions-review';
import {SCOUT_ROUTES,SCOUT_TRAINING_MINUTES,reserveScout,scoutingPreferredAffinities,scoutingTeamBreakdown,type ScoutAuthority,type ScoutReceipt,type ScoutState,type ScoutTrainingMinutes} from './exploration-scouting-review';

export const SCOUT_ASSIGNMENT_UI_RELEASED=false as const;
const regionLabel=(id:string)=>id==='SUNSCAR'?'Sunscar':id==='FROSTMARCH'?'Frostmarch':'Asterfall';

export function scoutingMissionSetupReview(input:{state:ScoutState;authority:ScoutAuthority;receipts:readonly ScoutReceipt[];missionId:string;selectedIds:readonly string[];pensLevel:number;now:number;earnExplorationXp:boolean}){
 const mission=SCOUT_OPTIONAL_MISSIONS.find(m=>m.missionId===input.missionId);if(!mission)throw Error('mission_unavailable');
 const route=SCOUT_ROUTES.find(r=>r.id===mission.routeId);if(!route)throw Error('route_unavailable');
 const legacy=rolloverCompanionAssignmentStatuses(input.authority.legacyAssignments,input.now),busy=busyCompanionIds(legacy);
 for(const r of input.receipts)if(r.accountId===input.state.accountId&&r.status==='active'&&r.endsAt>input.now)for(const id of r.companionIds)busy.add(id);
 for(const r of input.authority.campAssignments??[])if(r.accountId===input.state.accountId&&r.status==='active'&&r.endsAt>input.now)for(const id of r.companionIds)busy.add(id);
 const selected=[...input.selectedIds],preferred=scoutingPreferredAffinities(route);
 const candidates=Object.keys(input.authority.owned).map(id=>{
  const owned=input.authority.owned[id],def=companionServerDefinition(id),art=COMBAT_COMPANIONS.find(c=>c.id===id);
  const unavailable=busy.has(id)||input.authority.equipped.has(id)||input.authority.trialLocked.has(id)||input.authority.unavailable.has(id);
  const single=scoutingTeamBreakdown(route,[id],input.authority).scouts[0];
  return {id,name:art?.name??def?.name??id,level:owned.level,bond:owned.bondLevel,affinity:def?.affinity??'wild',origin:def?.originId??'',selected:selected.includes(id),available:!unavailable,
   preferredAffinity:preferred.includes(def?.affinity??''),regionOrigin:def?.originId===(route.zoneId==='SUNSCAR'?'REG_SUNSCAR':route.zoneId==='FROSTMARCH'?'REG_FROSTMARCH':'REG_001'),
   speedBonus:single.levelBonus+single.bondBonus+single.originBonus+single.affinityBonus};
 }).sort((a,b)=>Number(b.available)-Number(a.available)||Number(b.preferredAffinity)-Number(a.preferredAffinity)||b.speedBonus-a.speedBonus||a.name.localeCompare(b.name));
 const validation=validateCompanionMissionTeam({missionId:mission.missionId,companionIds:selected,owned:input.authority.owned,assignments:legacy,equippedCompanionIds:input.authority.equipped,lockedTrialCompanionIds:input.authority.trialLocked,unavailableCompanionIds:new Set(candidates.filter(c=>!c.available).map(c=>c.id)),expeditionPensLevel:input.pensLevel});
 const quote=scoutingMissionQuote({state:input.state,authority:input.authority,receipts:input.receipts,missionId:mission.missionId,companionIds:selected,pensLevel:input.pensLevel,now:input.now,earnExplorationXp:input.earnExplorationXp});
 const teamBonus=selected.length?scoutingTeamBreakdown(route,selected,input.authority):{total:0,preferredAffinities:preferred,scouts:[] as any[],raw:0,cap:.2};
 return {released:SCOUT_ASSIGNMENT_UI_RELEASED,mission:{id:mission.missionId,name:mission.name,region:regionLabel(route.zoneId),requiredLevel:mission.requiredExplorationLevel,baseDurationMs:mission.durationMs,minimumCamp:mission.minimumPenLevel},
  route:{id:route.id,name:route.name,preferredAffinities:preferred},candidates,selectedIds:selected,teamBonus:teamBonus.total,expectedGrade:validation.ok?validation.grade:undefined,
  ready:quote.ok,blockedReason:quote.ok?undefined:quote.reason,
  preview:quote.ok?{durationMs:quote.durationMs,explorationXp:quote.explorationXp,stamina:quote.stamina,goldCost:quote.costs.gold,materialCosts:quote.costs.materials,goldReward:quote.preview.gold,essence:quote.preview.essence,companionXp:quote.preview.companionXpPerScout,bondXp:quote.preview.bondXpPerScout,bondstoneEligible:quote.preview.bondstoneEligible}:undefined};
}

export function scoutingTrainingSetupReview(input:{state:ScoutState;authority:ScoutAuthority;receipts:readonly ScoutReceipt[];routeId:string;companionIds:readonly string[];kind:'practice'|'survey';now:number}){
 const route=SCOUT_ROUTES.find(r=>r.id===input.routeId);if(!route)throw Error('unknown_route');
 const options=SCOUT_TRAINING_MINUTES.map(minutes=>{
  try{
   const receipt=reserveScout({state:input.state,authority:input.authority,receipts:input.receipts,routeId:route.id,kind:input.kind,companionIds:input.companionIds,requestId:'ui_preview_'+String(minutes),now:input.now,trainingMinutes:minutes as ScoutTrainingMinutes});
   return {minutes,xp:receipt.xp,durationMs:receipt.endsAt-receipt.startedAt,available:true as const};
  }catch(error){return {minutes,xp:0,durationMs:minutes*60000,available:false as const,reason:error instanceof Error?error.message:'unavailable'};}
 });
 return {route:{id:route.id,name:route.name},kind:input.kind,options,defaultMinutes:input.kind==='practice'?5:120};
}
