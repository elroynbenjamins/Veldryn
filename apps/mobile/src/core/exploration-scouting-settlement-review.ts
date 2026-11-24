/** In-memory reference transaction. No live RPC, database or real economy mutation.
 * All inputs except command selection are trusted, server-loaded fixture records. */
import {reserveScout,scoutClaimPreview,type ScoutAuthority,type ScoutReceipt,type ScoutState,type ScoutKind,type ScoutCampAssignment,type ScoutTrainingMinutes} from './exploration-scouting-review';
import {scoutingMissionQuote} from './exploration-scouting-missions-review';
import {scoutingProvisionQuote} from './exploration-scouting-economy-review';
import {creditAccountExploration,projectAccountExploration,type AccountExploration} from './exploration-account-review';
import type {CompanionStaminaFoodSelection} from './companion-stamina-selection';
import {freezeScoutCompanionReward,settleScoutRareReward,applyScoutCompanionProgress,type FrozenScoutReward,type ScoutBondstoneWeek} from './exploration-scouting-companion-reward-review';
import {companionMission} from '../../../../backend/src/server/companions/content';
import {rolloverCompanionAssignmentStatuses} from '../../../../backend/src/server/companions/assignments';
import {awardCompanionMasteryXp,companionMasteryAward} from './companion-mastery';
import type {CompanionOverflowState,CompanionAssignmentReward} from '../../../../backend/src/server/companions/domain';
import type {GameState} from './types';
type Quote=Extract<ReturnType<typeof scoutingMissionQuote>,{ok:true}>;
type Wallet={gold:number;materials:Record<string,number>};
type CampReceipt=ScoutCampAssignment&{requestId:string;quote:Quote;food:readonly CompanionStaminaFoodSelection[];earnExplorationXp:boolean;startedAt:number;frozen:FrozenScoutReward};
type Claim={requestId:string;characterId:string;xp:number;discoveryId:string|null;kind:'training'|'camp';companionReward?:CompanionAssignmentReward;grade?:FrozenScoutReward['grade']};
export type ScoutLedger={account:AccountExploration;characters:Record<string,ScoutState>;wallets:Record<string,Wallet>;authority:ScoutAuthority;pensLevel:number;training:ScoutReceipt[];camps:CampReceipt[];claims:Claim[];essence:number;companionXp:Record<string,number>;bondXp:Record<string,number>;bondstones?:number;bondstoneWeek?:ScoutBondstoneWeek;companionOverflow?:CompanionOverflowState;companionMasteryXp?:number;housingTiers?:GameState['account']['companionHousingTiers'];bondHallLevel?:number;companionUnlockProgress?:Record<string,number>};
const fail=(s:string):never=>{throw Error(s)};
const nonce=(id:string)=>/^[A-Za-z0-9_-]{8,128}$/.test(id);
const add=(a:number,b:number)=>{const n=a+b;if(!Number.isSafeInteger(n)||n<0)return fail('invalid_balance');return n;};
function owned(ledger:ScoutLedger,accountId:string,characterId:string){
 const state=ledger.characters[characterId];if(accountId!==ledger.account.accountId||state?.accountId!==accountId||state.characterId!==characterId)return fail('owner_mismatch');
 return projectAccountExploration(state,ledger.account);
}
const auth=(l:ScoutLedger):ScoutAuthority=>({...l.authority,campAssignments:l.camps});
export function dispatchTrainingReview(l:ScoutLedger,accountId:string,characterId:string,request:{requestId:string;routeId:string;kind:ScoutKind;companionIds:readonly string[];trainingMinutes?:ScoutTrainingMinutes},now:number){
 const state=owned(l,accountId,characterId);
 if(l.camps.some(c=>c.requestId===request.requestId))return fail('nonce_conflict');
 const r=reserveScout({state,authority:auth(l),receipts:l.training,...request,now});
 if(l.training.some(t=>t.requestId===r.requestId))return {ledger:l,receipt:r};
 return {ledger:{...l,training:[...l.training,r]},receipt:r};
}
/** Public preview deliberately excludes frozen outcome and random eligibility. */
function publicCampReceipt(r:CampReceipt){const {frozen:_private,...publicFields}=r;return structuredClone(publicFields);}
export function dispatchCampReview(l:ScoutLedger,accountId:string,characterId:string,request:{requestId:string;missionId:string;companionIds:string[];earnExplorationXp:boolean;food:CompanionStaminaFoodSelection[]},now:number,serverSeed:()=>string){
 const state=owned(l,accountId,characterId);
 if(!nonce(request.requestId)||l.training.some(t=>t.requestId===request.requestId))return fail('nonce_conflict');
 const prior=l.camps.find(c=>c.requestId===request.requestId);
 if(prior){
  if(prior.characterId!==characterId||prior.missionId!==request.missionId||prior.earnExplorationXp!==request.earnExplorationXp||JSON.stringify(prior.companionIds)!==JSON.stringify(request.companionIds)||JSON.stringify(prior.food)!==JSON.stringify(request.food))return fail('nonce_conflict');
  return {ledger:l,receipt:publicCampReceipt(prior)};
 }
 const q=scoutingMissionQuote({state,authority:auth(l),receipts:l.training,missionId:request.missionId,companionIds:request.companionIds,pensLevel:l.pensLevel,now,earnExplorationXp:request.earnExplorationXp});
 if(!q.ok)return fail(q.reason);
 const wallet=l.wallets[characterId];if(!wallet)return fail('wallet_missing');
 const cost=scoutingProvisionQuote(q,wallet,request.food);if(!cost.ok)return fail(cost.reason);
 const materials={...wallet.materials};
 for(const [id,qty] of Object.entries(cost.materialCosts))materials[id]=add(materials[id]??0,-qty);
 const frozen=freezeScoutCompanionReward({missionId:request.missionId,assignmentId:request.requestId,companionIds:request.companionIds,owned:l.authority.owned,startedAt:now,endsAt:now+q.durationMs,serverSeed:serverSeed()});
 const r:CampReceipt={startedAt:now,frozen,accountId,characterId,requestId:request.requestId,assignmentId:request.requestId,missionId:request.missionId,companionIds:[...request.companionIds],endsAt:now+q.durationMs,status:'active',explorationXp:q.explorationXp,quote:structuredClone(q),food:structuredClone(request.food),earnExplorationXp:request.earnExplorationXp};
 return {ledger:{...l,wallets:{...l.wallets,[characterId]:{gold:add(wallet.gold,-cost.goldCost),materials}},camps:[...l.camps,r]},receipt:publicCampReceipt(r)};
}
export function claimScoutingReview(l:ScoutLedger,accountId:string,characterId:string,requestId:string,now:number){
 const state=owned(l,accountId,characterId);
 const prior=l.claims.find(c=>c.requestId===requestId);
 if(prior){if(prior.characterId!==characterId)return fail('owner_mismatch');return {ledger:l,claim:prior};}
 const training=l.training.find(r=>r.requestId===requestId);
 const camp=l.camps.find(r=>r.requestId===requestId);
 if(!Number.isSafeInteger(now)||now<0)return fail('invalid_time');
 if(training){
  const result=scoutClaimPreview(training,state,now);
  const credit=creditAccountExploration(l.account,result.explorationXp,result.newDiscovery??undefined);
  const claim:Claim={requestId,characterId,xp:credit.awarded,discoveryId:result.newDiscovery,kind:'training'};
  return {ledger:{...l,account:credit.account,characters:{...l.characters,[characterId]:{...state,discoveredRouteIds:result.discoveredRouteIds}},training:l.training.map(r=>r===training?result.receipt:r),claims:[...l.claims,claim]},claim};
 }
 if(!camp||camp.characterId!==characterId||camp.accountId!==accountId)return fail('owner_mismatch');
 if(camp.status!=='active'||now<camp.endsAt)return fail('not_ready');
 const credit=creditAccountExploration(l.account,camp.explorationXp),wallet=l.wallets[characterId];
 const settled=settleScoutRareReward(camp.frozen,l.bondstoneWeek,now),q=settled.reward;
 if(!wallet)return fail('wallet_missing');
 const materials={...wallet.materials},companionXp={...l.companionXp},bondXp={...l.bondXp};
 for(const [id,qty] of Object.entries(q.materials))materials[id]=add(materials[id]??0,qty);
 for(const id of camp.companionIds){companionXp[id]=add(companionXp[id]??0,q.companionXpById?.[id]??0);bondXp[id]=add(bondXp[id]??0,q.bondXpById?.[id]??0);}
 const progressed=applyScoutCompanionProgress({owned:l.authority.owned,reward:q,companionIds:camp.companionIds,essence:l.essence,overflow:l.companionOverflow,masteryXp:l.companionMasteryXp,housingTiers:l.housingTiers,bondHallLevel:l.bondHallLevel,now});
 const mastery=awardCompanionMasteryXp({companionMasteryXp:l.companionMasteryXp},companionMasteryAward('expedition',{hours:(camp.endsAt-camp.startedAt)/3600000,grade:camp.frozen.grade}));
 const unlockProgress={...l.companionUnlockProgress},origin=companionMission(camp.missionId)?.originId;
 if(origin){const key='COMPANION_MISSIONS:'+origin;unlockProgress[key]=add(unlockProgress[key]??0,1);if(camp.frozen.grade==='S'){const gradeKey='COMPANION_S_GRADE:'+origin;unlockProgress[gradeKey]=add(unlockProgress[gradeKey]??0,1);}}
 const claim:Claim={requestId,characterId,xp:credit.awarded,discoveryId:null,kind:'camp',companionReward:structuredClone(q),grade:camp.frozen.grade};
 return {ledger:{...l,account:credit.account,wallets:{...l.wallets,[characterId]:{gold:add(wallet.gold,q.gold),materials}},essence:progressed.essence,authority:{...l.authority,owned:progressed.owned},companionOverflow:progressed.overflow,companionMasteryXp:mastery.companionMasteryXp,companionUnlockProgress:unlockProgress,bondstones:add(l.bondstones??0,q.bondstones),bondstoneWeek:settled.weekly,companionXp,bondXp,camps:l.camps.map(r=>r===camp?{...r,status:'claimed' as const}:r),claims:[...l.claims,claim]},claim};
}

