/** Hidden mission catalogue adapter. No rewards are issued or persisted. */
import {COMPANION_MISSIONS,COMPANION_EXPEDITION_BOND_RATE,COMPANION_EXPEDITION_PEN_DURATION_REDUCTION} from '../../../../backend/src/server/companions/content';
import {validateCompanionMissionTeam,rolloverCompanionAssignmentStatuses,companionExpeditionPenCapacity} from '../../../../backend/src/server/companions/assignments';
import {SCOUT_ROUTES,scoutingAvailability,scoutingTeamBonus,type ScoutAuthority,type ScoutState,type ScoutReceipt} from './exploration-scouting-review';
import {companionExpeditionStaminaCost,COMPANION_STAMINA_HP_PER_POINT} from './companion-provisions';
import {explorationScoutingSpeedMultiplier} from '../content/exploration';
export const SCOUT_MISSION_REVIEW_RELEASED=false as const;
const missionLevel:Readonly<Record<string,number>>={
 MISSION_SCOUT_2H:5,MISSION_GREENFIELDS_FORAGE_2H:5,MISSION_APPRENTICE_3H:10,
 MISSION_SILVERBROOK_4H:10,MISSION_IRONWOOD_TRACK_4H:15,
 MISSION_ASTERFALL_SHRINE_8H:30,MISSION_OLD_FRIENDS_8H:30,
 MISSION_SUNSCAR_4H:20,MISSION_SUNSCAR_RELIC_6H:40,MISSION_SUNSCAR_RUINS_8H:50,
 MISSION_FROST_SCOUT_4H:30,MISSION_FROST_RESONANCE_6H:50,MISSION_FROST_8H:60,
 MISSION_PRESTIGE_VIGIL_12H:75
};
const routeByMission:Readonly<Record<string,string>>={
 MISSION_SCOUT_2H:'SCOUT_GREENFIELDS',MISSION_GREENFIELDS_FORAGE_2H:'SCOUT_GREENFIELDS',MISSION_APPRENTICE_3H:'SCOUT_GREENFIELDS',
 MISSION_SILVERBROOK_4H:'SCOUT_SILVERBROOK',MISSION_IRONWOOD_TRACK_4H:'SCOUT_IRONWOOD',
 MISSION_ASTERFALL_SHRINE_8H:'SCOUT_KINGS_ROAD',MISSION_OLD_FRIENDS_8H:'SCOUT_IRONWOOD',
 MISSION_SUNSCAR_4H:'SCOUT_SUNSCAR',MISSION_SUNSCAR_RELIC_6H:'SCOUT_SUNSCAR_MIRAGE',MISSION_SUNSCAR_RUINS_8H:'SCOUT_SUNSCAR_CROWN',
 MISSION_FROST_SCOUT_4H:'SCOUT_FROSTMARCH',MISSION_FROST_RESONANCE_6H:'SCOUT2_FROST_SHIVERLAKE',MISSION_FROST_8H:'SCOUT2_FROST_WYRMSPINE',
 MISSION_PRESTIGE_VIGIL_12H:'SCOUT_KINGS_ROAD'
};
export const SCOUT_OPTIONAL_MISSIONS=COMPANION_MISSIONS.filter(m=>Object.hasOwn(missionLevel,m.id)).map(m=>({
 missionId:m.id,routeId:'scout2:'+routeByMission[m.id],name:m.name,originId:m.originId,requiredExplorationLevel:missionLevel[m.id],durationMs:m.durationMs,minimumPenLevel:m.minimumPenLevel??1,base:m
}));
const fail=(reason:string)=>({ok:false as const,reason});
export function scoutingMissionQuote(input:{state:ScoutState;authority:ScoutAuthority;receipts:readonly ScoutReceipt[];missionId:string;companionIds:string[];pensLevel:number;now:number;earnExplorationXp?:boolean}){
 const {state,authority,receipts,companionIds,pensLevel,now}=input;
 if(!state.accountId||!state.characterId||!Number.isSafeInteger(now)||now<0||!Number.isInteger(pensLevel)||pensLevel<0||pensLevel>3)return fail('invalid_request');
 const m=SCOUT_OPTIONAL_MISSIONS.find(x=>x.missionId===input.missionId);
 if(!m)return fail('mission_unavailable');
 const route=SCOUT_ROUTES.find(r=>r.id===m.routeId);
 if(!route||!route.released||!state.discoveredRouteIds.includes(route.legacyId))return fail('discover_route_first');
 if(state.explorationLevel<m.requiredExplorationLevel||scoutingAvailability(state,route,'survey')!=='available')return fail('exploration_level');
 const legacy=rolloverCompanionAssignmentStatuses(authority.legacyAssignments,now);
 const active=receipts.filter(r=>r.accountId===state.accountId&&r.status==='active');
 const camps=(authority.campAssignments??[]).filter(a=>a.accountId===state.accountId&&a.status==='active');
 const xpEnabled=input.earnExplorationXp!==false;
 if(xpEnabled&&(active.length||camps.some(a=>a.explorationXp>0)))return fail('scout_slot_busy');
 if(legacy.filter(x=>x.status==='active').length+camps.filter(a=>a.endsAt>now).length>=companionExpeditionPenCapacity(pensLevel))return fail('pen_capacity');
 const reserved=new Set([...authority.unavailable,...active.filter(a=>a.endsAt>now).flatMap(a=>a.companionIds),...camps.filter(a=>a.endsAt>now).flatMap(a=>a.companionIds)]);
 const team=validateCompanionMissionTeam({missionId:m.missionId,companionIds,owned:authority.owned,assignments:legacy,equippedCompanionIds:authority.equipped,lockedTrialCompanionIds:authority.trialLocked,unavailableCompanionIds:reserved,expeditionPensLevel:pensLevel});
 if(!team.ok)return fail(team.reason);
 // Preserve the authored gold/material sink. Base rewards only: no additional bonus
 // roll, rarity item, gold multiplier or Bondstone issuance in this review.
 const hours=m.durationMs/3600000,bonus=scoutingTeamBonus(route,companionIds,authority);
 const durationMs=Math.max(60000,Math.round(m.durationMs*(1-(COMPANION_EXPEDITION_PEN_DURATION_REDUCTION[pensLevel]??0))/(explorationScoutingSpeedMultiplier(state.explorationLevel)*(1+bonus))));
 // Training rate: optional missions trade half of pure survey XP for other rewards.
 // No extra XP per companion; one active XP-bearing team per account.
 const explorationXp=xpEnabled?Math.floor(route.xp/route.seconds*hours*3600*.5):0;
 const stamina=companionExpeditionStaminaCost(hours);
 const base=m.base.baseRewards;
 return {ok:true as const,missionId:m.missionId,routeId:m.routeId,durationMs,explorationXp,grade:team.grade,stamina,healingHpRequired:stamina*COMPANION_STAMINA_HP_PER_POINT,
  costs:{gold:m.base.costs.gold,materials:{...m.base.costs.materials}},preview:{
  gold:base.gold,essence:base.companionEssence,companionXpPerScout:base.companionXp,
  bondXpPerScout:Math.max(1,Math.round(base.bondXp*COMPANION_EXPEDITION_BOND_RATE)),materials:{...base.materials},
  bondstoneEligible:m.base.bondstoneEligible===true,bondstonesGranted:0 as const},rewardsGranted:false as const,releaseEnabled:SCOUT_MISSION_REVIEW_RELEASED};
}
