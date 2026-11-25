/** Hidden adapter around the existing companion reward engine.
 * Trusted secret seed and owned roster are supplied at reservation, never by a player.
 * No live dispatch, storage or reward grants. */
import {claimCompanionAssignment} from '../../../../backend/src/server/companions/assignments';
import {companionMission} from '../../../../backend/src/server/companions/content';
import {companionTrialWeekKey} from '../../../../backend/src/server/companions/trial-season';
import {awardCompanionXpServer,awardCompanionBondXpServer} from '../../../../backend/src/server/companions/progression-v2';
import type {CompanionAssignment,CompanionAssignmentReward,OwnedCompanionSnapshot,CompanionOverflowState} from '../../../../backend/src/server/companions/domain';
import {companionMasteryCompanionXp} from './companion-mastery';
import {companionHousingTier,companionHousingTrainingXpMultiplier} from './companion-housing';
import type {GameState} from './types';
import {executeCompanionActivity} from './companion-runtime';
export const SCOUT_COMPANION_REWARD_RELEASED=false as const;
export type FrozenScoutReward={missionId:string;missionVersion:number;companionIds:readonly string[];grade:'C'|'B'|'A'|'S';reward:CompanionAssignmentReward};
export function freezeScoutCompanionReward(input:{missionId:string;assignmentId:string;companionIds:readonly string[];owned:Record<string,OwnedCompanionSnapshot>;startedAt:number;endsAt:number;serverSeed:string}):FrozenScoutReward{
 const m=companionMission(input.missionId);
 if(!m||!input.serverSeed||input.serverSeed.length<32||!Number.isSafeInteger(input.startedAt)||!Number.isSafeInteger(input.endsAt)||input.endsAt<=input.startedAt||input.companionIds.length===0||new Set(input.companionIds).size!==input.companionIds.length||input.companionIds.some(id=>!input.owned[id]))throw Error('invalid_reward_reservation');
 const assignment:CompanionAssignment={assignmentId:input.assignmentId,missionId:m.id,missionVersion:m.missionVersion,companionIds:[...input.companionIds],startedAt:new Date(input.startedAt).toISOString(),endsAt:new Date(input.endsAt).toISOString(),seed:input.serverSeed,status:'completed'};
 // Evaluate grade, regional requirements, specialty multipliers and random
 // eligibility at reservation against a frozen roster. Do not expose the seed
 // or random results before completion; cap rare reward at actual claim week.
 const result=claimCompanionAssignment({assignment,owned:input.owned,serverNowMs:input.endsAt,bondstonesClaimedThisWeek:0});
 return {missionId:m.id,missionVersion:m.missionVersion,companionIds:[...input.companionIds],grade:result.assignment.performanceGrade!,reward:structuredClone(result.reward)};
}
export type ScoutBondstoneWeek={week:string;used:number};
export function settleScoutRareReward(frozen:FrozenScoutReward,previous:ScoutBondstoneWeek|undefined,now:number){
 const week=companionTrialWeekKey(now),used=previous?.week===week?Math.max(0,Math.floor(previous.used)):0;
 const amount=used>=1?0:Math.min(1,frozen.reward.bondstones);
 return {reward:{...structuredClone(frozen.reward),bondstones:amount},weekly:{week,used:used+amount}};
}
export function applyScoutCompanionProgress(input:{owned:Record<string,OwnedCompanionSnapshot>;reward:CompanionAssignmentReward;companionIds:readonly string[];essence:number;overflow?:CompanionOverflowState;masteryXp?:number;housingTiers?:GameState['account']['companionHousingTiers'];bondHallLevel?:number;now:number}){
 const owned={...input.owned};let essence=input.essence+input.reward.companionEssence,overflow=input.overflow;
 for(const id of input.companionIds){
  if(!owned[id])throw Error('companion_not_owned');
  const baseXp=input.reward.companionXpById?.[id]??0,baseBond=input.reward.bondXpById?.[id]??0;
  const xp=Math.round(companionMasteryCompanionXp(baseXp,input.masteryXp)*companionHousingTrainingXpMultiplier(companionHousingTier(id,input.housingTiers)));
  const bond=Math.round(baseBond*(1+Math.max(0,Math.min(3,input.bondHallLevel??0))*.05));
  const r=awardCompanionXpServer({progress:owned[id],amount:xp,companionEssence:essence,overflow,serverNowMs:input.now});
  owned[id]=awardCompanionBondXpServer(r.progress,bond);essence=r.companionEssence;overflow=r.overflow;
 }
 return {owned,essence,overflow};
}
/** Existing expeditions retain their original version, seed, times and reward
 * rules. Reuse the original claim path; no new Exploration XP or cost debit.
 * Caller must load authoritative account state and serialize its transaction. */
export function claimLegacyScoutingReport(input:GameState,assignmentId:string,now:number):GameState{
 if(!input.character||!assignmentId||!Number.isSafeInteger(now)||now<0)throw Error('invalid_legacy_claim');
 const a=input.account.companionAssignments?.find(x=>x.assignmentId===assignmentId);
 if(!a)throw Error('legacy_assignment_missing');
 if(a.status==='claimed')return input;
 if(a.status==='cancelled'||!Number.isFinite(Date.parse(a.endsAt))||now<Date.parse(a.endsAt))throw Error('legacy_assignment_not_ready');
 return executeCompanionActivity(input,'companion_assignment_claim',{id:assignmentId},now);
}