export function scoutingReportsReview(l:ScoutLedger,accountId:string,characterId:string,now:number){
 owned(l,accountId,characterId);
 const training=l.training.filter(r=>r.accountId===accountId).map(r=>({
  id:r.requestId,source:'training' as const,characterId:r.characterId,otherCharacter:r.characterId!==characterId,status:r.status,
  claimable:r.status==='active'&&r.characterId===characterId&&now>=r.endsAt,remainingMs:r.status==='active'?Math.max(0,r.endsAt-now):0,
  routeId:r.routeId,kind:r.kind,explorationXp:r.xp,discovery:r.discovery,trainingMinutes:r.trainingMinutes,
 }));
 const camps=l.camps.filter(r=>r.accountId===accountId).map(r=>{
  const claim=l.claims.find(c=>c.requestId===r.requestId);
  return {id:r.requestId,source:'scouting' as const,characterId:r.characterId,otherCharacter:r.characterId!==characterId,status:r.status,
   claimable:r.status==='active'&&r.characterId===characterId&&now>=r.endsAt,remainingMs:r.status==='active'?Math.max(0,r.endsAt-now):0,
   missionId:r.missionId,companionIds:[...r.companionIds],explorationXp:r.explorationXp,
   preview:r.status==='claimed'?undefined:{gold:r.quote.preview.gold,essence:r.quote.preview.essence,companionXp:r.quote.preview.companionXpPerScout,bondXp:r.quote.preview.bondXpPerScout,bondstoneEligible:r.quote.preview.bondstoneEligible},
   final:r.status==='claimed'&&claim?.companionReward?{grade:claim.grade,reward:structuredClone(claim.companionReward)}:undefined};
 });
 const legacy=rolloverCompanionAssignmentStatuses(l.authority.legacyAssignments,now).map(r=>({
  id:r.assignmentId,source:'legacy' as const,characterId:characterId,otherCharacter:false,status:r.status,
  claimable:r.status==='completed',remainingMs:r.status==='active'?Math.max(0,Date.parse(r.endsAt)-now):0,missionId:r.missionId,
  companionIds:[...r.companionIds],final:r.status==='claimed'&&r.rewardSnapshot?{grade:r.performanceGrade,reward:structuredClone(r.rewardSnapshot)}:undefined,
 }));
 return {training,camps,legacy,all:[...training,...camps,...legacy]};
}
